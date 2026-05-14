# Intkhab CRM — Real Estate Management System

A Next.js 15 CRM for real estate teams. Built with Turso (libSQL) for persistent cloud database — works perfectly on Vercel.

## Login Credentials

| Role  | Email           | Password   |
|-------|-----------------|------------|
| Admin | admin@crm.com   | admin123   |
| Agent | sarah@crm.com   | agent123   |
| Agent | james@crm.com   | agent123   |

---

## 🚀 Deploy to Vercel (Step by Step)

### Step 1: Create Turso Database (Free)

1. Go to [turso.tech](https://turso.tech) and sign up (free)
2. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
3. Login and create a database:
   ```bash
   turso auth login
   turso db create intkhab-crm
   turso db show intkhab-crm   # copy the URL
   turso db tokens create intkhab-crm  # copy the token
   ```

### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/intkhab-crm.git
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. In **Environment Variables**, add these 3 variables:

   | Name | Value |
   |------|-------|
   | `AUTH_SECRET` | Run `openssl rand -base64 32` in terminal to generate |
   | `TURSO_DATABASE_URL` | `libsql://your-db-name-your-org.turso.io` |
   | `TURSO_AUTH_TOKEN` | Your Turso auth token |

3. Click **Deploy** ✅

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local — for local dev you can leave TURSO vars empty
# It will automatically use a local SQLite file at data/crm.db

npm run dev
# Open http://localhost:3000
```

---

## Why This Works on Vercel

Previously the app used a JSON file (`data/db.json`) for storage. **Vercel's filesystem is read-only and not shared between serverless functions**, so data would reset on every request.

Now the app uses **Turso** — a cloud-hosted SQLite database that persists across all requests and deployments. The `@libsql/client` library connects to Turso in production and falls back to a local SQLite file in development.

## Tech Stack

- **Next.js 15** — App Router, Server Components
- **NextAuth v5** — Authentication
- **Turso (libSQL)** — Persistent SQLite database (cloud)
- **Tailwind CSS** — Styling
- **Recharts** — Charts & Analytics
