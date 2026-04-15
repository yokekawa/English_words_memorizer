const BASE_URL = 'https://api.mymemory.translated.net/get';

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
  if (!translated || translated === word) {
    // If translation returned the same word (failed), return placeholder
    return `(${word})`;
  }

  return translated;
}
