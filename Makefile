.PHONY: install install-backend install-frontend migrate backend frontend dev test test-backend test-frontend lint-backend

PYTHON ?= python

install: install-backend install-frontend
	git config core.hooksPath .githooks

install-backend:
	cd backend && $(PYTHON) -m pip install -r requirements.txt

install-frontend:
	npm install

migrate:
	cd backend && $(PYTHON) manage.py migrate

backend: migrate
	cd backend && $(PYTHON) manage.py runserver

frontend:
	npm run dev

dev:
	@echo Start backend and frontend in separate terminals:
	@echo   make backend
	@echo   make frontend

test: test-backend test-frontend

test-backend:
	cd backend && $(PYTHON) -m pytest

test-frontend:
	npm run test

lint-backend:
	cd backend && $(PYTHON) -m ruff check .