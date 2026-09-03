# Portfolio API

NestJS API проверяет административный токен и загружает обновлённый `settings.json` в Yandex Object Storage.

Локальный `GET /api/settings` отдаёт данные портфолио, `GET /api/media/:filename` — локализованные медиафайлы. Админка отправляет новые изображения и видео в `POST /api/media`; при доступном Object Storage возвращается постоянная S3-ссылка, иначе файл остаётся доступен через локальный API.

```bash
cp .env.example .env
npm ci
npm run start:dev
```

Переменные окружения:

- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — доступ к Object Storage;
- `ADMIN_TOKEN` — токен админки;
- `TG_BOT_ID`, `TG_GROUP_ID` — бот и чат для резервной отправки настроек;
- `CORS_ORIGINS` — разрешённые origins через запятую;
- `PORT` — порт API, по умолчанию `3000`.

Docker-образ собирается командой `npm run docker:build`. Для публикации задайте полный адрес образа:

```bash
DOCKER_IMAGE=registry.example.com/razuvaev-api:latest npm run deploy
```
