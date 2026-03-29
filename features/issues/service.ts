import { withDatabase } from '@/database';
import type { IssueSeverity, IssueStatus, StationIssueRecord } from '@/types';
import { getNowIso } from '@/utils/date';
import { createId } from '@/utils/id';

type IssueRow = {
  id: string;
  stationId: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  reportedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const mapRow = (row: IssueRow): StationIssueRecord => ({
  id: row.id,
  stationId: row.stationId,
  title: row.title,
  description: row.description,
  severity: row.severity,
  status: row.status,
  reportedAt: row.reportedAt,
  resolvedAt: row.resolvedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const getStationIssueRecords = async (stationId: string): Promise<StationIssueRecord[]> => {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<IssueRow>(
      `SELECT *
       FROM station_issue_records
       WHERE stationId = ?
       ORDER BY reportedAt DESC;`,
      stationId,
    );

    return rows.map(mapRow);
  });
};

export const addStationIssueRecord = async (input: {
  stationId: string;
  title: string;
  description?: string;
  severity?: IssueSeverity;
  status?: IssueStatus;
}): Promise<string> => {
  const id = createId('issue');
  const now = getNowIso();

  await withDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO station_issue_records
        (id, stationId, title, description, severity, status, reportedAt, resolvedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      input.stationId,
      input.title.trim(),
      input.description?.trim() || null,
      input.severity ?? 'medium',
      input.status ?? 'open',
      now,
      null,
      now,
      now,
    );
  });

  return id;
};
