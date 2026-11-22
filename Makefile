.PHONY: install install-backend install-frontend migrate backend frontend dev test test-backend test-frontend

PYTHON ?= python

install: install-backend install-frontend

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