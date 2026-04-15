import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

interface DateRangePickerProps {
  fromDate: Date;
  toDate: Date;
  onFromDateChange: (date: Date) => void;
  onToDateChange: (date: Date) => void;
}

type Preset = '7days' | '30days' | 'custom';

export default function DateRangePicker({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}: DateRangePickerProps) {
  const [preset, setPreset] = useState<Preset>('30days');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (p === '7days') {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      onFromDateChange(from);
      onToDateChange(today);
    } else if (p === '30days') {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      onFromDateChange(from);
      onToDateChange(today);
    }
  };

  const handleFromChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (date) {
      setPreset('custom');
      onFromDateChange(date);
    }
  };

  const handleToChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowToPicker(Platform.OS === 'ios');
    if (date) {
      setPreset('custom');
      onToDateChange(date);
    }
  };

  const formatDate = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
      d.getDate()
    ).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <View style={styles.presets}>
        {([['7days', '直近7日'], ['30days', '直近30日'], ['custom', 'カスタム']] as [Preset, string][]).map(
          ([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.preset, preset === key && styles.presetActive]}
              onPress={() => applyPreset(key)}
            >
              <Text
                style={[
                  styles.presetText,
                  preset === key && styles.presetTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>開始日</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setPreset('custom');
              setShowFromPicker(true);
            }}
          >
            <Text style={styles.dateText}>{formatDate(fromDate)}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.dateSeparator}>〜</Text>

        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>終了日</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setPreset('custom');
              setShowToPicker(true);
            }}
          >
            <Text style={styles.dateText}>{formatDate(toDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFromPicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display="default"
          maximumDate={toDate}
          onChange={handleFromChange}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display="default"
          minimumDate={fromDate}
          maximumDate={new Date()}
          onChange={handleToChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  preset: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  presetActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  presetTextActive: {
    color: Colors.textOnPrimary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlign: 'center',
  },
  dateSeparator: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    paddingBottom: Spacing.sm,
  },
});
