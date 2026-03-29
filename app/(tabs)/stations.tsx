import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppScreen,
  AppTextInput,
  EmptyState,
  LoadingState,
  OptionChip,
  StatusBadge,
  colors,
} from '@/components';
import { getStationBrands, getStationList } from '@/features/stations';
import type { StationCurrentType, StationListFilters, StationSortBy, StationStatus } from '@/types';
import type { StationListItem } from '@/features/stations';

const statusOptions: Array<{ label: string; value: StationStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: 'available' },
  { label: 'In Use', value: 'in_use' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Offline', value: 'offline' },
  { label: 'Retired', value: 'retired' },
];

const currentTypeOptions: Array<{ label: string; value: StationCurrentType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'AC', value: 'AC' },
  { label: 'DC', value: 'DC' },
];

const sortOptions: Array<{ label: string; value: StationSortBy }> = [
  { label: 'Name', value: 'name' },
  { label: 'Updated', value: 'updatedAt' },
  { label: 'Power', value: 'powerKw' },
];

const defaultFilters: StationListFilters = {
  searchText: '',
  status: 'all',
  brand: 'all',
  currentType: 'all',
  sortBy: 'updatedAt',
};

const prettifyCustomFieldKey = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (char) => char.toUpperCase());

export default function StationListScreen(): React.JSX.Element {
  const router = useRouter();
  const [filters, setFilters] = useState<StationListFilters>(defaultFilters);
  const [brands, setBrands] = useState<string[]>([]);
  const [stations, setStations] = useState<StationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBrands = useCallback(async () => {
    const brandList = await getStationBrands();
    setBrands(brandList);
  }, []);

  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStationList(filters);
      setStations(result);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      void loadBrands();
      void loadStations();
    }, [loadBrands, loadStations]),
  );

  const brandOptions = useMemo(() => ['all', ...brands], [brands]);

  return (
    <AppScreen>
      <AppCard>
        <AppTextInput
          label="Search"
          value={filters.searchText}
          onChangeText={(value) => setFilters((prev) => ({ ...prev, searchText: value }))}
          placeholder="Name, code, or serial number"
          autoCapitalize="none"
        />

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {statusOptions.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={filters.status === option.value}
                onPress={() => setFilters((prev) => ({ ...prev, status: option.value }))}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {brandOptions.map((brand) => (
              <OptionChip
                key={brand}
                label={brand === 'all' ? 'All' : brand}
                selected={filters.brand === brand}
                onPress={() => setFilters((prev) => ({ ...prev, brand }))}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Current Type</Text>
          <View style={styles.inlineRow}>
            {currentTypeOptions.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={filters.currentType === option.value}
                onPress={() => setFilters((prev) => ({ ...prev, currentType: option.value }))}
              />
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Sort</Text>
          <View style={styles.inlineRow}>
            {sortOptions.map((option) => (
              <OptionChip
                key={option.value}
                label={option.label}
                selected={filters.sortBy === option.value}
                onPress={() => setFilters((prev) => ({ ...prev, sortBy: option.value }))}
              />
            ))}
          </View>
        </View>
      </AppCard>

      <AppButton label="Add Station" onPress={() => router.push('/stations/edit')} />

      {loading ? (
        <LoadingState label="Loading stations..." />
      ) : stations.length === 0 ? (
        <EmptyState
          title="No stations found"
          description="Try adjusting search text or filters to find matching records."
          actionLabel="Reset Filters"
          onActionPress={() => setFilters(defaultFilters)}
        />
      ) : (
        stations.map((station) => (
          <Pressable
            key={station.id}
            style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/stations/[id]', params: { id: station.id } })}
          >
            <View style={styles.listHeader}>
              <View style={styles.listMain}>
                <Text style={styles.stationName}>{station.name}</Text>
                <Text style={styles.stationMeta}>
                  {station.code} • {station.brand} • {station.model}
                </Text>
                <Text style={styles.stationMeta}>
                  Serial: {station.serialNumber} • {station.powerKw} kW • {station.currentType}
                </Text>
                {Object.entries(station.visibleCustomFields).map(([key, value]) => (
                  <Text key={key} style={styles.customFieldPreview}>
                    {prettifyCustomFieldKey(key)}: {value}
                  </Text>
                ))}
              </View>
              <StatusBadge status={station.status} />
            </View>
          </Pressable>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipRow: {
    gap: 8,
    paddingRight: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  listMain: {
    flex: 1,
    gap: 4,
  },
  stationName: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
  },
  stationMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  customFieldPreview: {
    color: colors.text,
    fontSize: 12,
  },
});
