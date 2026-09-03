export type Social = "email" | "linkedin" | "telegram" | "medium" | "dribble" | "behance" | "facebook";

export interface SettingsType {
  languages: {
    name: string;
    iso: string;
  }[];
  biography: {
    iso: string;
    text: string;
    contacts: {
      type: Social;
      link: string;
      visible: boolean;
    }[];
    feed: {
      image: string;
      text: string;
      link: string;
    }[];
  }[];
  projects: {
    iso: string;
    items: {
      rules: {
        nda: boolean;
        details: boolean;
        syncMedia?: boolean;
      };
      info: {
        title: string;
        year: string;
        link: string;
        images: { link: string }[];
      };
      details: {
        theme: {
          background: string;
          textColor: string;
        };
        content: {
          title: string;
          text: string;
        }[];
      }
    }[];
  }[];
}

let settings: SettingsType;
export let token: string;
const settingsUrl = import.meta.env.VITE_SETTINGS_URL || 'https://razuvaev-admin-ng.website.yandexcloud.net/settings.json';
const baseUrl = (import.meta.env.VITE_API_URL || 'https://bbafo00lvo6me2t4idr8.containers.yandexcloud.net').replace(/\/$/, '');
const mediaBaseUrl = (import.meta.env.VITE_MEDIA_BASE_URL || `${baseUrl}/api`).replace(/\/$/, '');

export const resolveMediaUrl = (link: string): string => {
  if(link.startsWith('/media/')) {
    return `${mediaBaseUrl}${link}`;
  }

  return link;
}

export const uploadMedia = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${baseUrl}/api/media?token=${token}`, {
    method: 'POST',
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

  const response = await fetch(`${baseUrl}/api/update?token=${token}`, {
    method: "PUT",
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings)
  });

  if(!response.ok) {
    throw new Error(`Failed to update settings: ${response.status}`);
  }

  return response.json();
}

export const checkTokenValidation = async (tokenPayload: string): Promise<boolean> => {
  const response = await fetch(`${baseUrl}/api/token?token=${tokenPayload}`);

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
