import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppScreen,
  AppTextInput,
  EmptyState,
  LabeledSwitch,
  LoadingState,
  OptionChip,
  colors,
} from '@/components';
import { getCustomFieldDefinitions } from '@/features/custom-fields';
import { getStationById, upsertStation } from '@/features/stations';
import type { CustomFieldDefinition, Station, StationCustomValuesByFieldId, StationFormValues, StationStatus } from '@/types';
import { parseSelectOptions } from '@/utils/custom-field';

const statusOptions: Array<{ label: string; value: StationStatus }> = [
  { label: 'Available', value: 'available' },
  { label: 'In Use', value: 'in_use' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Offline', value: 'offline' },
  { label: 'Retired', value: 'retired' },
];

const createDefaultForm = (): StationFormValues => ({
  name: '',
  code: '',
  qrCode: '',
  brand: '',
  model: '',
  serialNumber: '',
  powerKw: '',
  currentType: 'AC',
  socketType: '',
  location: '',
  status: 'available',
  lastTestDate: '',
  notes: '',
});

const stationToForm = (station: Station): StationFormValues => ({
  name: station.name,
  code: station.code,
  qrCode: station.qrCode,
  brand: station.brand,
  model: station.model,
  serialNumber: station.serialNumber,
  powerKw: `${station.powerKw}`,
  currentType: station.currentType,
  socketType: station.socketType,
  location: station.location,
  status: station.status,
  lastTestDate: station.lastTestDate ?? '',
  notes: station.notes ?? '',
});

type FormErrors = Partial<Record<keyof StationFormValues | string, string>>;

const validateBaseFields = (form: StationFormValues): FormErrors => {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Name is required.';
  } else if (form.name.trim().length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  }

  if (!form.code.trim()) {
    errors.code = 'Code is required.';
  } else if (form.code.trim().length < 3) {
    errors.code = 'Code must be at least 3 characters.';
  }

  if (!form.qrCode.trim()) errors.qrCode = 'QR code is required.';
  if (!form.brand.trim()) errors.brand = 'Brand is required.';
  if (!form.model.trim()) errors.model = 'Model is required.';
  if (!form.serialNumber.trim()) errors.serialNumber = 'Serial number is required.';
  if (!form.socketType.trim()) errors.socketType = 'Socket type is required.';
  if (!form.location.trim()) errors.location = 'Location is required.';

  const power = Number(form.powerKw);
  if (!form.powerKw.trim()) {
    errors.powerKw = 'Power is required.';
  } else if (Number.isNaN(power) || power <= 0) {
    errors.powerKw = 'Power must be a positive number.';
  }

  if (form.lastTestDate.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.lastTestDate.trim())) {
      errors.lastTestDate = 'Use date format YYYY-MM-DD.';
    } else if (Number.isNaN(new Date(form.lastTestDate.trim()).getTime())) {
      errors.lastTestDate = 'Last test date is invalid.';
    }
  }

  return errors;
};

