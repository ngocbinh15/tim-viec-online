# TimViecOnline Frontend

Next.js 16 / React 19 / TypeScript / Tailwind workspace. **Current state:** only the default starter landing page exists; SRS pages and API flows (job search/detail, auth, candidate, employer, admin, chat, notifications) are not implemented yet.

## Local setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the Laravel API base, for example `http://127.0.0.1:8000/api`, when implementing pages that call the backend. Keep tokens in an appropriate client-side auth strategy; never place server secrets in `NEXT_PUBLIC_*` variables.

## Checks

```powershell
npm run lint
npm run build
```

The production build uses system font fallbacks and does not require Google Fonts network access.
