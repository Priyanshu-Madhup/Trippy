/**
 * Verifies the Supabase schema, RLS and storage bucket using only the public
 * anon key from .env (no secrets). Run: npm run db:check
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key || key.startsWith('your-')) {
  console.error('✗ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set in .env')
  process.exit(1)
}
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
let failed = 0
const ok = (msg) => console.log(`✓ ${msg}`)
const bad = (msg) => {
  failed++
  console.log(`✗ ${msg}`)
}

for (const table of ['profiles', 'trips', 'tickets', 'trip_places']) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers })
  if (res.status === 404) bad(`table ${table} is missing — run supabase/migrations/*.sql`)
  else if (res.status === 401 || res.status === 403) ok(`table ${table} exists and is closed to anonymous users`)
  else if (res.ok && (await res.json()).length === 0) ok(`table ${table} exists (anonymous read returns nothing)`)
  else bad(`table ${table}: unexpected response ${res.status} — anonymous users can read rows!`)
}

// RLS: an anonymous insert must be rejected.
const insert = await fetch(`${url}/rest/v1/trips`, { method: 'POST', headers, body: JSON.stringify({ name: 'rls-probe' }) })
if (insert.status === 401 || insert.status === 403) ok('RLS blocks anonymous writes to trips')
else if (insert.status === 404) bad('cannot test RLS — trips table missing')
else bad(`RLS check: anonymous insert returned ${insert.status} (expected 401/403)`)

// Storage: anonymous upload into the private bucket must be rejected.
const upload = await fetch(`${url}/storage/v1/object/tickets/rls-probe/probe.txt`, {
  method: 'POST',
  headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'text/plain' },
  body: 'probe',
})
const body = await upload.text()
if (/bucket not found/i.test(body)) bad('storage bucket "tickets" is missing — run the migration')
else if (upload.status >= 400) ok('storage bucket "tickets" exists and rejects anonymous uploads')
else bad('storage accepted an anonymous upload — check storage policies!')

console.log(failed ? `\n${failed} check(s) failed.` : '\nSupabase is ready.')
process.exit(failed ? 1 : 0)
