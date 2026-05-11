import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BannerAdContainer from '@/components/ads/BannerAdContainer';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

// --- Mock illustration building blocks ---

function Screen({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={mock.screenWrapper}>
      {label && <Text style={mock.screenCaption}>{label}</Text>}
      <View style={mock.screenFrame}>{children}</View>
    </View>
  );
}

function Bar({ text, color = Colors.primary }: { text: string; color?: string }) {
  return (
    <View style={[mock.bar, { backgroundColor: color }]}>
      <Text style={mock.barText}>{text}</Text>
    </View>
  );
}

function Chip({
  text,
  active = false,
  color = Colors.primary,
}: {
  text: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <View
      style={[
        mock.chip,
        active && { backgroundColor: color, borderColor: color },
      ]}
    >
      <Text style={[mock.chipText, active && mock.chipTextActive]}>{text}</Text>
    </View>
  );
}

function Box({
  children,
  color,
  padded = true,
}: {
  children: React.ReactNode;
  color?: string;
  padded?: boolean;
}) {
  return (
    <View
      style={[
        mock.box,
        padded && mock.boxPadded,
        color ? { borderColor: color } : null,
      ]}
    >
      {children}
    </View>
  );
}

function InputCells({ text, active = true }: { text: string; active?: boolean }) {
  const chars = text.split('');
  return (
    <View style={mock.inputRow}>
      {chars.map((c, i) => (
        <View key={i} style={[mock.inputCell, c && mock.inputCellFilled]}>
          <Text style={mock.inputCellText}>{c}</Text>
        </View>
      ))}
      {active && <View style={[mock.inputCell, mock.inputCellActive]} />}
      {Array.from({ length: 2 }).map((_, i) => (
        <View key={`empty-${i}`} style={mock.inputCell} />
      ))}
    </View>
  );
}

// --- Step block ---

function Step({
  num,
  title,
  description,
  illustration,
}: {
  num: number;
  title: string;
  description: string;
  illustration: React.ReactNode;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{num}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepDesc}>{description}</Text>
      <View style={styles.stepIllustration}>{illustration}</View>
    </View>
  );
}

// --- Main screen ---