export default function AddEditStationScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ stationId?: string; qrCode?: string }>();

  const stationId = typeof params.stationId === 'string' ? params.stationId : undefined;
  const scannedQrCode = typeof params.qrCode === 'string' ? params.qrCode.trim() : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StationFormValues>(createDefaultForm());
  const [customDefinitions, setCustomDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [customValues, setCustomValues] = useState<StationCustomValuesByFieldId>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [stationNotFound, setStationNotFound] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const definitions = await getCustomFieldDefinitions(true);
      setCustomDefinitions(definitions);

      if (!stationId) {
        setForm((prev) => ({
          ...createDefaultForm(),
          qrCode: scannedQrCode || prev.qrCode,
        }));
        setCustomValues({});
        setStationNotFound(false);
        return;
      }

      const station = await getStationById(stationId);

      if (!station) {
        setForm(createDefaultForm());
        setCustomValues({});
        setStationNotFound(true);
        return;
      }

      setForm(stationToForm(station));
      setCustomValues(station.customValuesByFieldId);
      setStationNotFound(false);
    } finally {
      setLoading(false);
    }
  }, [scannedQrCode, stationId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const validateCustomFields = useCallback((): FormErrors => {
    const customErrors: FormErrors = {};

    for (const definition of customDefinitions) {
      const errorKey = `custom_${definition.id}`;
      const value = customValues[definition.id]?.trim() ?? '';

      if (!definition.isRequired) {
        if (!value) {
          continue;
        }
      } else if (!value) {
        customErrors[errorKey] = `${definition.label} is required.`;
        continue;
      }

      if (definition.type === 'number' && Number.isNaN(Number(value))) {
        customErrors[errorKey] = `${definition.label} must be a valid number.`;
        continue;
      }

      if (definition.type === 'date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          customErrors[errorKey] = `${definition.label} must use YYYY-MM-DD format.`;
          continue;
        }

        if (Number.isNaN(new Date(value).getTime())) {
          customErrors[errorKey] = `${definition.label} is not a valid date.`;
          continue;
        }
      }

      if (definition.type === 'boolean' && value !== 'true' && value !== 'false') {
        customErrors[errorKey] = `${definition.label} must be true or false.`;
        continue;
      }

      if (definition.type === 'select') {
        const options = parseSelectOptions(definition.optionsJson);
        if (options.length > 0 && !options.includes(value)) {
          customErrors[errorKey] = `${definition.label} must be one of the listed options.`;
        }
      }
    }

    return customErrors;
  }, [customDefinitions, customValues]);

  const onSubmit = async (): Promise<void> => {
    setSubmitMessage('');

    const baseErrors = validateBaseFields(form);
    const customErrors = validateCustomFields();
    const mergedErrors = { ...baseErrors, ...customErrors };

    setErrors(mergedErrors);

    if (Object.keys(mergedErrors).length > 0) {
      setSubmitMessage('Please fix the highlighted fields and try again.');
      return;
    }

    setSaving(true);

    try {
      const savedStationId = await upsertStation(
        {
          id: stationId,
          name: form.name,
          code: form.code,
          qrCode: form.qrCode,
          brand: form.brand,
          model: form.model,
          serialNumber: form.serialNumber,
          powerKw: Number(form.powerKw),
          currentType: form.currentType,
          socketType: form.socketType,
          location: form.location,
          status: form.status,
          lastTestDate: form.lastTestDate.trim() || null,
          notes: form.notes.trim() || null,
        },
        customValues,
      );

      router.replace({ pathname: '/stations/[id]', params: { id: savedStationId } });
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? `Could not save station: ${error.message}`
          : 'Could not save station. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <LoadingState label="Loading form..." />
      </AppScreen>
    );
  }

  if (stationNotFound) {
    return (
      <AppScreen>
        <EmptyState
          title="Station not found"
          description="This record may have been deleted."
          actionLabel="Create New Station"
          onActionPress={() => router.replace('/stations/edit')}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {!stationId && scannedQrCode ? (
        <AppCard>
          <Text style={styles.scanHintText}>
            QR code was prefilled from scanner. Review remaining fields and save.
          </Text>
        </AppCard>
      ) : null}

      <AppCard>
        <Text style={styles.cardTitle}>Base Fields</Text>

        <AppTextInput
          label="Name"
          required
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          error={errors.name}
        />
        <AppTextInput
          label="Code"
          required
          value={form.code}
          onChangeText={(value) => setForm((prev) => ({ ...prev, code: value }))}
          error={errors.code}
          autoCapitalize="characters"
        />
        <AppTextInput
          label="QR Code"
          required
          value={form.qrCode}
          onChangeText={(value) => setForm((prev) => ({ ...prev, qrCode: value }))}
          error={errors.qrCode}
          autoCapitalize="none"
        />
        <AppTextInput
          label="Brand"
          required
          value={form.brand}
          onChangeText={(value) => setForm((prev) => ({ ...prev, brand: value }))}
          error={errors.brand}
        />
        <AppTextInput
          label="Model"
          required
          value={form.model}
          onChangeText={(value) => setForm((prev) => ({ ...prev, model: value }))}
          error={errors.model}
        />
        <AppTextInput
          label="Serial Number"
          required
          value={form.serialNumber}
          onChangeText={(value) => setForm((prev) => ({ ...prev, serialNumber: value }))}
          error={errors.serialNumber}
          autoCapitalize="none"
        />
        <AppTextInput
          label="Power (kW)"
          required
          value={form.powerKw}
          onChangeText={(value) => setForm((prev) => ({ ...prev, powerKw: value }))}
          error={errors.powerKw}
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <View style={styles.segmentGroup}>
          <Text style={styles.segmentTitle}>Current Type</Text>
          <View style={styles.segmentRow}>
            <OptionChip
              label="AC"
              selected={form.currentType === 'AC'}
              onPress={() => setForm((prev) => ({ ...prev, currentType: 'AC' }))}
            />
            <OptionChip
              label="DC"
              selected={form.currentType === 'DC'}
              onPress={() => setForm((prev) => ({ ...prev, currentType: 'DC' }))}
            />
          </View>
        </View>

        <View style={styles.segmentGroup}>
          <Text style={styles.segmentTitle}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
            {statusOptions.map((statusOption) => (
              <OptionChip
                key={statusOption.value}
                label={statusOption.label}
                selected={form.status === statusOption.value}
                onPress={() => setForm((prev) => ({ ...prev, status: statusOption.value }))}
              />
            ))}
          </ScrollView>
        </View>

        <AppTextInput
          label="Socket Type"
          required
          value={form.socketType}
          onChangeText={(value) => setForm((prev) => ({ ...prev, socketType: value }))}
          error={errors.socketType}
        />
        <AppTextInput
          label="Location"
          required
          value={form.location}
          onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))}
          error={errors.location}
        />
        <AppTextInput
          label="Last Test Date"
          value={form.lastTestDate}
          onChangeText={(value) => setForm((prev) => ({ ...prev, lastTestDate: value }))}
          placeholder="YYYY-MM-DD"
          error={errors.lastTestDate}
          autoCapitalize="none"
        />
        <AppTextInput
          label="Notes"
          value={form.notes}
          onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))}
          multiline
        />
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Custom Fields</Text>
        {customDefinitions.map((definition) => {
          const key = `custom_${definition.id}`;
          const value = customValues[definition.id] ?? '';

          if (definition.type === 'boolean') {
            return (
              <View key={definition.id} style={styles.customFieldBlock}>
                <LabeledSwitch
                  label={`${definition.label}${definition.isRequired ? ' *' : ''}`}
                  value={value === 'true'}
                  onValueChange={(nextValue) =>
                    setCustomValues((prev) => ({
                      ...prev,
                      [definition.id]: nextValue ? 'true' : 'false',
                    }))
                  }
                />
                {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
              </View>
            );
          }

          if (definition.type === 'select') {
            const options = parseSelectOptions(definition.optionsJson);

            if (options.length > 0) {
              return (
                <View key={definition.id} style={styles.customFieldBlock}>
                  <Text style={styles.segmentTitle}>
                    {definition.label}
                    {definition.isRequired ? ' *' : ''}
                  </Text>
                  <View style={styles.segmentRow}>
                    {!definition.isRequired ? (
                      <OptionChip
                        key="clear-option"
                        label="Clear"
                        selected={!value}
                        onPress={() =>
                          setCustomValues((prev) => ({
                            ...prev,
                            [definition.id]: '',
                          }))
                        }
                      />
                    ) : null}
                    {options.map((option) => (
                      <OptionChip
                        key={option}
                        label={option}
                        selected={value === option}
                        onPress={() =>
                          setCustomValues((prev) => ({
                            ...prev,
                            [definition.id]: option,
                          }))
                        }
                      />
                    ))}
                  </View>
                  {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
                </View>
              );
            }
          }

          return (
            <AppTextInput
              key={definition.id}
              label={definition.label}
              required={definition.isRequired}
              value={value}
              onChangeText={(nextValue) =>
                setCustomValues((prev) => ({
                  ...prev,
                  [definition.id]: nextValue,
                }))
              }
              keyboardType={definition.type === 'number' ? 'numeric' : 'default'}
              placeholder={definition.type === 'date' ? 'YYYY-MM-DD' : undefined}
              error={errors[key]}
              autoCapitalize="none"
            />
          );
        })}
      </AppCard>

      {submitMessage ? <Text style={styles.errorText}>{submitMessage}</Text> : null}

      <AppButton
        label={saving ? 'Saving...' : stationId ? 'Update Station' : 'Create Station'}
        onPress={() => {
          void onSubmit();
        }}
        disabled={saving}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scanHintText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
  },
  segmentGroup: {
    gap: 8,
  },
  segmentTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingRight: 6,
  },
  customFieldBlock: {
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
