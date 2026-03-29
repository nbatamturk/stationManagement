import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, AppCard, AppScreen, AppTextInput, SectionHeader, colors } from '@/components';
import { getStationByQrCode } from '@/features/stations';

export default function QrScanPlaceholderScreen(): React.JSX.Element {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (): Promise<void> => {
    setLoading(true);
    setMessage('');

    try {
      const station = await getStationByQrCode(qrCode);

      if (!station) {
        setMessage('No station matched this QR code.');
        return;
      }

      router.push({ pathname: '/stations/[id]', params: { id: station.id } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <SectionHeader
        title="QR Scan"
        subtitle="Camera scanning comes in the next phase. Manual QR lookup is active now."
      />

      <AppCard>
        <Text style={styles.helperText}>
          Enter or paste the QR value to simulate scanning and open station details.
        </Text>

        <AppTextInput
          label="QR Code"
          value={qrCode}
          onChangeText={setQrCode}
          placeholder="Example: QR-ANK-FAST-01"
          autoCapitalize="none"
        />

        <View style={styles.actions}>
          <AppButton
            label={loading ? 'Searching...' : 'Open Station'}
            onPress={() => {
              void handleLookup();
            }}
            disabled={loading || !qrCode.trim()}
          />
          <AppButton
            label="Use Sample QR"
            variant="secondary"
            onPress={() => setQrCode('QR-ANK-FAST-01')}
          />
        </View>

        {message ? <Text style={styles.feedback}>{message}</Text> : null}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 19,
  },
  actions: {
    gap: 10,
  },
  feedback: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
