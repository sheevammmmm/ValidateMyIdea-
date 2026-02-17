# Validate My Idea

Next.js 14 starter for validating startup ideas with Supabase auth/data and API-driven research workflows.

## Stack

- Next.js 14 (App Router + TypeScript)
- Tailwind CSS + shadcn/ui style components
- Supabase (PostgreSQL + Auth)
- Edge API routes for validation workflows

## Project Structure

```text
/app
  /api
    /health/route.ts
    /validate/route.ts
  /dashboard/page.tsx
  /validate/page.tsx
  /layout.tsx
  /page.tsx
/components
  /landing
  /ui
/lib
  /supabase
    client.ts
    server.ts
  utils.ts
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

## Required Environment Variables

See `.env.example` for the full list.
At minimum for Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## API Endpoints

- `GET /api/health`
- `POST /api/validate`
