# ROPES

**Ranger Operations Platform for Enarah Services**

ROPES is a multi-organisation operations platform for Enarah and partner ranger organisations. It is intended to bring together trips, vehicles, ranger operations, projects, reporting, compliance, people, and Fulcrum field data into one secure dashboard.

## Current status

This repository now contains the first ROPES application foundation: a
Next.js, TypeScript and Tailwind dashboard shell, placeholder module
navigation, demo-only dashboard content and an initial Prisma data model.

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

## Database setup

ROPES uses Prisma with PostgreSQL for the initial data model.

Create a local environment file from the example:

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env` for your local PostgreSQL database. The
example value is a placeholder only and does not contain real credentials.

Generate the Prisma client:

```bash
npm run db:generate
```

Apply the initial migration to a local development database:

```bash
npm run db:migrate
```

Seed clearly fake demo data:

```bash
npm run db:seed
```

The seed creates fake organisations, users, memberships, roles, projects,
ranger programs, trips, vehicles, bookings, Fulcrum placeholders and audit
logs. It does not create authentication accounts, store Fulcrum tokens or call
external APIs.

For deployment-style environments, use:

```bash
npm run db:deploy
```

## App foundation

The current app includes:

- Next.js App Router project files
- TypeScript configuration
- Tailwind configuration with ROPES/Enarah colours
- Mobile-friendly dashboard layout
- Navigation for all core ROPES modules
- Demo organisation switcher with organisation-scoped mock data views
- Placeholder summary cards and module panels using clearly fake demo content

This milestone intentionally does not include authentication, real
organisation switching, Fulcrum API connections, API keys or external service
credentials.

## Build principles

- Organisation-scoped data from day one
- No secrets committed to the repo
- Small reviewable pull requests
- Mobile-friendly field operations UI
- Demo data clearly marked as fake
- External-server deployable architecture