export default function HelpScreen() {
  return (
    <View style={styles.outerContainer}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.appTitle}>英単語暗記アプリの使い方</Text>
        <Text style={styles.appSubtitle}>
          教科書から単語を取り込み、クイズ形式で記憶を定着させる学習アプリです。
        </Text>
      </View>

      <Step
        num={1}
        title="単語を登録する（カメラ撮影）"
        description="「📷 登録」タブを開き、教科書のページを撮影します。OCRで検出した単語が一覧表示され、登録したいものを選択できます。"
        illustration={
          <Screen label="📷 登録タブ">
            <Bar text="カメラで撮影 / 手入力" />
            <Box color={Colors.primary}>
              <Text style={mock.boxTitle}>検出された単語</Text>
              <View style={mock.chipRow}>
                <Chip text="✓ add" active color={Colors.success} />
                <Chip text="✓ simple" active color={Colors.success} />
                <Chip text="happy" />
                <Chip text="run" />
                <Chip text="mouse" />
              </View>
              <Bar text="選択した単語を登録" color={Colors.primary} />
            </Box>
          </Screen>
        }
      />

      <Step
        num={2}
        title="登録内容を確認・編集"
        description="自動取得された品詞・日本語訳・活用形を確認し、必要に応じて修正してから保存します。複数語をまとめて登録することも可能です。"
        illustration={
          <Screen label="単語詳細">
            <Bar text="add" />
            <Box>
              <Text style={mock.rowLabel}>品詞</Text>
              <Text style={mock.rowValue}>動詞</Text>
              <Text style={mock.rowLabel}>日本語訳</Text>
              <Text style={mock.rowValue}>加える、足す</Text>
              <Text style={mock.rowLabel}>発音</Text>
              <Text style={mock.rowValue}>/æd/ 🔊</Text>
              <Text style={mock.rowLabel}>過去形 / 過去分詞形</Text>
              <Text style={mock.rowValue}>added / added</Text>
            </Box>
            <Bar text="登録する" color={Colors.success} />
          </Screen>
        }
      />

      <Step
        num={3}
        title="出題範囲を設定"
        description={
          '「✏️ 学習」タブの「単語を選ぶ」から、期間や品詞で出題対象を絞り込めます。よく使う範囲は名前を付けて保存できます（例: 「Section 3」）。'
        }
        illustration={
          <Screen label="出題する単語を選ぶ">
            <Box>
              <Text style={mock.rowLabel}>📅 期間を指定</Text>
              <View style={mock.chipRow}>
                <Chip text="直近7日" />
                <Chip text="直近30日" active />
                <Chip text="カスタム" />
              </View>
              <Text style={mock.rowLabel}>品詞</Text>
              <View style={mock.chipRow}>
                <Chip text="すべて" />
                <Chip text="動詞" active />
                <Chip text="名詞" />
              </View>
            </Box>
            <Box>
              <View style={mock.listRow}>
                <View style={mock.checkboxFilled} />
                <Text style={mock.listWord}>add</Text>
                <Text style={mock.listMeaning}>加える</Text>
              </View>
              <View style={mock.listRow}>
                <View style={mock.checkboxFilled} />
                <Text style={mock.listWord}>run</Text>
                <Text style={mock.listMeaning}>走る</Text>
              </View>
              <View style={mock.listRow}>
                <View style={mock.checkbox} />
                <Text style={mock.listWord}>mouse</Text>
                <Text style={mock.listMeaning}>ネズミ</Text>
              </View>
            </Box>
            <Bar text="2語を確定" color={Colors.success} />
          </Screen>
        }
      />

      <Step
        num={4}
        title="問題モードを選ぶ"
        description={
          '5種類のモードから選択できます。「過去形・過去分詞形」「比較級・最上級」は、どちらか一方のみ／両方の3つから選べます。'
        }
        illustration={
          <Screen label="問題モード">
            <View style={mock.modeGrid}>
              <View style={[mock.modeCard, mock.modeCardActive]}>
                <Text style={mock.modeIcon}>🇯🇵</Text>
                <Text style={mock.modeCardTitle}>日本語→英語</Text>
              </View>
              <View style={mock.modeCard}>
                <Text style={mock.modeIcon}>🔊</Text>
                <Text style={mock.modeCardTitle}>発音→英語</Text>
              </View>
              <View style={mock.modeCard}>
                <Text style={mock.modeIcon}>⏪</Text>
                <Text style={mock.modeCardTitle}>過去形・過去分詞形</Text>
              </View>
              <View style={mock.modeCard}>
                <Text style={mock.modeIcon}>📚</Text>
                <Text style={mock.modeCardTitle}>複数形</Text>
              </View>
              <View style={mock.modeCard}>
                <Text style={mock.modeIcon}>📈</Text>
                <Text style={mock.modeCardTitle}>比較級・最上級</Text>
              </View>
            </View>
            <Text style={mock.rowLabel}>出題する形</Text>
            <View style={mock.chipRow}>
              <Chip text="過去形のみ" />
              <Chip text="過去分詞形のみ" />
              <Chip text="両方" active color={Colors.quizMode.baseToPast} />
            </View>
          </Screen>
        }
      />

      <Step
        num={5}
        title="クイズに答える"
        description={
          '画面下のキーボードで1文字ずつ入力します。正しい文字だけが入力欄に入ります。間違ったキーはミスとしてカウントされ、5回ミスすると強制的に不正解になります。答えを全部打ち終えると自動で次の問題に進みます。'
        }
        illustration={
          <Screen label="クイズ画面">
            <Box color={Colors.primary}>
              <Text style={mock.rowLabel}>問題</Text>
              <Text style={mock.questionPrompt}>加える</Text>
            </Box>
            <InputCells text="ad" />
            <View style={mock.keyboardMock}>
              {['q', 'w', 'e', 'r', 't', 'y'].map(k => (
                <View key={k} style={mock.keyMock}>
                  <Text style={mock.keyMockText}>{k}</Text>
                </View>
              ))}
            </View>
          </Screen>
        }
      />

      <Step
        num={6}
        title="「両方」モード: 2つ答える"
        description={
          '過去形・過去分詞形などの「両方」モードでは、入力欄が2つ並びます。1つ目を打ち終えると自動で2つ目に進み、2つ全部が正解のときだけ「正解」になります。'
        }
        illustration={
          <Screen label="両方モード">
            <Box color={Colors.primary}>
              <Text style={mock.questionPrompt}>happy  ―  比較級と最上級は？</Text>
            </Box>
            <Text style={mock.rowLabel}>比較級</Text>
            <InputCells text="happier" active={false} />
            <Text style={mock.rowLabel}>最上級</Text>
            <InputCells text="happie" active />
          </Screen>
        }
      />

      <Step
        num={7}
        title="結果を確認"
        description={
          'クイズ終了後、正答率・所要時間・問題ごとの正誤を確認できます。間違えた単語は間違えた回数が多いほど次回以降出やすくなる仕組みです。'
        }
        illustration={
          <Screen label="結果">
            <Box>
              <Text style={mock.resultEmoji}>🎉</Text>
              <Text style={mock.resultAccuracy}>80%</Text>
              <Text style={mock.resultDetail}>8 / 10 問正解</Text>
            </Box>
            <Box>
              <View style={mock.resultRow}>
                <Text style={[mock.resultMark, { color: Colors.success }]}>✓</Text>
                <Text style={mock.resultText}>加える → add</Text>
              </View>
              <View style={mock.resultRow}>
                <Text style={[mock.resultMark, { color: Colors.error }]}>✗</Text>
                <Text style={mock.resultText}>
                  ネズミ → <Text style={{ color: Colors.success }}>mice</Text>
                </Text>
              </View>
            </Box>
          </Screen>
        }
      />

      <Step
        num={8}
        title="単語帳で復習・編集"
        description={
          '「📖 単語帳」タブで登録済みの単語を一覧・検索できます。各単語をタップすると日本語訳・活用形・発音などを編集可能です。'
        }
        illustration={
          <Screen label="単語帳">
            <Bar text="🔍 検索" color={Colors.surfaceSecondary as string} />
            <Box>
              <View style={mock.wordListRow}>
                <Text style={mock.wordListWord}>add</Text>
                <Text style={mock.wordListMeaning}>加える</Text>
                <Text style={mock.wordListStat}>◯8 / ✗2</Text>
              </View>
              <View style={mock.wordListRow}>
                <Text style={mock.wordListWord}>happy</Text>
                <Text style={mock.wordListMeaning}>幸せな</Text>
                <Text style={mock.wordListStat}>◯5 / ✗0</Text>
              </View>
            </Box>
          </Screen>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          使ってみてわからないところがあれば、設定画面の「APIについて」からアプリの仕組みを確認できます。
        </Text>
      </View>
    </ScrollView>
    <BannerAdContainer />
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
  intro: { gap: Spacing.xs, marginBottom: Spacing.sm },
  appTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  appSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  step: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: Colors.textOnPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  stepTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, flex: 1 },
  stepDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  stepIllustration: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  footer: { paddingVertical: Spacing.md },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

const mock = StyleSheet.create({
  screenWrapper: { gap: 4 },
  screenCaption: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  screenFrame: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bar: {
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  barText: { color: Colors.textOnPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  box: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  boxPadded: { padding: Spacing.sm },
  boxTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },
  rowLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginTop: 4,
  },
  rowValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.semibold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.textOnPrimary },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4,
  },
  checkbox: {
    width: 14, height: 14, borderRadius: 3,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  checkboxFilled: {
    width: 14, height: 14, borderRadius: 3,
    backgroundColor: Colors.primary, borderWidth: 1.5, borderColor: Colors.primary,
  },
  listWord: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  listMeaning: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modeCard: {
    width: '48%', padding: 8,
    borderRadius: BorderRadius.sm, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center', gap: 2,
  },
  modeCardActive: {
    borderColor: Colors.quizMode.jpToEn,
    backgroundColor: Colors.quizMode.jpToEn + '18',
  },
  modeIcon: { fontSize: 18 },
  modeCardTitle: { fontSize: 11, fontWeight: FontWeight.semibold, color: Colors.text, textAlign: 'center' },
  questionPrompt: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold,
    color: Colors.text, textAlign: 'center', paddingVertical: 4,
  },
  inputRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 3,
    padding: 6, borderRadius: BorderRadius.sm,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.surface,
  },
  inputCell: {
    width: 18, height: 24, borderRadius: 3,
    backgroundColor: Colors.surfaceSecondary,
    borderBottomWidth: 1.5, borderBottomColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  inputCellFilled: { backgroundColor: Colors.primaryLight, borderBottomColor: Colors.primary },
  inputCellActive: { borderBottomColor: Colors.primary },
  inputCellText: { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.text },
  keyboardMock: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  keyMock: {
    width: 22, height: 26, borderRadius: 3,
    backgroundColor: Colors.keyboard.key, alignItems: 'center', justifyContent: 'center',
  },
  keyMockText: { fontSize: 12, fontWeight: FontWeight.semibold, color: Colors.keyboard.text },
  resultEmoji: { fontSize: 32, textAlign: 'center' },
  resultAccuracy: {
    fontSize: 32, fontWeight: FontWeight.bold,
    color: Colors.primary, textAlign: 'center',
  },
  resultDetail: { fontSize: FontSize.sm, color: Colors.text, textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  resultMark: { fontSize: FontSize.md, fontWeight: FontWeight.bold, width: 16 },
  resultText: { fontSize: FontSize.xs, color: Colors.text },
  wordListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  wordListWord: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, width: 60 },
  wordListMeaning: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  wordListStat: { fontSize: FontSize.xs, color: Colors.textTertiary },
});
