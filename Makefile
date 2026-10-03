.PHONY: dev build clean install

install:
	npm ci

dev:
	npm run dev

build:
	npm run build



clean:
	rm -rf node_modules dist .next .turbo
