import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard, AppScreen, SectionHeader, colors } from '@/components';
import { settingsMenuItems } from '@/features/settings/menu';

export default function SettingsScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <AppScreen>
      <SectionHeader
        title="Settings"
        subtitle="Configure flexible station metadata and future admin modules"
      />

      {settingsMenuItems.map((item) => (
        <Pressable
          key={item.label}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          onPress={() => router.push(item.route as never)}
        >
          <AppCard>
            <Text style={styles.itemTitle}>{item.label}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </AppCard>
        </Pressable>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  itemDescription: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
});
