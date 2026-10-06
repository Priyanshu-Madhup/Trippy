# Trippy

Drop in your tickets and booking confirmations. Trippy reads them with AI and builds your trip for you: flights, hotels, trains, buses, restaurants, activities and travel documents, organised into a timeline with destination photos and provider logos.

**Stack:** React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn-style UI (Radix) · Framer Motion · TanStack Query · React Router · Supabase (Auth, Postgres, Storage, Realtime) · Groq (GPT-OSS-20B and a vision model) · Vercel Functions

---

## How it works

```
Browser                                   Vercel Functions (/api)             External
───────                                   ───────────────────────             ────────
Upload → Supabase Storage (RLS)
PDF  → pdf.js text ─────────────┐
Image / scanned PDF → JPEG ─────┤
                                └──► POST /api/extract ──► Groq vision OCR (images)
                                         │                 GPT-OSS-20B classify
                                         │                 GPT-OSS-20B extract (strict JSON schema)
                                         │                 ground check: drop identifiers not in source
                                     structured JSON
Save to tickets (JSONB + columns) ◄──────┘
GET /api/resolve-logo  ──► airline CDN (IATA) / logo.dev / Google & DuckDuckGo favicons
GET /api/resolve-image ──► Unsplash / Pexels / Google Places / Wikipedia
POST /api/trip-insight ──► GPT-OSS-20B picks the primary destination when bookings disagree
Update trip: destination, dates, cover photo, places
```

* **No invented data.** The model is told to return `null` for anything it can't see. On top of that, the server checks every PNR, flight number, seat and booking reference against the source text and drops any that don't appear in it. A confidence below 0.70 shows "Please verify these details".
* **Nothing is hard-coded.** Providers become domains or IATA codes, and those become logos. Destinations become photos. Results are cached on the row and in the browser. If a lookup fails, the card falls back to a monogram or a gradient, so you never see a broken image.
* **Your edits win.** Summary fields (title, dates, route, provider, reference, notes) are stored as columns and can be edited. The raw AI output stays in `structured_data`.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in the values (see below)
npm run dev            # http://localhost:5173 (also exposed on your LAN for phones)
```

`npm run dev` also serves the `/api` functions through a Vite middleware, so you don't need `vercel dev`.

**Demo mode.** If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` still hold the placeholders, the app runs entirely in the browser (localStorage plus IndexedDB) and starts with sample trips. Any email and password will sign you in.

## Environment variables

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | client | ✅ | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | client | ✅ | The **publishable / anon** key. Never the `sb_secret_…` / service-role key. |
| `GROQ_API_KEY` | server | ✅ | Used only inside `/api/*`. Never exposed to the browser. |
| `GROQ_TEXT_MODEL` | server | – | Default `openai/gpt-oss-20b` |
| `GROQ_VISION_MODEL` | server | – | Default `meta-llama/llama-4-scout-17b-16e-instruct` |
| `UNSPLASH_ACCESS_KEY` | server | – | Better destination photos (Wikipedia is used when unset) |
| `PEXELS_API_KEY` | server | – | Alternative photo source |
| `GOOGLE_PLACES_API_KEY` | server | – | Real hotel photos |
| `LOGO_DEV_TOKEN` | server | – | Higher-quality brand logos (publishable `pk_` token) |

Only variables prefixed with `VITE_` reach the browser bundle. The service-role key is **not** used anywhere.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/migrations/20261006000000_init.sql`](supabase/migrations/20261006000000_init.sql) and click **Run**. Alternatively, run `supabase db push` with the CLI. The migration creates:
   * the tables `profiles`, `trips`, `tickets` and `trip_places`, plus triggers (auto-create profile, `updated_at`)
   * **RLS on every table**: users can only touch rows where `auth.uid() = user_id`, and tickets or places can only be attached to the user's own trips
   * a private **`tickets` storage bucket** (20 MB, PDF and images) whose policies limit each user to `tickets/{their user id}/…`
   * the Realtime publication for `tickets` and `trips`
3. Under **Authentication → URL Configuration**, set the Site URL to your deployed URL and add `http://localhost:5173/**` to Redirect URLs for local development.
4. Copy the project URL and the publishable / anon key into `.env`.

Files are stored at `tickets/{user_id}/{trip_id}/{ticket_id}/{filename}`.

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel. The framework (Vite) is detected automatically, and `vercel.json` sets the build, SPA rewrites, security headers and a 60 s function timeout.
2. Add the environment variables from the table above under **Project → Settings → Environment Variables**.
3. Deploy. The functions in `/api` run on the Node.js runtime using Web-standard `Request`/`Response` handlers.
4. Add the production URL to the Supabase Auth URL configuration.

## Project structure

```
api/                    Vercel functions (server-only secrets live here)
  extract.ts            OCR → classify → extract → ground
  trip-insight.ts       primary-destination decision
  resolve-image.ts      destination / hotel / venue photos
  resolve-logo.ts       airline / platform / operator logos
  _lib/                 groq client, prompts, strict JSON schemas, normalisation, resolvers
src/
  components/           ui · brand · layout · auth · trips · tickets · upload · common
  hooks/                auth, trips, tickets, realtime, upload queue
  services/             backend (supabase | demo) · trips · tickets · ai · resolvers · processing
  pages/  routes/  types/  utils/  lib/  demo/
supabase/migrations/    schema + RLS + storage policies
```

## Scripts

| | |
| --- | --- |
| `npm run dev` | Dev server with API functions, listening on your LAN |
| `npm run build` | Type-check (app, config, API) and production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Type-check only |

## Sample data

**Settings → Sample data → Add sample trips** inserts an Emirates flight booked on MakeMyTrip, a Marriott stay booked on Booking.com, a Eurostar train, a Louvre ticket, a visa PDF, a VRL bus booked on redBus, a dinner reservation and a Shatabdi train. All of these rows are flagged `is_demo = true`, and **Remove sample data** deletes only them. Their images and logos come from the same resolvers that real uploads use.
