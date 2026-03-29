import { withDatabase } from '@/database';
import type { StationTestHistoryRecord, TestResult } from '@/types';
import { getNowIso } from '@/utils/date';
import { createId } from '@/utils/id';

type TestHistoryRow = {
  id: string;
  stationId: string;
  testType: string;
  result: TestResult;
  performedAt: string;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const mapRow = (row: TestHistoryRow): StationTestHistoryRecord => ({
  id: row.id,
  stationId: row.stationId,
  testType: row.testType,
  result: row.result,
  performedAt: row.performedAt,
  performedBy: row.performedBy,
  notes: row.notes,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const getStationTestHistory = async (stationId: string): Promise<StationTestHistoryRecord[]> => {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<TestHistoryRow>(
      `SELECT *
       FROM station_test_history
       WHERE stationId = ?
       ORDER BY performedAt DESC;`,
      stationId,
    );

    return rows.map(mapRow);
  });
};

export const addStationTestHistory = async (input: {
  stationId: string;
  testType: string;
  result: TestResult;
  performedAt?: string;
  performedBy?: string;
  notes?: string;
}): Promise<string> => {
  const id = createId('test');
  const now = getNowIso();

  await withDatabase(async (db) => {
    await db.runAsync(
      `INSERT INTO station_test_history
        (id, stationId, testType, result, performedAt, performedBy, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id,
      input.stationId,
      input.testType.trim(),
      input.result,
      input.performedAt ?? now,
      input.performedBy?.trim() || null,
      input.notes?.trim() || null,
      now,
      now,
    );
  });

  return id;
};
