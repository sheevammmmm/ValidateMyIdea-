# Validate My Idea SaaS Starter

A production-oriented starter for building an idea-validation SaaS with:

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Prisma ORM (PostgreSQL)
- Starter API routes and product scaffolding

## 1) Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database

## 2) Setup

```bash
npm install
cp .env.example .env
```

Update `.env` with your database URL.

## 3) Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## 4) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## 5) Included pages

- `/` Marketing page
- `/dashboard` Product dashboard scaffold
- `/api/health` Health endpoint
- `/api/waitlist` Waitlist API endpoint

## 6) Suggested next milestones

1. Add authentication (Clerk, Auth.js, or Supabase Auth).
2. Build idea submission and experiment tracking CRUD.
3. Integrate payments (Stripe) and usage limits.
4. Add onboarding + analytics funnel.
