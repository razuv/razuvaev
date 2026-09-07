import type { SettingsType } from '../../shared/settings.types';
export type { SettingsType, Social, CaseBlock, CaseBlockType, HeroProofGroup } from '../../shared/settings.types';

let settings: SettingsType;
export let token: string;
const settingsUrl = import.meta.env.DEV
  ? '/__settings'
  : import.meta.env.VITE_SETTINGS_URL || 'https://razuvaev-admin-ng.website.yandexcloud.net/settings.json';
const baseUrl = (import.meta.env.DEV ? (import.meta.env.VITE_DEV_API_URL || 'http://127.0.0.1:3000') : (import.meta.env.VITE_API_URL || 'https://bbafo00lvo6me2t4idr8.containers.yandexcloud.net')).replace(/\/$/, '');
const mediaBaseUrl = (import.meta.env.VITE_MEDIA_BASE_URL || `${baseUrl}/api`).replace(/\/$/, '');

export const resolveMediaUrl = (link: string): string => {
  if(link.startsWith('/media/')) {
    return import.meta.env.VITE_USE_REMOTE_MEDIA === 'true' ? `${mediaBaseUrl}${link}` : link;
  }

  return link;
}

export const uploadMedia = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if(!response.ok) {
    throw new Error(`Failed to upload media: ${response.status}`);
  }

  const result = await response.json();

  if(!result?.link) {
    throw new Error('Media upload did not return a link');
  }

  return result.link;
}

export const getSettings = async (forceReload?: boolean): Promise<SettingsType> => {
  if(settings && !forceReload) {
    return settings;
  }

  const timestamp = new Date().getTime();
  const response = await fetch(`${settingsUrl}?v=${timestamp}`);

  if(!response.ok) {
    throw new Error(`Failed to load settings: ${response.status}`);
  }

  settings = await response.json() as SettingsType;

  return settings;
}

export const setSettings = async <T extends keyof SettingsType, K extends typeof settings[T]>(key: T, data: K) => {
  if(!settings) {
    return alert('Данные о настройках неизвестны системе');
  }

  settings[key] = data;

  const response = await fetch(`${baseUrl}/api/update`, {
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings)
  });

  if(!response.ok) {
    throw new Error(`Failed to update settings: ${response.status}`);
  }

  const saved = await response.json();
  if (saved !== true) throw new Error('Не удалось сохранить настройки');
  return saved;
}

export const checkTokenValidation = async (tokenPayload: string): Promise<boolean> => {
  const response = await fetch(`${baseUrl}/api/token`, { headers: { Authorization: `Bearer ${tokenPayload}` } });

  if(!response.ok) {
    return false;
  }

  const result = await response.json();

  if(!!result.isTokenValid) {
    token = tokenPayload;
    sessionStorage.setItem('razuvaev-admin-token', token);
  }

  return !!result.isTokenValid;
};

export const restoreToken = async (): Promise<boolean> => {
  if(token) return true;
  const storedToken = sessionStorage.getItem('razuvaev-admin-token');
  return storedToken ? checkTokenValidation(storedToken) : false;
};
