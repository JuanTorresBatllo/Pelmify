# Pelmify — Employee Time Tracking

A modern web-based employee time tracking application built with Next.js 14, TypeScript, Tailwind CSS, and Firebase.

## Features

- 🔐 **Authentication** — Firebase Auth with email/password
- 👥 **Role-based access** — Admin & Employee roles
- ⏱️ **Clock in / Clock out** — Real-time time tracking
- ☕ **Break tracking** — Start / stop breaks during shifts
- 📅 **Calendar view** — See worked, planned, and day-off hours
- 📊 **Admin dashboard** — Overview of all employees
- 👤 **Employee management** — Add, edit, remove employees
- 📈 **Timesheet reports** — Daily, weekly, monthly views
- 📤 **Export** — CSV and PDF export

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Auth + Firestore)
- **Icons:** lucide-react
- **PDF/CSV:** jsPDF, PapaParse

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Enable **Firestore Database** → Start in production mode
4. Add a Web App → copy the config values
5. Copy `.env.local.example` to `.env.local` and paste your values:

```bash
cp .env.local.example .env.local
```

### 3. Firestore security rules

In Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create, update, delete: if isAdmin();
      allow update: if isSignedIn() && request.auth.uid == userId;
    }

    match /timeEntries/{entryId} {
      allow read: if isSignedIn() && (isAdmin() || resource.data.userId == request.auth.uid);
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && (isAdmin() || resource.data.userId == request.auth.uid);
    }

    match /schedules/{scheduleId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

### 4. Create your first admin user

1. Run the app: `npm run dev`
2. Go to `/login` and click "Sign up" → create an account
3. In Firebase Console → Firestore → `users` collection → find your user document
4. Change the `role` field from `"employee"` to `"admin"`
5. Refresh the app — you are now an admin

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment to Vercel

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import your GitHub repo
3. Add the same env variables from `.env.local` in Vercel → Settings → Environment Variables
4. Deploy — Vercel will auto-deploy on every push to `main`

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── login/              # Login page
│   ├── admin/              # Admin-only pages
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── calendar/
│   │   └── reports/
│   └── employee/           # Employee pages
│       ├── dashboard/
│       ├── calendar/
│       └── timesheets/
├── components/             # Reusable UI components
├── lib/                    # Firebase config & utilities
│   ├── firebase.ts
│   ├── auth.tsx
│   ├── db.ts
│   └── utils.ts
└── types/                  # TypeScript types
```

## License

MIT
