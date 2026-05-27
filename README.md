# HuntDesk

An AI-powered job hunt dashboard built as a personal tool and portfolio project. Track applications, generate cover letters, prep for interviews, and understand what's working — all in one place.

**Live:** [https://ai-job-dashboard-sable.vercel.app/](#)

---

## Features

| Feature | Description |
|---|---|
| **Job tracker** | Log applications, update stages, filter by source and stage |
| **AI field extraction** | Paste a job description and auto-fill title, company, location, salary |
| **Role-fit scoring** | 0–100 score based on your resume and career goals |
| **Cover letter generator** | Tailored cover letters per job + resume combo |
| **Company research** | One-click AI fill of company profiles |
| **Interview prep** | Mock questions and study tips from the job description |
| **Answer bank** | Save and search prepared answers; reuse across applications |
| **Post-interview debrief** | Structured reflection form after every interview |
| **Source analytics** | Charts showing response rates and conversion by job source |
| **Weekly review** | Weekly reflection form with optional AI narrative + next steps |

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Auth:** Firebase Authentication (Google SSO)
- **Database:** Firestore (client + Admin SDK)
- **Storage:** Firebase Storage (resume PDFs)
- **AI:** Anthropic API (`claude-haiku-4-5`) via server-side proxy — user supplies their own key
- **Styling:** Tailwind CSS + Tabler Icons
- **Charts:** Recharts
- **Deployment:** Vercel

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/job-dashboard.git
cd job-dashboard
npm install
```

### 2. Firebase

1. Create a Firebase project with **Authentication** (Google provider), **Firestore**, and **Storage** enabled
2. Generate a service account key for the Admin SDK
3. Copy your web app config

### 3. Environment variables

Create `.env.local`:

```env
# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (service account)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Encryption key for storing Anthropic API keys in Firestore
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_SECRET=
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Add your Anthropic API key

Sign in → **Settings** → paste your [Anthropic API key](https://console.anthropic.com/). This is stored encrypted in Firestore and never exposed to the client.

---

## Project structure

```
app/
  api/                  # Server-side AI routes
  applications/         # Job tracker + detail pages
  analytics/            # Charts page
  answer-bank/          # Saved Q&A entries
  companies/            # Company profiles
  cover-letters/        # Cover letter generator
  dashboard/            # Overview + stats
  debrief/              # Post-interview debrief
  interview-prep/       # Mock questions generator
  resumes/              # Resume vault
  settings/             # API key + career goals
  weekly-review/        # Weekly reflection form
components/             # AppShell, Sidebar, shared UI
lib/                    # Firebase, AI proxy, data layers
types/                  # TypeScript interfaces
```

---

## Screenshots

<!-- Add screenshots here -->

---

## License

MIT
