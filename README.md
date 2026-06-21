# ROPES

**Ranger Operations Platform for Enarah Services**

ROPES is a multi-organisation operations platform for Enarah and partner ranger organisations. It is intended to bring together trips, vehicles, ranger operations, projects, reporting, compliance, people, and Fulcrum field data into one secure dashboard.

## Current status

This repository now contains the first ROPES application foundation: a
Next.js, TypeScript and Tailwind dashboard shell with placeholder module
navigation and demo-only dashboard content.

The first implementation stream will establish:

- product and architecture documentation
- multi-tenant data model
- role-based permissions
- dashboard shell
- demo organisation and demo data
- trips and vehicles MVP
- Fulcrum integration module shell
- AI assistant design for Fulcrum and ROPES data

## Local setup

Requirements:

- Node.js 20 or newer
- npm

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Open http://localhost:3000 to view the dashboard shell.

Useful checks:

```bash
npm run typecheck
npm run build
npm run lint
```

## App foundation

The current app includes:

- Next.js App Router project files
- TypeScript configuration
- Tailwind configuration with ROPES/Enarah colours
- Mobile-friendly dashboard layout
- Navigation for all core ROPES modules
- Placeholder summary cards and module panels using clearly fake demo content

This milestone intentionally does not include authentication, real
organisation switching, Fulcrum API connections, database models, API keys or
external service credentials.

## Build principles

- Organisation-scoped data from day one
- No secrets committed to the repo
- Small reviewable pull requests
- Mobile-friendly field operations UI
- Demo data clearly marked as fake
- External-server deployable architecture
