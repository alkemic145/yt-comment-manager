Triage is a YouTube comment-management dashboard. It connects a creator's
YouTube channel, stores comment threads in Supabase, and can generate reply
drafts with Gemini.

## Setup

1. Install dependencies with `npm install`.
2. Create a Supabase project, then apply the SQL files in
   `supabase/migrations/` in filename order.
3. Copy `.env.local.example` to `.env.local` and fill in the values.
4. In Google Cloud, configure an OAuth web-client redirect URI matching
   `GOOGLE_REDIRECT_URI` (normally `http://localhost:3000/api/auth/google/callback`).
   Enable the YouTube Data API v3.
5. Create a Gemini API key with access to the configured model.

The application uses the Supabase service-role key only on the server. Never
expose it to the browser or commit it to source control.

## Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

Run `npm run lint` to check the codebase.

## Required environment variables

See `.env.local.example` for the full variable list and expected format.
