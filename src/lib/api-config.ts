// Configurazione API per web e mobile
// In mobile, le API devono puntare al server remoto

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

// Rileva se siamo in un'app nativa Capacitor
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
};

// URL base delle API
// In sviluppo web: '' (relativo)
// In mobile: URL del server di produzione
const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const getApiUrl = (): string => {
  if (isNativeApp()) {
    // In mobile, usa l'URL di produzione
    return PRODUCTION_API_URL || 'https://your-deployed-app.com';
  }
  // In web, usa URL relativo
  return '';
};

// Helper per fare richieste API
export const apiFetch = async (endpoint: string, options: RequestInit = {}, userId?: string) => {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(userId && { 'x-user-id': userId }),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Errore del server');
  }

  return data;
};

// Configurazione WebSocket per mobile
export const getWebSocketUrl = (): string => {
  if (isNativeApp()) {
    return PRODUCTION_API_URL || 'https://your-deployed-app.com';
  }
  return '';
};
