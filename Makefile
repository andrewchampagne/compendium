.DEFAULT_GOAL := start

.PHONY: start dev build

# Electron also starts and stops the FastAPI backend.
start:
	npm run dev

dev: start

build:
	npm run build
