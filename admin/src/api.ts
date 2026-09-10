import { normalizeProjectCategories } from '../../shared/project-categories';
import type { SettingsType } from '../../shared/settings.types';
export type { SettingsType, Social, CaseBlock, CaseBlockType, HeroProofGroup } from '../../shared/settings.types';

let settings: SettingsType;
export let token: string;
const settingsUrl = import.meta.env.DEV
  ? '/__settings'
  : import.meta.env.VITE_SETTINGS_URL || 'https://pfapi.razuvaev.tv/api/settings';
const baseUrl = (import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || 'https://pfapi.razuvaev.tv')).replace(/\/$/, '');
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
  const response = await fetch(`${settingsUrl}?v=${timestamp}`, { cache: 'no-store' });

  if(!response.ok) {
    throw new Error(`Failed to load settings: ${response.status}`);
  }

  settings = await response.json() as SettingsType;
  normalizeProjectCategories(settings);

  return settings;
}

const putJson = async (path: string, body: unknown) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if(!response.ok) {
    throw new Error(`Failed to update settings: ${response.status}`);
  }

  return response.json();
}

export const saveLanguages = async (languages: SettingsType['languages']) => {
  const saved = await putJson('/api/languages', languages);
  if (saved !== true) throw new Error('Не удалось сохранить настройки');
  return saved;
}

export const saveBiography = async (biography: SettingsType['biography'][number]) => {
  const saved = await putJson(`/api/biography/${encodeURIComponent(biography.iso)}`, biography);
  if (saved !== true) throw new Error('Не удалось сохранить настройки');
  return saved;
}

export const saveProjects = async (projects: SettingsType['projects'][number]) => {
  const saved = await putJson(`/api/projects/${encodeURIComponent(projects.iso)}`, projects);
  if (saved !== true) throw new Error('Не удалось сохранить настройки');
  return saved;
}

export const checkTokenValidation = async (tokenPayload: string): Promise<boolean> => {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/token`, {
      headers: { Authorization: `Bearer ${tokenPayload.trim()}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new Error('Не удалось подключиться к API. Проверьте, что сервер запущен.');
  }

  if(response.status === 401 || response.status === 403) return false;
  if(!response.ok) throw new Error(`API недоступен (HTTP ${response.status}).`);

  const result = await response.json();

  if(!!result.isTokenValid) {
    token = tokenPayload.trim();
    sessionStorage.setItem('razuvaev-admin-token', token);
  }

  return !!result.isTokenValid;
};

export const restoreToken = async (): Promise<boolean> => {
  if(token) return true;
  const storedToken = sessionStorage.getItem('razuvaev-admin-token');
  return storedToken ? checkTokenValidation(storedToken) : false;
};
