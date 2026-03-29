import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, AppCard, AppScreen, EmptyState, LoadingState, SectionHeader, StatusBadge, colors } from '@/components';
import { getCustomFieldDefinitions } from '@/features/custom-fields';
import { getStationById } from '@/features/stations';
import type { CustomFieldDefinition } from '@/types';
import type { StationDetails } from '@/features/stations';
import { formatDateShort } from '@/utils/date';

const FieldRow = ({ label, value }: { label: string; value?: string | number | null }): React.JSX.Element => {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value ?? '-'}</Text>
    </View>
  );
};

export default function StationDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const stationId = typeof params.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<StationDetails | null>(null);
  const [customDefinitions, setCustomDefinitions] = useState<CustomFieldDefinition[]>([]);

  const loadStation = useCallback(async () => {
    if (!stationId) {
      setStation(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [stationResult, definitionResult] = await Promise.all([
        getStationById(stationId),
        getCustomFieldDefinitions(true),
      ]);

      setStation(stationResult);
      setCustomDefinitions(definitionResult);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useFocusEffect(
    useCallback(() => {
      void loadStation();
    }, [loadStation]),
  );

  const customFieldRows = useMemo(() => {
    if (!station) {
      return [];
    }

    return customDefinitions
      .map((definition) => ({
        id: definition.id,
        label: definition.label,
        value: station.customValuesByFieldId[definition.id],
      }))
      .filter((item) => item.value);
  }, [customDefinitions, station]);

  return (
    <AppScreen>
      <SectionHeader title="Station Detail" subtitle="Base information and dynamic custom properties" />

      {loading ? (
        <LoadingState label="Loading station details..." />
      ) : !station ? (
        <EmptyState title="Station not found" description="The selected station record could not be loaded." />
      ) : (
        <>
          <AppCard>
            <View style={styles.headerRow}>
              <View style={styles.headerMain}>
                <Text style={styles.stationName}>{station.name}</Text>
                <Text style={styles.stationMeta}>
                  {station.code} • {station.brand} • {station.model}
                </Text>
              </View>
              <StatusBadge status={station.status} />
            </View>

            <FieldRow label="QR Code" value={station.qrCode} />
            <FieldRow label="Serial Number" value={station.serialNumber} />
            <FieldRow label="Power" value={`${station.powerKw} kW`} />
            <FieldRow label="Current Type" value={station.currentType} />
            <FieldRow label="Socket Type" value={station.socketType} />
            <FieldRow label="Location" value={station.location} />
            <FieldRow label="Last Test Date" value={formatDateShort(station.lastTestDate)} />
            <FieldRow label="Updated" value={formatDateShort(station.updatedAt)} />
            <FieldRow label="Notes" value={station.notes} />
          </AppCard>

          <AppCard>
            <Text style={styles.cardTitle}>Custom Properties</Text>
            {customFieldRows.length === 0 ? (
              <Text style={styles.emptyCustomFields}>No custom field values defined for this station.</Text>
            ) : (
              customFieldRows.map((item) => (
                <FieldRow key={item.id} label={item.label} value={item.value} />
              ))
            )}
          </AppCard>

          <AppButton
            label="Edit Station"
            onPress={() => router.push({ pathname: '/stations/edit', params: { stationId: station.id } })}
          />
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  headerMain: {
    flex: 1,
    gap: 4,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  stationMeta: {
    fontSize: 13,
    color: colors.mutedText,
  },
  fieldRow: {
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 14,
    color: colors.text,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyCustomFields: {
    color: colors.mutedText,
    fontSize: 13,
  },
});
