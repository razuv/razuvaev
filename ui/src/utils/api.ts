import { SettingsType } from "../types/api.types";

let data: SettingsType;
let language: SettingsType['languages'][number]['iso'] = localStorage.getItem('_razuvaev_language') || 'en';
const settingsUrl = import.meta.env.VITE_SETTINGS_URL || 'https://razuvaev-admin-ng.website.yandexcloud.net/settings.json';
const mediaBaseUrl = (import.meta.env.VITE_MEDIA_BASE_URL || 'https://bbafo00lvo6me2t4idr8.containers.yandexcloud.net/api').replace(/\/$/, '');

export const fetchData = async (): Promise<SettingsType> => {
  const timestamp = new Date().getTime();
  const timestampHours = Math.floor(timestamp / (3600 * 1000));

  const response = await fetch(`${settingsUrl}?v=${timestampHours}`);

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
    return `${mediaBaseUrl}${link}`;
  }

  return link;
}

export const detectContentByLink = (link: string): 'image' | 'video' => {
  const imagesMap = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
  let contentType: 'image' | 'video' = 'video';

  imagesMap.forEach(image_type => {
    if(link.includes(`.${image_type}`)) {
      contentType = 'image';
    };
  });

  return contentType;
};
