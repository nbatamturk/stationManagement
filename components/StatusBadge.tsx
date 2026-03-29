import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { STATION_STATUS_COLORS, STATION_STATUS_LABELS } from '@/utils/station';
import type { StationStatus } from '@/types';

type StatusBadgeProps = {
  status: StationStatus;
};

export const StatusBadge = ({ status }: StatusBadgeProps): React.JSX.Element => {
  return (
    <View style={[styles.badge, { backgroundColor: `${STATION_STATUS_COLORS[status]}1A` }]}>
      <View style={[styles.dot, { backgroundColor: STATION_STATUS_COLORS[status] }]} />
      <Text style={[styles.label, { color: STATION_STATUS_COLORS[status] }]}>
        {STATION_STATUS_LABELS[status]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
