import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard, AppScreen, colors } from '@/components';
import { settingsMenuItems } from '@/features/settings/menu';

export default function SettingsScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <AppScreen>
      {settingsMenuItems.map((item) => (
        <Pressable
          key={item.label}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          onPress={() => {
            if (item.route) {
              router.push(item.route as never);
            }
          }}
          disabled={!item.route}
        >
          <AppCard>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.label}</Text>
              {item.isComingSoon ? <Text style={styles.comingSoon}>Coming Soon</Text> : null}
            </View>
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  itemDescription: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  comingSoon: {
    fontSize: 11,
    color: colors.mutedText,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontWeight: '600',
  },
});
