import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/components/theme';

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label = 'Loading...' }: LoadingStateProps): React.JSX.Element => {
  return (
    <View style={styles.wrapper}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: colors.mutedText,
  },
});
