import Constants from 'expo-constants';

// API anahtarlarını güvenli şekilde environment variables'dan al
export const API_CONFIG = {
  OPENAI_API_KEY: Constants.expoConfig?.extra?.openaiApiKey,
  GOOGLE_BOOKS_API_KEY: Constants.expoConfig?.extra?.googleBooksApiKey,
  OPENAI_MODEL: Constants.expoConfig?.extra?.openaiModel || 'gpt-3.5-turbo',
  MAX_TOKENS: Constants.expoConfig?.extra?.maxTokens || 1000,
  TEMPERATURE: Constants.expoConfig?.extra?.temperature || 0.7,
  USE_DEMO_MODE: Constants.expoConfig?.extra?.useDemoMode || false
};

// API anahtarlarının mevcut olup olmadığını kontrol et
export const validateApiKeys = () => {
  const { OPENAI_API_KEY, GOOGLE_BOOKS_API_KEY } = API_CONFIG;
  
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API anahtarı bulunamadı! .env dosyasını kontrol edin.');
    return false;
  }
  
  if (!GOOGLE_BOOKS_API_KEY) {
    console.warn('⚠️ Google Books API anahtarı bulunamadı! .env dosyasını kontrol edin.');
    return false;
  }
  
  console.log('✅ API anahtarları başarıyla yüklendi!');
  return true;
};

// OpenAI API isteği için örnek
export const openaiApiCall = async (prompt) => {
  const { OPENAI_API_KEY, OPENAI_MODEL, MAX_TOKENS, TEMPERATURE } = API_CONFIG;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

// Google Books API isteği için örnek
export const googleBooksApiCall = async (query) => {
  const { GOOGLE_BOOKS_API_KEY } = API_CONFIG;
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Google Books API Error:', error);
    throw error;
  }
}; 