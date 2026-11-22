# AGENTS.md

Тренажёр слепой печати. Общие правила для всех агентов этого репозитория.

## Архитектура

- Frontend: Next.js 15, TypeScript, Tailwind, Auth.js. Страницы в `app/`, UI в `components/`, общая логика в `lib/`, типы в `types/`.
- BFF: маршруты `app/api/*/route.ts` под префиксом `/api/*`. Браузер говорит только с Next.js.
- Backend: Django 5 + Django REST Framework, SQLite. API с префиксом `/api/v1/`. Приложения: `accounts`, `training`, `analytics`, `core`.
- Клиент Django: `lib/django-client.ts`.
  - Публичные вызовы (`djangoPublicFetch`): `POST /api/v1/auth/register/`, `POST /api/v1/auth/login/`. Секрета нет.
  - Пользовательские вызовы (`djangoUserFetch`): заголовки `Authorization: Bearer <INTERNAL_API_SECRET>` и `X-User-Id`. Секрет общий для Next и Django (`INTERNAL_API_SECRET`). Django проверяет его в `backend/core/authentication.py` (`InternalServiceAuthentication`) и поднимает пользователя по `X-User-Id`.
- Сессия: Auth.js JWT. В токене и сессии лежат `id` и `role` (`USER` | `ADMIN`, `types/role.ts`). BFF берёт `session.user.id` и передаёт его как `X-User-Id`.
- Роль `ADMIN` для `GET /api/v1/admin/metrics/` задаётся `ADMIN_EMAIL` и проверяется `IsAdminRole`.

### Контракт сейчас

- BFF `POST /api/register` → Django register.
- BFF `GET` и `PATCH /api/progress` → `/api/v1/progress/`.
- BFF `POST /api/analytics/events` → `/api/v1/analytics/events/`.
- BFF `POST /api/waitlist` → `/api/v1/waitlist/`.
- BFF `GET /api/admin/metrics` → `/api/v1/admin/metrics/`.
- Django `GET /api/v1/auth/me/` — внутренний, через `djangoUserFetch`.
- Django login — публичный, его вызывает провайдер Credentials в `lib/auth.ts`.

Новый эндпоинт проходит оба слоя: сериализатор и view в Django, затем BFF-роут, затем тип в `types/` или рядом с `lib/server-api.ts`. Внутренний Django-маршрут не открывается браузеру напрямую.

## Команды

Из корня репозитория, после `cp .env.example .env`:

- `make install` — pip-зависимости backend и `npm install`
- `make migrate` — миграции Django
- `make backend` — миграции и `runserver` на `127.0.0.1:8000`
- `make frontend` — `npm run dev` на `localhost:3000`
- `make test-backend` — pytest в `backend/`
- `make test-frontend` — `npm test` (Vitest)
- `make test` — оба набора

`make test-backend` обязан завершаться с кодом 0. Это и есть проверка покрытия.

## Покрытие backend: 100%

`backend/pytest.ini` содержит `--cov-fail-under=100`. Любое изменение `backend/` сохраняет 100% покрытия. Нельзя понижать порог, отключать `pytest-cov` и добавлять новые модули в `omit` в `backend/.coveragerc`, чтобы спрятать непокрытый код. Уже исключены миграции, тесты, `manage.py`, `config/wsgi.py`, `config/asgi.py`.

Новая ветка кода, ошибка и отказ авторизации получают тест в существующем стиле `backend/**/tests/test_*.py`.

## Спецификации

Перед новой фичей субагент `architect` пишет `docs/specs/<feature-name>.md`. Дальше по этой спецификации работают `backend-dev` и `frontend-dev` (их можно запускать параллельно), затем `qa-reviewer`. Пока QA не подтвердил `make test-backend` и `make test-frontend`, фича не готова.

- `architect` только пишет и правит `docs/specs/`. Рабочий код и тесты не меняет.
- `backend-dev` реализует Django строго в `backend/`, без тестов, фронтенда и спецификации. Internal-эндпоинт проверяет `Authorization: Bearer <INTERNAL_API_SECRET>` и `X-User-Id`.
- `frontend-dev` обновляет `types/`, BFF в `app/api/*`, `lib/` и UI. Для internal-вызова берёт `session.user.id` и `djangoUserFetch`. `backend/` и спецификацию не меняет.
- `qa-reviewer` сверяет код с контрактом, дописывает pytest и Vitest и требует 100% покрытия backend. Бизнес-логику меняет только точечно, если код противоречит спецификации.
