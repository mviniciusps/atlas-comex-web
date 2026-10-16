# Repository Guidelines

## Project Structure & Module Organization

This repository is an Angular 19 standalone application. Application code lives in `src/app`; global styles are in `src/styles.scss`, the HTML shell is `src/index.html`, and static assets belong in `public/`. Feature code is grouped under `src/app/features/`. Keep each feature's pages, models, and services in its own folder: for example, `features/duimp/models` and `features/duimp/services`. Shared routing and app configuration live in `app.routes.ts` and `app.config.ts`.

## Build, Test, and Development Commands

Run commands from the repository root after installing dependencies with `npm install`:

- `npm start` — starts the Angular development server at `http://localhost:4200/`.
- `npm run build` — creates a production build in `dist/`.
- `npm test` — runs the Angular CLI test runner (Jasmine/Karma).
- `npm run watch` — rebuilds continuously with the development configuration.

## Coding Style & Naming Conventions

Use two spaces for indentation and follow the existing TypeScript and SCSS style. Name folders and files in kebab case, such as `detalhe-processo.component.ts`; use PascalCase for classes and interfaces, and camelCase for properties and methods. Keep components focused on presentation and user interaction, place feature data types in `models/`, and keep reusable business operations in that feature's `services/`. The UI is written in Brazilian Portuguese; preserve its established terminology and spelling. No dedicated formatter or linter script is currently defined in `package.json`.

## Testing Guidelines

The project is configured for Angular CLI tests with Jasmine and Karma. Add tests beside the implementation using the `*.spec.ts` naming pattern, such as `duimp.service.spec.ts`, and run them with `npm test`. There are currently no committed spec files, so add focused tests for new behavior, especially process/DUIMP state updates and Excel import validation.

## Commit & Pull Request Guidelines

Recent commits use short Portuguese imperative descriptions, for example `Adiciona cadastro de itens da DUIMP` and `Corrige navegação das abas do processo`. Follow that pattern: describe one change clearly and keep each commit focused. Pull requests should summarize behavior changes, list validation performed, link related work when applicable, and include screenshots for visible UI changes.

## Configuration & Data

The current frontend keeps process and DUIMP data in memory. Do not commit credentials, private certificates, or environment-specific secrets. When API configuration is introduced, use Angular environment configuration and document required local setup without exposing secret values.
