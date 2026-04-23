import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WordListStackParams, PartOfSpeech, WordDraft } from '@/types';
import Button from '@/components/common/Button';
import { wordRegistrationService } from '@/services/wordRegistrationService';
import { generateConjugations } from '@/api/conjugation/inflectorsService';
import { translateToJapanese } from '@/api/dictionary/jishoClient';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<WordListStackParams, 'ManualEntry'>;

const POS_OPTIONS: { pos: PartOfSpeech; label: string }[] = [
  { pos: 'noun',         label: '名詞' },
  { pos: 'verb',         label: '動詞' },
  { pos: 'adjective',    label: '形容詞' },
  { pos: 'adverb',       label: '副詞' },
  { pos: 'pronoun',      label: '代名詞' },
  { pos: 'preposition',  label: '前置詞' },
  { pos: 'conjunction',  label: '接続詞' },
  { pos: 'interjection', label: '感嘆詞' },
  { pos: 'unknown',      label: 'その他' },
];

const AUTOFILL_DEBOUNCE_MS = 600;
const POS_REFETCH_DEBOUNCE_MS = 300;

export default function ManualEntryScreen({ navigation }: Props) {
  const addWord = useWordStore(s => s.addWord);

  const [spelling, setSpelling] = useState('');
  const [japanese, setJapanese] = useState('');
  const [pos, setPos] = useState<PartOfSpeech>('unknown');
  const [draft, setDraft] = useState<WordDraft | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);

  // Track the last spelling we autofilled, to avoid clobbering edits the user
  // makes after autofill resolves.
  const autofilledForRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track what autofill last wrote into japanese/pos so we can detect user
  // edits and avoid double-fetching for a pos that was just set by autofill.
  const lastAutofilledJapaneseRef = useRef<string | null>(null);
  const lastAutofilledPosRef = useRef<PartOfSpeech | null>(null);
  const posRefetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = spelling.trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      setAutofillError(null);
      setAlreadyExists(false);
      setDraft(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsAutofilling(true);
      setAutofillError(null);
      try {
        const exists = await wordRegistrationService.isAlreadyRegistered(trimmed);
        setAlreadyExists(exists);
        const built = await wordRegistrationService.buildDraft(trimmed);
        setDraft(built);
        // Only overwrite user-editable fields if they're empty or were
        // populated by an earlier autofill (not by manual edit).
        if (autofilledForRef.current === null || autofilledForRef.current !== trimmed) {
          setJapanese(built.japaneseMeaning);
          setPos(built.partOfSpeech);
          lastAutofilledJapaneseRef.current = built.japaneseMeaning;
          lastAutofilledPosRef.current = built.partOfSpeech;
        }
        autofilledForRef.current = trimmed;
      } catch (e) {
        setAutofillError(String(e instanceof Error ? e.message : e));
        setDraft(null);
      } finally {
        setIsAutofilling(false);
      }
    }, AUTOFILL_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [spelling]);

  // Re-translate to Japanese when the user changes POS after the initial
  // autofill, so the meaning matches (e.g. verb "do"→する, then switch to
  // noun→度). Skipped if the user has manually edited the japanese field.
  useEffect(() => {
    if (posRefetchDebounceRef.current) clearTimeout(posRefetchDebounceRef.current);
    // Only run once initial autofill has populated the refs.
    if (lastAutofilledPosRef.current === null) return;
    // Ignore: this pos change IS the initial autofill setting it.
    if (pos === lastAutofilledPosRef.current) return;
    // User has hand-edited the japanese field — don't clobber their input.
    if (japanese !== lastAutofilledJapaneseRef.current) return;

    const baseForm = draft?.baseForm ?? spelling.trim().toLowerCase();
    if (!baseForm) return;

    posRefetchDebounceRef.current = setTimeout(async () => {
      setIsAutofilling(true);
      try {
        const newJp = await translateToJapanese(baseForm, pos);
        setJapanese(newJp);
        lastAutofilledJapaneseRef.current = newJp;
        lastAutofilledPosRef.current = pos;
      } catch {
        // Keep current translation on failure.
      } finally {
        setIsAutofilling(false);
      }
    }, POS_REFETCH_DEBOUNCE_MS);

    return () => {
      if (posRefetchDebounceRef.current) clearTimeout(posRefetchDebounceRef.current);
    };
  }, [pos, draft?.baseForm, spelling, japanese]);

  // Conjugations reflect the currently-selected POS, not the dictionary's
  // originally-detected POS, so switching from noun→verb immediately shows
  // the verb conjugations (and vice versa).
  const effectiveBaseForm = (draft?.baseForm ?? spelling.trim().toLowerCase());
  const liveConjugations = useMemo(
    () => (effectiveBaseForm ? generateConjugations(effectiveBaseForm, pos) : []),
    [effectiveBaseForm, pos]
  );

  const canSave =
    spelling.trim().length >= 2 &&
    japanese.trim().length > 0 &&
    !isSaving &&
    !alreadyExists;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const finalDraft: WordDraft = {
        baseForm: effectiveBaseForm,
        partOfSpeech: pos,
        phonetic: draft?.phonetic ?? null,
        japaneseMeaning: japanese.trim(),
        exampleSentence: draft?.exampleSentence,
        conjugations: liveConjugations,
      };
      const registered = await wordRegistrationService.registerWord(finalDraft);
      addWord(registered);
      navigation.goBack();
    } catch (e) {
      Alert.alert('登録に失敗', String(e instanceof Error ? e.message : e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>単語を手動で登録</Text>
          <Text style={styles.cardHint}>
            英単語を入力すると、和訳・品詞・活用形が自動で取得されます。
            必要なら下で編集してください。
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>英単語</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={spelling}
                onChangeText={setSpelling}
                placeholder="例: discover"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {isAutofilling && (
                <ActivityIndicator size="small" color={Colors.primary} />
              )}
            </View>
            {alreadyExists && (
              <Text style={styles.warnText}>※ この単語は既に登録されています</Text>
            )}
            {autofillError && !isAutofilling && (
              <Text style={styles.warnText}>取得に失敗: {autofillError}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>和訳</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={japanese}
              onChangeText={setJapanese}
              placeholder="自動取得した和訳が入ります"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>品詞</Text>
            <View style={styles.posGrid}>
              {POS_OPTIONS.map(({ pos: p, label }) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.posChip, pos === p && styles.posChipActive]}
                  onPress={() => setPos(p)}
                >
                  <Text
                    style={[
                      styles.posChipText,
                      pos === p && styles.posChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {liveConjugations.length > 0 && (
            <View style={styles.conjBlock}>
              <Text style={styles.fieldLabel}>活用形 (選択中の品詞で生成)</Text>
              {liveConjugations.map((c, i) => (
                <Text key={i} style={styles.conjLine}>
                  ・{c.type}: {c.form}
                </Text>
              ))}
            </View>
          )}

          <Button
            label={alreadyExists ? '登録済み' : '登録する'}
            onPress={handleSave}
            disabled={!canSave}
            loading={isSaving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  cardHint: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  field: { gap: 4 },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputFlex: { flex: 1 },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  warnText: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2 },
  posGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  posChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  posChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  posChipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  posChipTextActive: { color: Colors.textOnPrimary },
  conjBlock: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  conjLine: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
