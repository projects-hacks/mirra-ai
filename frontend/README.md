This is the Mirra frontend built with [Next.js](https://nextjs.org).

## Getting Started

1. Copy the environment template and fill in your local values:

```bash
cp .env.example .env.local
```

2. For local development, run the app on one stable origin and whitelist the matching callback URL in Supabase Auth:

- local app URL: `http://localhost:3000` or `http://localhost:3001`
- callback URL: `http://localhost:<port>/auth/callback`

3. In production, set one canonical site URL:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

Supabase should whitelist the exact same callback:

```text
https://your-production-domain.com/auth/callback
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Auth Redirect Policy

- Production uses `NEXT_PUBLIC_SITE_URL` as the canonical OAuth redirect base.
- Local development falls back to the active localhost origin.
- Do not mix origins during one OAuth flow. If sign-in starts on `localhost:3001`, the callback must also return to `localhost:3001`.
