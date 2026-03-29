import type { CustomFieldType } from './custom-fields';

export type StationCurrentType = 'AC' | 'DC';

export type StationStatus =
  | 'available'
  | 'in_use'
  | 'maintenance'
  | 'offline'
  | 'retired';

export type StationSortBy = 'name' | 'updatedAt' | 'powerKw';

export interface StationListCustomFieldFilter {
  fieldId: string;
  type: CustomFieldType;
  value: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  qrCode: string;
  brand: string;
  model: string;
  serialNumber: string;
  powerKw: number;
  currentType: StationCurrentType;
  socketType: string;
  location: string;
  status: StationStatus;
  lastTestDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StationFormValues {
  name: string;
  code: string;
  qrCode: string;
  brand: string;
  model: string;
  serialNumber: string;
  powerKw: string;
  currentType: StationCurrentType;
  socketType: string;
  location: string;
  status: StationStatus;
  lastTestDate: string;
  notes: string;
}

export interface StationListFilters {
  searchText: string;
  status: StationStatus | 'all';
  brand: string | 'all';
  currentType: StationCurrentType | 'all';
  sortBy: StationSortBy;
  customFieldFilters: StationListCustomFieldFilter[];
}

export interface StationDraft extends Omit<Station, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}
