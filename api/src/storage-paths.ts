import { isAbsolute, join, resolve } from 'node:path';

export const getSettingsPath = (): string => {
  const configuredPath = process.env.SETTINGS_PATH?.trim();
  if (!configuredPath) return join(process.cwd(), 'settings', 'settings.json');
  return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
};
