import { withDatabase } from '@/database';
import type { Station, StationCustomValuesByFieldId, StationDraft, StationListFilters } from '@/types';
import { createId } from '@/utils/id';

import type { StationDetails, StationListItem } from './types';

type StationRow = {
  id: string;
  name: string;
  code: string;
  qrCode: string;
  brand: string;
  model: string;
  serialNumber: string;
  powerKw: number;
  currentType: Station['currentType'];
  socketType: string;
  location: string;
  status: Station['status'];
  lastTestDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type CustomFieldValueRow = {
  fieldId: string;
  value: string;
};

type VisibleCustomFieldRow = {
  stationId: string;
  fieldKey: string;
  value: string;
};

type StatusCountRow = {
  status: Station['status'];
  count: number;
};

type ExistingStationIdentityRow = {
  id: string;
};

const mapStationRow = (row: StationRow): Station => ({
  id: row.id,
  name: row.name,
  code: row.code,
  qrCode: row.qrCode,
  brand: row.brand,
  model: row.model,
  serialNumber: row.serialNumber,
  powerKw: Number(row.powerKw),
  currentType: row.currentType,
  socketType: row.socketType,
  location: row.location,
  status: row.status,
  lastTestDate: row.lastTestDate,
  notes: row.notes,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const isValidDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
};

const addCustomFieldFilterClause = (
  whereClauses: string[],
  params: Array<string | number>,
  filter: StationListFilters['customFieldFilters'][number],
): void => {
  const value = filter.value.trim();

  if (!value) {
    return;
  }

  const clausePrefix = `EXISTS (
      SELECT 1
      FROM station_custom_field_values v
      INNER JOIN custom_field_definitions d ON d.id = v.fieldId
      WHERE v.stationId = stations.id
        AND v.fieldId = ?
        AND d.type = ?
        AND d.isFilterable = 1
        AND d.isActive = 1
        AND `;

  if (filter.type === 'text') {
    whereClauses.push(`${clausePrefix}v.value LIKE ? COLLATE NOCASE)`);
    params.push(filter.fieldId, filter.type, `%${value}%`);
    return;
  }

  if (filter.type === 'number') {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return;
    }

    whereClauses.push(`${clausePrefix}CAST(v.value AS REAL) = ?)`);
    params.push(filter.fieldId, filter.type, numericValue);
    return;
  }

  if (filter.type === 'boolean') {
    if (value !== 'true' && value !== 'false') {
      return;
    }

    whereClauses.push(`${clausePrefix}v.value = ?)`);
    params.push(filter.fieldId, filter.type, value);
    return;
  }

  if (filter.type === 'date') {
    if (!isValidDateOnly(value)) {
      return;
    }

    whereClauses.push(`${clausePrefix}v.value = ?)`);
    params.push(filter.fieldId, filter.type, value);
    return;
  }

  whereClauses.push(`${clausePrefix}v.value = ? COLLATE NOCASE)`);
  params.push(filter.fieldId, filter.type, value);
};

const buildStationListQuery = (
  filters: StationListFilters,
): { query: string; params: Array<string | number> } => {
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  const searchText = filters.searchText.trim();
  if (searchText) {
    whereClauses.push('(name LIKE ? OR code LIKE ? OR serialNumber LIKE ?)');
    const likeValue = `%${searchText}%`;
    params.push(likeValue, likeValue, likeValue);
  }

  if (filters.status !== 'all') {
    whereClauses.push('status = ?');
    params.push(filters.status);
  }

  if (filters.brand !== 'all') {
    whereClauses.push('brand = ?');
    params.push(filters.brand);
  }

  if (filters.currentType !== 'all') {
    whereClauses.push('currentType = ?');
    params.push(filters.currentType);
  }

  for (const customFilter of filters.customFieldFilters) {
    addCustomFieldFilterClause(whereClauses, params, customFilter);
  }

  const orderByClause: Record<StationListFilters['sortBy'], string> = {
    name: 'name COLLATE NOCASE ASC',
    updatedAt: 'updatedAt DESC',
    powerKw: 'powerKw DESC',
  };

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  return {
    query: `SELECT * FROM stations ${whereSql} ORDER BY ${orderByClause[filters.sortBy]};`,
    params,
  };
};

const getVisibleCustomValuesByStationId = async (
  stationIds: string[],
): Promise<Record<string, Record<string, string>>> => {
  if (stationIds.length === 0) {
    return {};
  }

  return withDatabase(async (db) => {
    const placeholders = stationIds.map(() => '?').join(', ');
    const rows = await db.getAllAsync<VisibleCustomFieldRow>(
      `SELECT v.stationId,
              d.key AS fieldKey,
              v.value
       FROM station_custom_field_values v
       INNER JOIN custom_field_definitions d ON d.id = v.fieldId
       WHERE v.stationId IN (${placeholders})
         AND d.isVisibleInList = 1
         AND d.isActive = 1
       ORDER BY d.sortOrder ASC;`,
      ...stationIds,
    );

    return rows.reduce<Record<string, Record<string, string>>>((accumulator, row) => {
      if (!accumulator[row.stationId]) {
        accumulator[row.stationId] = {};
      }

      accumulator[row.stationId][row.fieldKey] = row.value;
      return accumulator;
    }, {});
  });
};

export const getStationList = async (filters: StationListFilters): Promise<StationListItem[]> => {
  const { query, params } = buildStationListQuery(filters);

  const stations = await withDatabase(async (db) => {
    const rows = await db.getAllAsync<StationRow>(query, ...params);
    return rows.map(mapStationRow);
  });

  const visibleCustomFieldMap = await getVisibleCustomValuesByStationId(stations.map((item) => item.id));

  return stations.map((station) => ({
    ...station,
    visibleCustomFields: visibleCustomFieldMap[station.id] ?? {},
  }));
};

export const getStationBrands = async (): Promise<string[]> => {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<{ brand: string }>(
      `SELECT DISTINCT brand
       FROM stations
       ORDER BY brand COLLATE NOCASE ASC;`,
    );

    return rows.map((row) => row.brand);
  });
};

