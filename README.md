# demo-m10

Demo event website for testing chatbot widgets (Billie, Tidio, etc.).

- `/` — demo event site (placeholder brand "Liveworks")
- `/admin` — password-only admin page to paste, save, show or hide the chat widget embed code
- `/api/embed` — Vercel function that stores the embed code in Neon Postgres

## Deploy on Vercel

1. Import this repo into Vercel (no framework, no build command needed).
2. Add two environment variables in **Project → Settings → Environment Variables**:
   - `DATABASE_URL` — a Neon Postgres connection string (the table is created automatically on first use)
   - `ADMIN_PASSWORD` — the password for `/admin`
3. Redeploy so the variables take effect.

## Using it

1. Go to `/admin` and log in with the admin password.
2. Paste the full widget snippet (including `<script>` tags), tick **Show the widget on the site**, and click **Save**.
3. Open or refresh the site — the widget loads on every visit.

If the widget doesn't show, add the site's Vercel URL to the chatbot provider's allowed domains.
