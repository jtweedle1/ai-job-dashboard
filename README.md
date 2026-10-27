# Wayfinder

[![CI](https://github.com/jtweedle1/ai-job-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/jtweedle1/ai-job-dashboard/actions/workflows/ci.yml)

**Job applications that sound like you, not like AI.** Wayfinder is a job search tracker whose AI writes in your own voice, draws on the real stories behind your work, and checks every claim before you send it.

**Live:** [ai-job-dashboard-sable.vercel.app](https://ai-job-dashboard-sable.vercel.app/) · click **Try the demo** to look around a sample job search with no sign-up.

> **Recruiters and hiring managers:** I'm happy to provide a temporary Anthropic API key so you can explore all of the app's AI features. Email me at [jazminrtweedle@gmail.com](mailto:jazminrtweedle@gmail.com).

---

## Why it's different

Most job trackers (Huntr, Teal, Simplify) compete on volume: clip more jobs, autofill more forms, generate more letters. Their letters all sound the same, and nobody checks whether what they say about you is true. Wayfinder goes the other way:

| | What it does |
|---|---|
| **Your voice** | Add things you've written. Wayfinder *measures* your writing (length, sentence rhythm, contractions, greetings, sign-offs) and builds a voice profile that can't contradict those numbers. Letters are drafted to match it. |
| **Your real stories** | The **Story Library** holds your experience write-ups, prepared answers, and interview notes in one searchable place. Cover letters and application answers ("Why us?", "Tell me about a conflict") are drafted from those stories, not from rewording your resume. |
| **Every claim traced** | Each letter is fact-checked against your resume and stories. Every claim is highlighted with the exact line it came from, and anything you never said is flagged. |
| **Rules enforced in code** | Your banned words are checked in code after generation, with an automatic rewrite pass. A pre-send checklist also catches AI clichés, leftover placeholders, length, and repetitive "I…" openings. |

## Everything else

| Feature | Description |
|---|---|
| **Job tracker** | Log applications, update stages, filter by source and stage |
| **AI field extraction** | Paste a job description and auto-fill title, company, location, salary |
| **Role-fit scoring** | 0–100 score based on your resume and career goals |
| **Company research** | One-click AI fill of company profiles, with web search |
| **Interview prep** | Mock questions and study tips from the job description |
| **Source analytics** | Response rates and conversion by job source |
| **Weekly review** | Weekly reflection with an optional AI summary and next steps |

---

## How the AI is kept honest

A few engineering decisions worth calling out:

- **The model proposes, code verifies.** Claim tracing asks a model for each claim, the source it came from, and a supporting quote. Code then searches for that quote, word for word, in the cited source. If it isn't there, the claim is shown as unbacked, so a made-up quote can never show as "backed". See [`lib/claims.ts`](lib/claims.ts).
- **Measured, not guessed.** Voice stats are computed in plain TypeScript ([`lib/voice-stats.ts`](lib/voice-stats.ts)) and passed to the model as facts, so the voice profile can't claim you "never use contractions" when you do.
- **Prompts can't enforce a long ban list, so code does.** [`lib/banned-phrases.ts`](lib/banned-phrases.ts) parses whatever format you paste in (comma lists, headings, bullet rules) and checks each draft with whole-word matching.
- **Bring your own key.** Each user's Anthropic key is AES-256-GCM encrypted at rest and only decrypted server-side. Every API route verifies a Firebase ID token and is rate-limited per user.
- **Tested.** The pure logic above has unit tests (`npm test`), including a test that the demo's sample letters pass the same claim checks as real ones.

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Auth:** Firebase Authentication (Google SSO, plus anonymous accounts for the demo)
- **Database:** Firestore (client + Admin SDK)
- **Storage:** Firebase Storage (resume PDFs)
- **AI:** Anthropic API (Claude Haiku 4.5 for structured tasks, Sonnet 4.6 for voice-matched writing) via server-side routes; each user supplies their own key
- **Styling:** Tailwind CSS + Tabler Icons
- **Charts:** Recharts
- **Testing:** Vitest, run in GitHub Actions with lint and type checks
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

1. Create a Firebase project with **Authentication** (Google and **Anonymous** providers), **Firestore**, and **Storage** enabled. Anonymous sign-in powers the demo; each visitor gets their own throwaway account filled with sample data.
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

```bash
npm test        # unit tests (Vitest)
npm run lint
```

### 5. Add your Anthropic API key

Sign in → **Settings** → paste your [Anthropic API key](https://console.anthropic.com/). This is stored encrypted in Firestore and never exposed to the client.

---

## Project structure

```
app/
  api/                  # Server-side AI routes
  applications/         # Job tracker + detail pages
  analytics/            # Charts page
  answer-bank/          # Story Library: prepared answers, drafted from your stories
  background/           # Story Library: the stories behind each past job
  companies/            # Company profiles
  cover-letters/        # Cover letters with claim tracing and pre-send checks
  dashboard/            # Overview + stats
  debrief/              # Story Library: post-interview notes
  interview-prep/       # Mock questions generator
  resumes/              # Resume vault
  settings/             # API key + career goals
  stories/              # Story Library overview and search
  voice/                # Writing samples and voice profile
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
