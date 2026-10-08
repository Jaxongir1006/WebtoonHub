import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { SupportedLocale, getExtraTranslation } from '../i18n';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const configuredTimeout = Number(import.meta.env?.VITE_API_TIMEOUT_MS);
export const API_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000 && configuredTimeout <= 120000
  ? configuredTimeout : 15000;
export const ACCESS_TOKEN_KEY = 'webtoonhub_access_token';
export const REFRESH_TOKEN_KEY = 'webtoonhub_refresh_token';
export function currentLocale(): SupportedLocale {
  const saved = localStorage.getItem('webtoonhub_lang');
  if (saved === 'uz' || saved === 'ru' || saved === 'en') return saved;
  return navigator.language.startsWith('ru') ? 'ru' : navigator.language.startsWith('en') ? 'en' : 'uz';
}
export function clearReaderSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY);
  delete apiClient.defaults.headers.common.Authorization;
  window.dispatchEvent(new Event('webtoonhub:auth-ended'));
}
const refreshClient = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS });
type ReaderRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _authSnapshot?: { accessToken: string | null; refreshToken: string | null };
};
export const apiClient = axios.create({
  baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' }
});
apiClient.interceptors.request.use((config: ReaderRequestConfig) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const snapshot = config._authSnapshot;
  if (config._retry && snapshot && (snapshot.accessToken !== token || snapshot.refreshToken !== refreshToken)) {
    throw new axios.CanceledError('Account changed before request retry');
  }
  config._authSnapshot = { accessToken: token, refreshToken };
  if (token) config.headers.set('Authorization', 'Bearer ' + token);
  else config.headers.delete('Authorization');
  config.headers.set('Accept-Language', currentLocale());
  config.headers.set('X-Device-Type', /iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
  return config;
}, error => { throw error; }, { synchronous: true });

let refreshFlight: Promise<string> | null = null;
apiClient.interceptors.response.use(response => response, async (error: AxiosError) => {
  const original = error.config as ReaderRequestConfig | undefined;
  if (!original || error.response?.status !== 401 || original._retry ||
      /\/auth\/(login|register|refresh|password)/.test(original.url || '')) return Promise.reject(error);
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  const snapshot = original._authSnapshot;
  if (snapshot && (snapshot.accessToken !== localStorage.getItem(ACCESS_TOKEN_KEY) || snapshot.refreshToken !== refresh)) {
    throw new axios.CanceledError('Account changed while the request was pending');
  }
  if (!refresh) { clearReaderSession(); return Promise.reject(error); }
  original._retry = true;
  if (!refreshFlight) {
    refreshFlight = refreshClient.post('/auth/refresh', { refresh_token: refresh }).then(response => {
      const data = response.data.data;
      if (localStorage.getItem(REFRESH_TOKEN_KEY) !== refresh) {
        // Rotation can finish after local logout. Revoke that captured session
        // with its returned credentials without touching the current account.
        void refreshClient.post('/auth/logout', { refresh_token: data.refresh_token || refresh }, {
          timeout: API_TIMEOUT_MS,
          headers: data.access_token ? { Authorization: 'Bearer ' + data.access_token } : {}
        }).catch(() => {});
        throw new axios.CanceledError('Account changed during refresh');
      }
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      return data.access_token as string;
    }).catch(refreshError => {
      if (localStorage.getItem(REFRESH_TOKEN_KEY) === refresh) clearReaderSession();
      throw refreshError;
    }).finally(() => { refreshFlight = null; });
  }
  const refreshedAccess = await refreshFlight;
  if (localStorage.getItem(ACCESS_TOKEN_KEY) !== refreshedAccess) throw new axios.CanceledError('Account changed before request retry');
  if (original.signal?.aborted) throw new axios.CanceledError();
  original._authSnapshot = { accessToken: refreshedAccess, refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) };
  // Let queued sign-in/logout changes settle; dispatch rechecks this captured owner.
  await Promise.resolve();
  return apiClient(original);
});

export const getApiErrorMessage = (error: unknown, defaultMessage?: string): string => {
  const locale = currentLocale();
  const message = (key: string) => getExtraTranslation(locale, 'readerFix.' + key) || defaultMessage || key;
  if (axios.isAxiosError(error)) {
    if (!error.response) return message('offline');
    const status = error.response.status;
    const data = error.response.data;
    const validation = data?.error?.details;
    if (status === 422 && Array.isArray(validation) && validation.some(item => typeof item.field === 'string' && /(?:^| -> )content$/.test(item.field))) {
      return getExtraTranslation(locale, 'comments.tooLong', { limit: 500 }) || message('apiValidation');
    }
    if (status === 401 && /\/auth\/login/.test(error.config?.url || '')) return getExtraTranslation(locale, 'ux.invalidCredentials') || defaultMessage || message('apiValidation');
    // Keep server-specific details in the primary language; other locales get
    // actionable translated feedback rather than untranslated system strings.
    if (locale === 'uz') {
      const value = data?.error?.message ?? data?.message ?? data?.detail;
      if (typeof value === 'string') return value;
    }
    if (status === 401) return message('apiSession');
    if (status === 403) return message('apiAccess');
    if (status === 404) return message('notFound');
    if (status === 409) return message('apiConflict');
    if (status === 422 || status === 400) return message('apiValidation');
    if (status === 429) return message('apiRate');
  }
  return defaultMessage || message('loadError');
};
