import type { StationStatus } from '@/types';

export const STATION_STATUS_LABELS: Record<StationStatus, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  offline: 'Offline',
  retired: 'Retired',
};

export const STATION_STATUS_COLORS: Record<StationStatus, string> = {
  available: '#0F9D58',
  in_use: '#1976D2',
  maintenance: '#F9A825',
  offline: '#9E9E9E',
  retired: '#5F6368',
};

export const currentTypeOptions = ['AC', 'DC'] as const;
