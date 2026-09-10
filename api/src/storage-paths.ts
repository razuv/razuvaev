import { isAbsolute, join, resolve } from 'node:path';

export const getSettingsPath = (): string => {
  const configuredPath = process.env.SETTINGS_PATH?.trim();
  if (!configuredPath) return join(process.cwd(), 'settings', 'settings.json');
  return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
};

export const getSettingsDbPath = (): string => {
  const configuredPath = process.env.SETTINGS_DB_PATH?.trim();
  if (!configuredPath) return join(process.cwd(), 'settings', 'settings.db');
  return isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);
};