# Razuvaev Portfolio

Монорепозиторий персонального портфолио:

- `ui` — публичный сайт на Vue 3 и Vite;
- `admin` — панель управления контентом на Vue 3 и Vuetify;
- `api` — NestJS API, публикующее настройки в Yandex Object Storage.

## Требования

- Node.js 20 LTS (версия зафиксирована в `.nvmrc`);
- npm 10;
- Docker — только для локального запуска API в контейнере.

## Установка и сборка

```bash
nvm use
npm run install:all
npm run build
```

Для запуска отдельного приложения:

```bash
npm run dev:ui
npm run dev:admin
npm run dev:api
```

Новые внешние изображения из `api/settings/settings.json` можно перенести в локальное хранилище командой `npm run media:localize`. Vimeo-ссылки миграция не изменяет.

UI обычно доступен на `http://localhost:5173`, а admin — на следующем свободном порту Vite. API слушает `http://localhost:3000/api`.

## Конфигурация

Скопируйте `.env.example` в `.env` внутри нужного приложения. Значения `VITE_*` в UI и admin имеют текущие production-адреса по умолчанию, поэтому обязательны только для другого окружения. Для запуска API нужно заполнить все значения из `api/.env.example`.
