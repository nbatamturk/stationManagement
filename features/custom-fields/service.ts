import { withDatabase } from '@/database';
import type {
  CustomFieldDefinition,
  CustomFieldDefinitionDraft,
  StationCustomValuesByFieldId,
} from '@/types';
import { normalizeCustomFieldKey } from '@/utils/custom-field';
import { createId } from '@/utils/id';

type CustomFieldDefinitionRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  optionsJson: string | null;
  isRequired: number;
  isFilterable: number;
  isVisibleInList: number;
  sortOrder: number;
  isActive: number;
};

type StationCustomValueRow = {
  fieldId: string;
  value: string;
};

const toBool = (value: number): boolean => value === 1;
const toInt = (value: boolean): number => (value ? 1 : 0);

const mapCustomFieldDefinition = (row: CustomFieldDefinitionRow): CustomFieldDefinition => ({
  id: row.id,
  key: row.key,
  label: row.label,
  type: row.type as CustomFieldDefinition['type'],
  optionsJson: row.optionsJson,
  isRequired: toBool(row.isRequired),
  isFilterable: toBool(row.isFilterable),
  isVisibleInList: toBool(row.isVisibleInList),
  sortOrder: row.sortOrder,
  isActive: toBool(row.isActive),
});

export const getCustomFieldDefinitions = async (
  activeOnly = false,
): Promise<CustomFieldDefinition[]> => {
  return withDatabase(async (db) => {
    const query = activeOnly
      ? `SELECT * FROM custom_field_definitions
         WHERE isActive = 1
         ORDER BY sortOrder ASC, label COLLATE NOCASE ASC;`
      : `SELECT * FROM custom_field_definitions
         ORDER BY sortOrder ASC, label COLLATE NOCASE ASC;`;

    const rows = await db.getAllAsync<CustomFieldDefinitionRow>(query);
    return rows.map(mapCustomFieldDefinition);
  });
};

export const getStationCustomValues = async (
  stationId: string,
): Promise<StationCustomValuesByFieldId> => {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<StationCustomValueRow>(
      `SELECT fieldId, value
       FROM station_custom_field_values
       WHERE stationId = ?;`,
      stationId,
    );

    return rows.reduce<StationCustomValuesByFieldId>((accumulator, row) => {
      accumulator[row.fieldId] = row.value;
      return accumulator;
    }, {});
  });
};

export const upsertCustomFieldDefinition = async (
  draft: CustomFieldDefinitionDraft,
  existingId?: string,
): Promise<string> => {
  const id = existingId ?? createId('cfd');
  const key = normalizeCustomFieldKey(draft.key || draft.label);

  if (!key) {
    throw new Error('Field key cannot be empty.');
  }

  await withDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO custom_field_definitions
        (id, key, label, type, optionsJson, isRequired, isFilterable, isVisibleInList, sortOrder, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        key = excluded.key,
        label = excluded.label,
        type = excluded.type,
        optionsJson = excluded.optionsJson,
        isRequired = excluded.isRequired,
        isFilterable = excluded.isFilterable,
        isVisibleInList = excluded.isVisibleInList,
        sortOrder = excluded.sortOrder,
        isActive = excluded.isActive;`,
      id,
      key,
      draft.label.trim(),
      draft.type,
      draft.optionsJson.trim() ? draft.optionsJson.trim() : null,
      toInt(draft.isRequired),
      toInt(draft.isFilterable),
      toInt(draft.isVisibleInList),
      draft.sortOrder,
      toInt(draft.isActive),
    );
  });

  return id;
};

export const setCustomFieldActive = async (
  fieldId: string,
  isActive: boolean,
): Promise<void> => {
  await withDatabase(async (db) => {
    await db.runAsync(
      'UPDATE custom_field_definitions SET isActive = ? WHERE id = ?;',
      toInt(isActive),
      fieldId,
    );
  });
};

export const saveStationCustomValues = async (
  stationId: string,
  values: StationCustomValuesByFieldId,
): Promise<void> => {
  await withDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      for (const [fieldId, rawValue] of Object.entries(values)) {
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
};
