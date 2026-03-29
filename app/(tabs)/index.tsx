import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppCard, AppScreen, LoadingState, SectionHeader, StatusBadge, colors } from '@/components';
import { getDashboardMetrics, getRecentlyUpdatedStations } from '@/features/stations';
import type { Station } from '@/types';
import { formatDateShort } from '@/utils/date';

type DashboardMetrics = {
  total: number;
  available: number;
  in_use: number;
  maintenance: number;
  offline: number;
  retired: number;
};

const defaultMetrics: DashboardMetrics = {
  total: 0,
  available: 0,
  in_use: 0,
  maintenance: 0,
  offline: 0,
  retired: 0,
};

export default function DashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [recentStations, setRecentStations] = useState<Station[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsResult, stationsResult] = await Promise.all([
        getDashboardMetrics(),
        getRecentlyUpdatedStations(5),
      ]);

      setMetrics(metricsResult);
      setRecentStations(stationsResult);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  return (
    <AppScreen>
      <SectionHeader
        title="Engineering Station Tracker"
        subtitle="Operational overview of charging stations used in validation testing"
      />

      <AppCard style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Station Status Overview</Text>
        {loading ? (
          <LoadingState label="Refreshing dashboard..." />
        ) : (
          <View style={styles.metricsGrid}>
            <MetricBox label="Total" value={metrics.total} />
            <MetricBox label="Available" value={metrics.available} />
            <MetricBox label="In Use" value={metrics.in_use} />
            <MetricBox label="Maintenance" value={metrics.maintenance} />
            <MetricBox label="Offline" value={metrics.offline} />
            <MetricBox label="Retired" value={metrics.retired} />
          </View>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Recently Updated</Text>
        {loading ? (
          <LoadingState label="Loading stations..." />
        ) : (
          recentStations.map((station) => (
            <Pressable
              key={station.id}
              onPress={() => router.push({ pathname: '/stations/[id]', params: { id: station.id } })}
              style={({ pressed }) => [styles.stationRow, pressed && styles.pressed]}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.stationName}>{station.name}</Text>
                <Text style={styles.stationMeta}>
                  {station.code} • {station.brand} • {station.powerKw} kW
                </Text>
                <Text style={styles.stationMeta}>Updated: {formatDateShort(station.updatedAt)}</Text>
              </View>
              <StatusBadge status={station.status} />
            </Pressable>
          ))
        )}
      </AppCard>

      <AppButton
        label="Add New Station"
        onPress={() => router.push('/stations/edit')}
        style={styles.addButton}
      />
    </AppScreen>
  );
}

const MetricBox = ({ label, value }: { label: string; value: number }): React.JSX.Element => {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsCard: {
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    width: '31%',
    minWidth: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FBFCFF',
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.mutedText,
  },
  stationRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pressed: {
    opacity: 0.82,
  },
  rowLeft: {
    flex: 1,
    gap: 4,
  },
  stationName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  stationMeta: {
    fontSize: 12,
    color: colors.mutedText,
  },
  addButton: {
    marginTop: 4,
  },
});
