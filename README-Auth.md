# Microsoft OAuth + accounts (branch `next`)

## 1. Azure app registration (do this first)

1. Azure Portal → **Microsoft Entra ID → App registrations → New registration**.
2. Name: `SJBquest`. Supported account types: **Personal Microsoft accounts + work/school accounts** (this uses the `/common` endpoint).
3. Platform: **Single-page application** (PKCE — no client secret needed).
4. Redirect URIs:
   - `https://geloofsquest.pimpelmoes.workers.dev/auth/callback`
   - `https://quest.sjbijbel.app/auth/callback`
5. Copy the **Application (client) ID**.

## 2. Configure the Worker

Replace the placeholder in `wrangler.jsonc`:

```jsonc
"MICROSOFT_CLIENT_ID": "<your client id>",
"ADMIN_EMAILS": "pimwillekens@gmail.com"
```

Set a session signing secret:

```sh
npx wrangler secret put SESSION_SECRET
```

## 3. Deploy

```sh
npx wrangler deploy
```

D1 database `geloofsquest` (`4a55ef0d-2546-42aa-8a02-43b474de6d6f`) already contains the 100 seeded questions from `questionsdata.json`. Schema: `schema.sql`; seed: `seed.sql`.

## 4. What exists

- `/auth/login` → Microsoft sign-in (PKCE), `/auth/callback`, `/auth/logout`
- `/api/session` → current user
- `/api/progress` → load/save XP, correct, combo, medals (signed in only)
- `/api/questions` → public read, admin write
- `/api/export` → admin JSON download
- `/admin.html` → admin dashboard (question CRUD)

Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax` and uses `Domain=.sjbijbel.app` on the real domains, so accounts can be shared by `quest.sjbijbel.app` and `sjbijbel.app/quest`.

## 5. Still to do

- Route `sjbijbel.app/auth/*` and `sjbijbel.app/api/*` to this Worker, and add the sign-in button to the `sjbijbel/quest` copy, so `sjbijbel.app/quest` uses the same accounts.
