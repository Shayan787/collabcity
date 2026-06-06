# 🔥 CollabCity — v2

> Find your people. Get paid together.

A hyper-local GenZ social platform to discover collaborators, chat in real-time, and work on paid projects — now with AI matching, milestone payments, profile photo upload, verified badges, and PWA support.

---

## 🆕 What's new in V2

| Feature | Details |
|---|---|
| 🤖 **AI Smart Match** | Claude AI finds your best collaborators based on your goal |
| 💸 **Milestone Payments** | Split projects into milestones, release funds step by step |
| 📸 **Photo Upload** | Cloudinary-powered profile photo upload |
| ✓ **Verified Badge** | 499 PKR/month subscription, shown on profile + feed |
| 🚀 **Profile Boost** | 500 PKR/week — appear at top of discovery feed |
| 📱 **PWA** | Installable on Android + iOS, works offline |
| 💳 **Payment History** | Track all transactions in Settings |
| 🗂️ **Project Detail** | Full project page with milestones + applications |

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd collabcity
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend `.env`

```bash
cd backend
cp .env.example .env
# Edit .env:
```

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/collabcity"
JWT_SECRET="any-long-random-string"
FRONTEND_URL="http://localhost:3000"

# Cloudinary — get free account at cloudinary.com
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Anthropic — get key at console.anthropic.com
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Frontend `.env.local`

```bash
cd frontend
cp .env.local.example .env.local
# Defaults work for local dev
```

### 4. Database setup

```bash
# In psql: CREATE DATABASE collabcity;

cd backend
npx prisma db push       # push schema
npx prisma generate      # generate client
node prisma/seed.js      # seed demo data
```

### 5. Run

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

Open **http://localhost:3000** 🎉

---

## 🔑 Demo accounts

Password for all: `password123`

| Email | Name | Vibe |
|---|---|---|
| ali@demo.com | Ali Hassan | Developer |
| sara@demo.com | Sara Khan | Designer |
| hamza@demo.com | Hamza Malik | Video Editor |
| zara@demo.com | Zara Ahmed | Marketer |

---

## 📱 Install as PWA

On mobile (Chrome/Safari):
1. Open `http://localhost:3000` on your phone
2. Tap the browser menu → "Add to Home Screen"
3. CollabCity installs like a native app

---

## 📁 Full Project Structure

```
collabcity/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # All DB models (V2: Milestone, Payment)
│   │   └── seed.js
│   └── src/
│       ├── index.js              # Express + Socket.io server
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js           # Register, login, /me
│           ├── users.js          # Discovery, profile, ratings
│           ├── rooms.js          # Chat rooms
│           ├── projects.js       # Project board
│           ├── milestones.js     # 🆕 Milestone CRUD + status flow
│           ├── payments.js       # 🆕 Verified badge + boost + history
│           ├── upload.js         # 🆕 Cloudinary avatar upload
│           ├── match.js          # 🆕 AI smart match (Claude API)
│           └── notifications.js
│
└── frontend/
    ├── public/
    │   ├── manifest.json         # 🆕 PWA manifest
    │   ├── sw.js                 # 🆕 Service worker
    │   ├── icon-192.png          # 🆕 PWA icons
    │   └── icon-512.png
    └── src/
        ├── app/
        │   ├── layout.js              # PWA meta tags
        │   ├── page.js                # Landing
        │   ├── login/ register/       # Auth
        │   └── (app)/
        │       ├── layout.js          # Sidebar with Smart Match + Settings
        │       ├── discover/          # People feed (boosted users first)
        │       ├── match/             # 🆕 AI Smart Match page
        │       ├── chat/[id]/         # Real-time chat
        │       ├── projects/          # Project board
        │       ├── projects/[id]/     # 🆕 Project detail + milestones
        │       ├── profile/           # Own profile
        │       ├── profile/[id]/      # Public profile
        │       ├── settings/          # 🆕 Photo upload + badge + boost
        │       └── notifications/     # Alerts
        └── components/
            ├── MilestonesPanel.js     # 🆕 Milestone tracker UI
            └── PWARegister.js         # 🆕 SW registration + install prompt
```

---

## 💰 Monetization (V2)

| Stream | Price | Where |
|---|---|---|
| Verified Badge | 499 PKR/month | Settings → Perks |
| Profile Boost | 500 PKR/week | Settings → Perks |
| Platform fee | 8–10% per project | Auto on milestone release |

> **Note:** Payments are currently simulated. To go live, replace `simulatePayment()` in `routes/payments.js` with JazzCash / EasyPaisa / Stripe SDK calls.

---

## 🔮 V3 Roadmap

- [ ] Real JazzCash / EasyPaisa integration
- [ ] React Native mobile app
- [ ] City-wide leaderboard
- [ ] Collab room file sharing
- [ ] Dispute resolution system
- [ ] Email notifications (Resend)
- [ ] Admin dashboard
