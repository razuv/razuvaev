import { SettingsType } from "../types/api.types";

let data: SettingsType;
let language: SettingsType['languages'][number]['iso'] = localStorage.getItem('_razuvaev_language') || 'en';
const settingsUrl = import.meta.env.DEV
  ? '/__settings'
  : import.meta.env.VITE_SETTINGS_URL || 'https://pfapi.razuvaev.tv/api/settings';
const mediaBaseUrl = (import.meta.env.VITE_MEDIA_BASE_URL || 'https://pfapi.razuvaev.tv/api').replace(/\/$/, '');

export const fetchData = async (): Promise<SettingsType> => {
  const timestamp = new Date().getTime();
  const timestampHours = timestamp;

  const response = await fetch(`${settingsUrl}?v=${timestampHours}`, {
    cache: 'no-store',
  });

  if(!response.ok) {
    throw new Error(`Failed to load settings: ${response.status}`);
  }

  data = await response.json();

  if(!data.languages.some(item => item.iso === language) && data.languages[0]) {
    changeLanguage(data.languages[0].iso);
  }
  
  return data;
}

export const getData = (block_name?: 'biography' | 'projects'): SettingsType | SettingsType['biography'][number] | SettingsType['projects'][number] => {
  if(!block_name) {
    return data;
  } else {
    return data[block_name].find(i => i.iso === language) || data[block_name][0];
  }
}

export const changeLanguage = (languagePayload: SettingsType['languages'][number]['iso']) => {
  language = languagePayload;
  localStorage.setItem('_razuvaev_language', language);
}

export const getLanguageIso = () => {
  return language;
}

export const resolveMediaUrl = (link: string): string => {
  if(link.startsWith('/media/')) {
    return import.meta.env.VITE_USE_REMOTE_MEDIA === 'true' ? `${mediaBaseUrl}${link}` : link;
  }

  return link;
}

export const detectContentByLink = (link = ''): 'image' | 'video' =>
  /\.(?:mp4|webm|mov|m4v)(?:[?#]|$)/i.test(link) || /(?:vimeo\.com|youtube\.com|youtu\.be)/i.test(link) ? 'video' : 'image';
