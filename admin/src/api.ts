import { normalizeProjectCategories } from '../../shared/project-categories';
import type { SettingsType } from '../../shared/settings.types';
export type { SettingsType, TvTrack, Social, CaseBlock, CaseBlockType, HeroProofGroup } from '../../shared/settings.types';

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

export const uploadMedia = (file: File, onProgress?: (percent:number)=>void): Promise<string> => new Promise((resolve,reject) => {
  if (file.size > 100 * 1024 * 1024) { reject(new Error('Файл больше 100 МБ')); return; }
  if (!/^(image\/(png|jpeg|gif|webp|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/.test(file.type)) { reject(new Error('Неподдерживаемый формат файла')); return; }
  const request = new XMLHttpRequest();
  request.open('POST', `${baseUrl}/api/media`);
  request.setRequestHeader('Authorization', `Bearer ${token}`);
  request.timeout = 120000;
  request.upload.onprogress = event => { if(event.lengthComputable) onProgress?.(Math.round(event.loaded/event.total*100)); };
  request.onerror = () => reject(new Error('Соединение прервано. Повторите загрузку.'));
  request.ontimeout = () => reject(new Error('Время загрузки истекло. Повторите попытку.'));
  request.onload = () => {
    try { const result = JSON.parse(request.responseText); if(request.status >= 200 && request.status < 300 && result.link) resolve(result.link); else reject(new Error(result.message || `Ошибка загрузки (${request.status})`)); }
    catch { reject(new Error('Сервер вернул некорректный ответ')); }
  };
  const body = new FormData(); body.append('file',file); request.send(body);
});

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

export const saveTv = async (tracks: NonNullable<SettingsType['tv']>) => {
  const saved = await putJson('/api/tv', tracks);
  if (saved !== true) throw new Error('Не удалось сохранить TV');
};

export const getTvMetadata = async (url: string): Promise<Partial<NonNullable<SettingsType['tv']>[number]>> => {
  const response = await fetch(`${baseUrl}/api/tv/metadata?url=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Не удалось получить данные YouTube');
  return result;
};

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

export interface ProjectWorkspace {
  groups: SettingsType['projects'];
  published: SettingsType['projects'];
  revision: number;
  updatedAt: string;
}
export const getProjectWorkspace = async (): Promise<ProjectWorkspace> => {
  const response = await fetch(`${baseUrl}/api/project-workspace`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить черновики. Проверьте доступность обновлённого API.');
  return response.json();
};
export const saveProjectWorkspace = async (groups: SettingsType['projects'], revision: number, publish = false): Promise<{revision: number; updatedAt: string}> => {
  const response = await fetch(`${baseUrl}/api/project-workspace`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ groups, revision, publish }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Не удалось сохранить. Изменения остаются в редакторе.');
  }
  return response.json();
};

export interface ChangeHistoryEntry {
  id: number;
  scope: string;
  action: string;
  createdAt: string;
}

export const getChangeHistory = async (): Promise<ChangeHistoryEntry[]> => {
  const response = await fetch(`${baseUrl}/api/change-history`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!response.ok) throw new Error('Не удалось загрузить историю изменений');
  return response.json();
};

export const restoreChange = async (id: number): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/change-history/${id}/restore`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Не удалось восстановить версию');
  }
  await getSettings(true);
};