export const getStationById = async (stationId: string): Promise<StationDetails | null> => {
  return withDatabase(async (db) => {
    const stationRow = await db.getFirstAsync<StationRow>(
      'SELECT * FROM stations WHERE id = ? LIMIT 1;',
      stationId,
    );

    if (!stationRow) {
      return null;
    }

    const valueRows = await db.getAllAsync<CustomFieldValueRow>(
      `SELECT fieldId, value
       FROM station_custom_field_values
       WHERE stationId = ?;`,
      stationId,
    );

    const customValuesByFieldId = valueRows.reduce<StationCustomValuesByFieldId>((accumulator, row) => {
      accumulator[row.fieldId] = row.value;
      return accumulator;
    }, {});

    return {
      ...mapStationRow(stationRow),
      customValuesByFieldId,
    };
  });
};

export const getStationByQrCode = async (qrCode: string): Promise<Station | null> => {
  const sanitized = qrCode.trim();

  if (!sanitized) {
    return null;
  }

  return withDatabase(async (db) => {
    const stationRow = await db.getFirstAsync<StationRow>(
      'SELECT * FROM stations WHERE qrCode = ? LIMIT 1;',
      sanitized,
    );

    if (!stationRow) {
      return null;
    }

    return mapStationRow(stationRow);
  });
};

