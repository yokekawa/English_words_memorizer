import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Updates from 'expo-updates';
import * as Font from 'expo-font';
import Constants from 'expo-constants';
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
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Values readable at build/runtime that tell us which bundle is executing.
  const runtimeVersion =
    (Updates as unknown as { runtimeVersion?: string }).runtimeVersion ??
    Constants.expoConfig?.runtimeVersion ??
    '-';
  const channel = (Updates as unknown as { channel?: string }).channel ?? '-';
  const updateId = Updates.updateId ?? '(embedded)';
  const isEmbedded = !Updates.updateId;

  const handleCheckForUpdate = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        Alert.alert('更新なし', '最新です。\n(現在: ' + updateId + ')');
        return;
      }
      const fetched = await Updates.fetchUpdateAsync();
      if (fetched.isNew) {
        Alert.alert(
          '更新あり',
          '新しい版をダウンロードしました。OKで再起動します。',
          [
            {
              text: 'OK',
              onPress: () => {
                Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        Alert.alert('更新確認', 'ダウンロードされましたが新規ではありません。');
      }
    } catch (e) {
      Alert.alert(
        '更新エラー',
        String(e instanceof Error ? e.message : e) +
          '\n(OTAが無効なビルドか、ネットワーク不通の可能性があります)'
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

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
        <Text style={styles.sectionTitle}>アプリの更新</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Runtime</Text>
            <Text style={styles.infoValueSmall}>{runtimeVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Channel</Text>
            <Text style={styles.infoValueSmall}>{channel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update ID</Text>
            <Text
              style={styles.infoValueSmall}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {isEmbedded ? '初期APK(embedded)' : updateId}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={handleCheckForUpdate}
            disabled={isCheckingUpdate}
            activeOpacity={0.8}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.updateBtnText}>更新を確認して適用</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>フォント診断</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NotoSans 読込</Text>
            <Text style={styles.infoValue}>
              {Font.isLoaded('NotoSans_400Regular') ? '✓ OK' : '✗ NG'}
            </Text>
          </View>
          <View>
            <Text style={styles.fontDiagLabel}>System (Roboto):</Text>
            <Text style={styles.fontDiagSample}>/sɔːs/ /ɡoʊ/ ʊ ɔ ə ɪ æ ʃ ː</Text>
          </View>
          <View>
            <Text style={styles.fontDiagLabel}>NotoSans:</Text>
            <Text style={[styles.fontDiagSample, { fontFamily: 'NotoSans_400Regular' }]}>
              /sɔːs/ /ɡoʊ/ ʊ ɔ ə ɪ æ ʃ ː
            </Text>
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
            • Jisho / JMdict（日本語訳・無料）{'\n'}
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
  infoValueSmall: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    maxWidth: 220,
  },
  updateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  updateBtnText: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  apiNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  fontDiagLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  fontDiagSample: {
    fontSize: FontSize.lg,
    color: Colors.text,
  },
});
