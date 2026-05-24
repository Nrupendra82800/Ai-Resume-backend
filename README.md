# MakeMyResume Backend v2 — PostgreSQL + Prisma

---

## 🚀 Setup (Step by step)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `DATABASE_URL` — your PostgreSQL connection string
- `GEMINI_API_KEY` — from https://aistudio.google.com (free)
- `JWT_SECRET` — any long random string
- `ADMIN_SECRET` — any password for template management

### 3. Set up PostgreSQL (pick one option)

**Option A — Local PostgreSQL (Mac)**
```bash
brew install postgresql
brew services start postgresql
createdb makemyresume
# DATABASE_URL = "postgresql://postgres:@localhost:5432/makemyresume"
```

**Option B — Neon (free cloud PostgreSQL, recommended)**
1. Go to https://neon.tech → create free account
2. Create a new project → copy the connection string
3. Paste into DATABASE_URL in .env

**Option C — Supabase (free)**
1. Go to https://supabase.com → new project
2. Settings → Database → copy URI
3. Paste into DATABASE_URL

### 4. Run database migration (creates all tables)
```bash
npm run db:migrate
```

### 5. Seed the 10 resume templates
```bash
npm run db:seed
```

### 6. Start the server
```bash
npm run dev       # development
npm start         # production
```

You should see:
```
🚀 MakeMyResume Server (PostgreSQL) running on port 5000
```

---

## 🗄️ Database Schema

```
users
  └── profile (1:1)
        ├── work_experiences (1:many)
        ├── educations (1:many)
        ├── profile_skills (1:many)
        ├── profile_languages (1:many)
        └── certifications (1:many)
  └── resumes (1:many, max 3 free / 10 pro)
        └── template (many:1)
  └── subscription (1:1)
  └── analytics (1:many)

templates (managed from admin API)
job_descriptions (for AI tailoring)
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | — (🔒) |

All protected routes need: `Authorization: Bearer <token>`

---

### Profile 🔒
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get full master record |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/profile/ai` | Save AI-generated profile |

---

### AI 🔒
| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/ai/generate` | `{ prompt }` → generates full profile |
| POST | `/api/ai/improve-summary` | `{ summary, jobTitle }` |
| POST | `/api/ai/suggest-skills` | `{ jobTitle }` |
| POST | `/api/ai/tailor` | `{ currentSummary, skills, jobDescription }` |

---

### Templates (public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/templates` | List all active templates |
| GET | `/api/templates?category=Modern` | Filter by category |
| GET | `/api/templates/:id` | Template details |

### Templates Admin (`X-Admin-Secret` header required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/templates/admin/all` | All templates incl. inactive |
| POST | `/api/templates/admin` | Create new template |
| PUT | `/api/templates/admin/:id` | Update template |
| DELETE | `/api/templates/admin/:id` | Deactivate template |

---

### Resumes 🔒
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/resumes` | List user's resumes |
| POST | `/api/resumes` | `{ templateId, title }` → create |
| PUT | `/api/resumes/:id/sync` | Re-sync with latest profile |
| DELETE | `/api/resumes/:id` | Delete resume |
| GET | `/api/resumes/:id/preview` | View as HTML |
| GET | `/api/resumes/:id/download` | Download as PDF |

---

### Subscription 🔒
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/subscription` | Get subscription status |
| POST | `/api/subscription/upgrade` | `{ paymentId, plan, amountPaid }` |
| POST | `/api/subscription/cancel` | Cancel subscription |

---

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/me` | User's own stats 🔒 |
| GET | `/api/analytics/admin` | Global stats (Admin header) |

---

## 📱 Android Flow

```
Register → save JWT
↓
Fill Profile OR use AI Generate
  AI: POST /api/ai/generate → confirm → PUT /api/profile/ai
↓
Templates screen: GET /api/templates
↓
Pick template → POST /api/resumes
↓
My Resumes: GET /api/resumes
↓
Download: GET /api/resumes/:id/download  ← streams PDF
```

---

## 🛠️ Useful Commands

```bash
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:reset     # Reset DB and re-run migrations
npm run db:seed      # Re-seed templates
```
