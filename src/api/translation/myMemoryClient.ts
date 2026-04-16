const BASE_URL = 'https://api.mymemory.translated.net/get';

function isValidJapanese(text: string, original: string): boolean {
  if (!text || text === original) return false;
  // Reject MyMemory template placeholders like "%1", "%2"
  if (/%\d/.test(text)) return false;
  // Reject HTML entities like &apos; &amp; &lt;
  if (/&[a-z]+;/i.test(text)) return false;
  // Must contain at least one Japanese character
  if (!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)) return false;
  // Reject if Japanese characters make up less than 15% of a long string
  // (catches "ウェブ%1 is a Contact Owner..." style garbage)
  const jpCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) ?? []).length;
  if (text.length > 15 && jpCount / text.length < 0.15) return false;
  return true;
}

interface MyMemoryResponse {
  responseStatus: number;
  responseData: {
    translatedText: string;
    match: number;
  };
  matches?: {
    translation: string;
    quality: string;
    subject: string;
  }[];
}

export async function translateToJapanese(word: string): Promise<string> {
  const url = `${BASE_URL}?q=${encodeURIComponent(word)}&langpair=en|ja`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`MyMemory API エラー: ${response.status}`);
  }

  const data: MyMemoryResponse = await response.json();

  if (data.responseStatus !== 200) {
    throw new Error(`MyMemory API エラー: status ${data.responseStatus}`);
  }

  const translated = data.responseData.translatedText;

  if (!isValidJapanese(translated, word)) {
    throw new Error('No valid Japanese translation');
  }

  return translated;
}
