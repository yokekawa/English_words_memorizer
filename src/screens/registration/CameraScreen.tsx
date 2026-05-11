import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RegistrationStackParams } from '@/types';
import { recognizeText } from '@/api/ocr/googleVisionClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getDatabase } from '@/database/db';
import {
  ApiUsageRepository,
  currentYearMonth,
} from '@/database/repositories/apiUsageRepository';
import { showRewardedAd } from '@/components/ads/RewardedAdManager';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  OCR_MONTHLY_BASE_LIMIT,
  OCR_REWARD_PER_AD,
} from '@/constants';

type Props = NativeStackScreenProps<RegistrationStackParams, 'Camera'>;

export default function CameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <LoadingSpinner message="カメラを準備中..." />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          教科書のテキストを読み取るためにカメラへのアクセスが必要です。
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>カメラを許可する</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const grantBonus = async (): Promise<boolean> => {
    const earned = await showRewardedAd();
    if (!earned) {
      Alert.alert(
        '広告を視聴できませんでした',
        '通信状況などにより広告を表示できませんでした。少し時間を置いて再度お試しください。'
      );
      return false;
    }
    const db = await getDatabase();
    const usageRepo = new ApiUsageRepository(db);
    await usageRepo.increment('ocr_bonus', currentYearMonth(), OCR_REWARD_PER_AD);
    return true;
  };

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const db = await getDatabase();
      const usageRepo = new ApiUsageRepository(db);
      const yearMonth = currentYearMonth();
      const used = await usageRepo.getCount('ocr', yearMonth);
      const bonus = await usageRepo.getCount('ocr_bonus', yearMonth);
      const effectiveLimit = OCR_MONTHLY_BASE_LIMIT + bonus;
      if (used >= effectiveLimit) {
        setIsProcessing(false);
        Alert.alert(
          '今月の取り込み枠を使い切りました',
          `今月の OCR 利用可能数 (${effectiveLimit}回) をすべて使い切りました。\n\n動画広告 (約30秒) を1本見ると、追加で ${OCR_REWARD_PER_AD} 回ご利用いただけます。`,
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '広告を見る',
              onPress: async () => {
                await grantBonus();
              },
            },
          ]
        );
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (!photo) throw new Error('撮影に失敗しました');

      // Resize for API efficiency
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64 = manipulated.base64;
      if (!base64) throw new Error('画像の処理に失敗しました');

      const ocrResult = await recognizeText(
        base64,
        manipulated.width,
        manipulated.height
      );

      // Count the call only after a successful API response so failures
      // don't burn the user's monthly budget.
      await usageRepo.increment('ocr', yearMonth);

      if (!ocrResult.fullText.trim()) {
        Alert.alert(
          'テキストが見つかりません',
          '教科書のテキストが見える状態で再度撮影してください。'
        );
        return;
      }

      navigation.navigate('OCRReview', {
        imageUri: manipulated.uri,
        rawText: ocrResult.fullText,
        blocks: ocrResult.blocks,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      Alert.alert('エラー', message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.guide} />
        </View>

        <View style={styles.hintContainer}>
          <Text style={styles.hint}>教科書のテキストをフレーム内に合わせてください</Text>
        </View>

        <View style={styles.captureContainer}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <LoadingSpinner size="small" message="テキストを読み取り中..." />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              activeOpacity={0.8}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  guide: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: BorderRadius.md,
  },
  hintContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.sm,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  captureContainer: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  processingContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  permissionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  permissionButtonText: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
