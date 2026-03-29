import type { SQLiteDatabase } from 'expo-sqlite';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      qrCode TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serialNumber TEXT NOT NULL UNIQUE,
      powerKw REAL NOT NULL,
      currentType TEXT NOT NULL CHECK(currentType IN ('AC', 'DC')),
      socketType TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      lastTestDate TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS custom_field_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      optionsJson TEXT,
      isRequired INTEGER NOT NULL DEFAULT 0,
      isFilterable INTEGER NOT NULL DEFAULT 0,
      isVisibleInList INTEGER NOT NULL DEFAULT 0,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1
  );`,
  `CREATE TABLE IF NOT EXISTS station_custom_field_values (
      id TEXT PRIMARY KEY NOT NULL,
      stationId TEXT NOT NULL,
      fieldId TEXT NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY (stationId) REFERENCES stations(id) ON DELETE CASCADE,
      FOREIGN KEY (fieldId) REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
      UNIQUE(stationId, fieldId)
  );`,
  'CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);',
  'CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);',
  'CREATE INDEX IF NOT EXISTS idx_stations_brand ON stations(brand);',
  'CREATE INDEX IF NOT EXISTS idx_stations_current_type ON stations(currentType);',
  'CREATE INDEX IF NOT EXISTS idx_station_custom_station ON station_custom_field_values(stationId);',
  'CREATE INDEX IF NOT EXISTS idx_station_custom_field ON station_custom_field_values(fieldId);',
];

export const applySchema = async (db: SQLiteDatabase): Promise<void> => {
  await db.execAsync('PRAGMA foreign_keys = ON;');

  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }
};