export const upsertStation = async (
  draft: StationDraft,
  customValues: StationCustomValuesByFieldId,
): Promise<string> => {
  if (!draft.name.trim()) {
    throw new Error('Station name is required.');
  }

  if (!draft.code.trim()) {
    throw new Error('Station code is required.');
  }

  if (!draft.serialNumber.trim()) {
    throw new Error('Serial number is required.');
  }

  if (!draft.qrCode.trim()) {
    throw new Error('QR code is required.');
  }

  const stationId = draft.id ?? createId('st');
  const nowIso = new Date().toISOString();

  await withDatabase(async (db) => {
    const currentId = draft.id ?? '';

    const duplicateCode = await db.getFirstAsync<ExistingStationIdentityRow>(
      `SELECT id
       FROM stations
       WHERE code = ?
         AND id != ?
       LIMIT 1;`,
      draft.code.trim(),
      currentId,
    );

    if (duplicateCode) {
      throw new Error('Station code already exists. Use a unique code.');
    }

    const duplicateQrCode = await db.getFirstAsync<ExistingStationIdentityRow>(
      `SELECT id
       FROM stations
       WHERE qrCode = ?
         AND id != ?
       LIMIT 1;`,
      draft.qrCode.trim(),
      currentId,
    );

    if (duplicateQrCode) {
      throw new Error('QR code already exists. Use a unique QR value.');
    }

    const duplicateSerialNumber = await db.getFirstAsync<ExistingStationIdentityRow>(
      `SELECT id
       FROM stations
       WHERE serialNumber = ?
         AND id != ?
       LIMIT 1;`,
      draft.serialNumber.trim(),
      currentId,
    );

    if (duplicateSerialNumber) {
      throw new Error('Serial number already exists. Use a unique serial number.');
    }

    const existing = draft.id
      ? await db.getFirstAsync<{ createdAt: string }>(
          'SELECT createdAt FROM stations WHERE id = ? LIMIT 1;',
          draft.id,
        )
      : null;

    const createdAt = existing?.createdAt ?? nowIso;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO stations
          (id, name, code, qrCode, brand, model, serialNumber, powerKw, currentType, socketType, location, status, lastTestDate, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          code = excluded.code,
          qrCode = excluded.qrCode,
          brand = excluded.brand,
          model = excluded.model,
          serialNumber = excluded.serialNumber,
          powerKw = excluded.powerKw,
          currentType = excluded.currentType,
          socketType = excluded.socketType,
          location = excluded.location,
          status = excluded.status,
          lastTestDate = excluded.lastTestDate,
          notes = excluded.notes,
          updatedAt = excluded.updatedAt;`,
        stationId,
        draft.name.trim(),
        draft.code.trim(),
        draft.qrCode.trim(),
        draft.brand.trim(),
        draft.model.trim(),
        draft.serialNumber.trim(),
        draft.powerKw,
        draft.currentType,
        draft.socketType.trim(),
        draft.location.trim(),
        draft.status,
        draft.lastTestDate,
        draft.notes,
        createdAt,
        nowIso,
      );

      for (const [fieldId, rawValue] of Object.entries(customValues)) {
        const value = rawValue?.trim() ?? '';

        if (!value) {
          await db.runAsync(
            `DELETE FROM station_custom_field_values
             WHERE stationId = ? AND fieldId = ?;`,
            stationId,
            fieldId,
          );
          continue;
        }

        await db.runAsync(
          `INSERT INTO station_custom_field_values (id, stationId, fieldId, value)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(stationId, fieldId) DO UPDATE SET value = excluded.value;`,
          createId('cfv'),
          stationId,
          fieldId,
          value,
        );
      }
    });
  });

  return stationId;
};

export const getDashboardMetrics = async (): Promise<{
  total: number;
  available: number;
  in_use: number;
  maintenance: number;
  offline: number;
  retired: number;
}> => {
  return withDatabase(async (db) => {
    const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM stations;');
    const statusRows = await db.getAllAsync<StatusCountRow>(
      `SELECT status, COUNT(*) AS count
       FROM stations
       GROUP BY status;`,
    );

    const defaults = {
      available: 0,
      in_use: 0,
      maintenance: 0,
      offline: 0,
      retired: 0,
    };

    for (const row of statusRows) {
      defaults[row.status] = row.count;
    }

    return {
      total: countRow?.count ?? 0,
      ...defaults,
    };
  });
};

export const getRecentlyUpdatedStations = async (limit = 5): Promise<Station[]> => {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<StationRow>(
      `SELECT * FROM stations
       ORDER BY updatedAt DESC
       LIMIT ?;`,
      limit,
    );

    return rows.map(mapStationRow);
  });
};

export const archiveStation = async (stationId: string): Promise<void> => {
  const nowIso = new Date().toISOString();

  await withDatabase(async (db) => {
    await db.runAsync(
      `UPDATE stations
       SET status = 'retired',
           updatedAt = ?
       WHERE id = ?;`,
      nowIso,
      stationId,
    );
  });
};

export const deleteStation = async (stationId: string): Promise<void> => {
  await withDatabase(async (db) => {
    await db.runAsync('DELETE FROM stations WHERE id = ?;', stationId);
  });
};
