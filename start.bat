@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  Touch Typing Tutor - запуск проекта
echo  ===================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [Ошибка] Node.js не найден. Установите: https://nodejs.org/
  goto :finish
)

where python >nul 2>&1
if errorlevel 1 (
  echo [Ошибка] Python не найден. Установите Python 3.12+
  goto :finish
)

if not exist ".env" (
  if exist ".env.example" (
    echo [1/5] Создаю .env из .env.example...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo [Ошибка] Не найден .env.example
    goto :finish
  )
) else (
  echo [1/5] .env найден
)

if not exist "node_modules\" (
  echo [2/5] Устанавливаю npm-зависимости...
  call npm install
  if errorlevel 1 goto :finish
) else (
  echo [2/5] npm-зависимости уже установлены
)

echo [3/5] Устанавливаю Python-зависимости...
python -m pip install -r backend\requirements.txt
if errorlevel 1 goto :finish

echo [4/5] Применяю миграции Django...
pushd backend
python manage.py migrate
if errorlevel 1 (
  popd
  goto :finish
)
popd

echo [5/5] Запускаю backend и frontend...
start "Django Backend" cmd /k "cd /d %~dp0backend && python manage.py runserver"

echo.
echo  Frontend: http://localhost:3000
echo  Backend:  http://127.0.0.1:8000
echo  Остановка frontend: Ctrl+C
echo.

call npm run dev

:finish
echo.
pause