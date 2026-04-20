import Constants from 'expo-constants';
import { TextBlock } from '@/types';

const API_URL = 'https://vision.googleapis.com/v1/images:annotate';

interface VisionAnnotation {
  description: string;
  boundingPoly?: {
    vertices: { x?: number; y?: number }[];
  };
}

interface VisionResponse {
  responses: {
    textAnnotations?: VisionAnnotation[];
    error?: { message: string };
  }[];
}

export interface OCRResult {
  fullText: string;
  blocks: TextBlock[];
}

export async function recognizeText(
  base64Image: string,
  imageWidth: number,
  imageHeight: number
): Promise<OCRResult> {
  const extra = Constants.expoConfig?.extra ?? {};
  const apiKey = extra.googleVisionApiKey as string;
  if (!apiKey) {
    throw new Error(
      'Google Vision API キーが設定されていません。.envファイルにGOOGLE_VISION_API_KEYを設定してください。'
    );
  }

  const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
      },
    ],
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Manually attach Android app identity so server-side API key restrictions
  // (Android app + SHA-1) accept requests from plain fetch, which does not
  // inject these automatically unlike the Google Play Services client.
  const androidPackage = extra.androidPackage as string | undefined;
  const androidCertSha1 = extra.androidCertSha1 as string | undefined;
  if (androidPackage && androidCertSha1) {
    headers['X-Android-Package'] = androidPackage;
    headers['X-Android-Cert'] = androidCertSha1;
  }

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Vision API エラー: ${response.status}\n${errorBody}`);
  }

  const data: VisionResponse = await response.json();
  const result = data.responses[0];

  if (result.error) {
    throw new Error(`Vision API エラー: ${result.error.message}`);
  }

  const annotations = result.textAnnotations ?? [];
  if (annotations.length === 0) {
    return { fullText: '', blocks: [] };
  }

  // First annotation is the full text
  const fullText = annotations[0].description ?? '';

  // Subsequent annotations are individual words with bounding boxes
  const blocks: TextBlock[] = annotations.slice(1).map(ann => {
    const vertices = ann.boundingPoly?.vertices ?? [];
    const xs = vertices.map(v => v.x ?? 0);
    const ys = vertices.map(v => v.y ?? 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      text: ann.description,
      boundingBox: {
        x: minX / imageWidth,
        y: minY / imageHeight,
        width: (maxX - minX) / imageWidth,
        height: (maxY - minY) / imageHeight,
      },
    };
  });

  return { fullText, blocks };
}
