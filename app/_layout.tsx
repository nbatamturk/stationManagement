import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout(): React.JSX.Element {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleStyle: {
            fontSize: 16,
            fontWeight: '700',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stations/[id]" options={{ title: 'Station Detail' }} />
        <Stack.Screen name="stations/edit" options={{ title: 'Add / Edit Station' }} />
        <Stack.Screen name="settings/custom-fields" options={{ title: 'Custom Fields' }} />
      </Stack>
    </>
  );
}
