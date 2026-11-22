# vibe-coding-touch-typing-tutor

Пример проекта для курса Otus. Тренажёр слепой печати.

## Архитектура

- **Frontend:** Next.js 15, TypeScript, Tailwind, Auth.js
- **Backend:** Django 5 + Django REST Framework (SQLite)
- **BFF:** маршруты `/api/*` в Next.js проксируют запросы к Django

## Быстрый старт (локально)

```bash
cp .env.example .env
make install
make migrate
```

В двух терминалах:

```bash
make backend   # http://127.0.0.1:8000
make frontend  # http://localhost:3000
```

Или отдельно: `make test-backend`, `make test-frontend`, `make test`.

## Переменные окружения

| Переменная | Где | Описание |
|------------|-----|----------|
| `AUTH_SECRET` | Next | Секрет JWT Auth.js |
| `DJANGO_API_URL` | Next | URL Django API |
| `INTERNAL_API_SECRET` | Next + Django | Общий секрет BFF ↔ API |
| `ADMIN_EMAIL` | Next + Django | Email с ролью ADMIN |
| `DJANGO_SECRET_KEY` | Django | Секрет Django |

Полный список — в [`.env.example`](.env.example).

## Настройки тренажёра

- [`config/trainer.ts`](config/trainer.ts) — длина заданий
- [`alphabet/main.txt`](alphabet/main.txt) — символы обучения

## Тесты

| Слой | Команда | Покрытие |
|------|---------|----------|
| Backend | `make test-backend` | **100%** (`pytest-cov`) |
| Frontend | `make test-frontend` | Vitest (как в проекте) |

## Django API (v1)

| Метод | Путь | Доступ |
|-------|------|--------|
| POST | `/api/v1/auth/register/` | public |
| POST | `/api/v1/auth/login/` | public |
| GET | `/api/v1/auth/me/` | internal |
| GET/PATCH | `/api/v1/progress/` | internal |
| POST | `/api/v1/analytics/events/` | internal |
| POST | `/api/v1/waitlist/` | internal |
| GET | `/api/v1/admin/metrics/` | internal + ADMIN |

Internal-запросы: заголовки `Authorization: Bearer <INTERNAL_API_SECRET>` и `X-User-Id`.