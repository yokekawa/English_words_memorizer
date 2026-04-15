import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

const WORD_COUNTS = [5, 10, 15, 20, 30];

export default function SettingsScreen() {
  const {
    defaultWordCount,
    showHints,
    hapticEnabled,
    setDefaultWordCount,
    setShowHints,
    setHapticEnabled,
  } = useSettingsStore();

  const { words } = useWordStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>学習設定</Text>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>1回の問題数</Text>
              <Text style={styles.settingDesc}>クイズ1セッションの問題数</Text>
            </View>
          </View>
          <View style={styles.countSelector}>
            {WORD_COUNTS.map(count => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.countOption,
                  defaultWordCount === count && styles.countOptionActive,
                ]}
                onPress={() => setDefaultWordCount(count)}
              >
                <Text
                  style={[
                    styles.countOptionText,
                    defaultWordCount === count && styles.countOptionTextActive,
                  ]}
                >
                  {count}問
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>ヒントを表示</Text>
              <Text style={styles.settingDesc}>
                回答入力中に最初の1文字を表示
              </Text>
            </View>
            <Switch
              value={showHints}
              onValueChange={setShowHints}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>バイブレーション</Text>
              <Text style={styles.settingDesc}>
                キータッチ・正解/不正解時の振動
              </Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>データ</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>登録単語数</Text>
            <Text style={styles.infoValue}>{words.length} 語</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APIについて</Text>
        <View style={styles.card}>
          <Text style={styles.apiNote}>
            このアプリは以下のサービスを使用しています:{'\n\n'}
            • Google Cloud Vision API（OCR・要APIキー）{'\n'}
            • Free Dictionary API（発音・品詞情報）{'\n'}
            • MyMemory API（日本語翻訳・無料）{'\n'}
            • en-inflectors（活用形生成・ローカル）{'\n\n'}
            OCRを使用するには .env ファイルに{'\n'}
            GOOGLE_VISION_API_KEY を設定してください。
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: { flex: 1, marginRight: Spacing.md },
  settingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  settingDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  countSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  countOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  countOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  countOptionText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  countOptionTextActive: {
    color: Colors.textOnPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  apiNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
