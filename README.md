# Digital Renter Logbook
> A web-based visitor and resident management system for apartment buildings — replacing paper logbooks with real-time QR scanning, role-based access, and a full admin dashboard.

---

## Overview (Situation)

**Context:** Residential apartment buildings rely heavily on manual paper logbooks to track who enters and exits the premises. Security guards record visitor and resident movement by hand, making it slow, error-prone, and impossible to query in real time.

**Problem:** Building administrators had no way to monitor live occupancy, manage visitor approvals, or audit entry logs without physically reviewing handwritten records. Guards had no fast way to verify resident identity or check if a visitor was authorized — a process that could take several minutes per person during peak hours.

---

## Our Role (Task)

- **Position / Responsibility:** Group Project — 5 members (BSCS students, academic submission)
- **Duration:** 1 semester
- **Scope:** Full-stack development from scratch — system design, Firebase setup, UI/UX, authentication, QR scanning, and deployment. Documentation split across all members covering technical architecture, user manuals, deployment guide, and QA checklist.

---

## What We Built (Action)

### Key Features

- **Role-Based Access Control** — Three distinct portals (Admin, Guard, Resident) powered by Google Sign-In. Users are identified by email and routed to their correct dashboard automatically.
- **QR Code Entry System** — Guards scan resident or visitor QR codes using the device camera. The system verifies identity, checks the blacklist, collects a physical ID, and requires the resident's 6-digit PIN before logging entry or exit — all in one mobile-optimized flow.
- **Visitor Request & Approval** — Residents submit visitor pass requests at least 3 days in advance. Admins approve or decline from the dashboard. Approved requests auto-generate a one-time visitor QR code.
- **Live Admin Dashboard** — Real-time KPIs showing residents currently inside the building, pending visitor requests, and active guards on duty. Recent activity feed with entry/exit logs.
- **Shift Schedule Calendar** — Admins assign guard shifts using full datetime pickers that support overnight shifts (e.g., 11:00 PM to 5:00 PM the next day). The system detects and blocks overlapping shifts per guard using interval overlap logic.
- **Blacklist Management** — Admins add residents or visitors to a blacklist with a reason. Scanning a blacklisted subject's QR triggers a full-screen alert on the guard terminal, blocking entry.
- **Resident Portal** — Residents access their permanent identity QR card, download it as a PNG, submit visitor requests, change their PIN, and review their personal entry/exit log history.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), Tailwind CSS |
| Authentication | Firebase Auth (Google Sign-In only) |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting |
| QR Scanning | html5-qrcode |
| QR Generation | qrcode.react |
| Image Export | html-to-image |
| Icons | lucide-react |
| Notifications | react-hot-toast |
| Routing | react-router-dom v7 |

### Challenges Solved

**Overnight shift support** — The original shift model stored a date + start/end time separately, which meant a shift from 11:00 PM to 5:00 PM the next day was impossible to represent. We redesigned the data model to store full ISO datetime strings (`YYYY-MM-DDTHH:MM`) for both endpoints. Overlap detection was updated to use interval logic (`newStart < existingEnd && newEnd > existingStart`) instead of a simple same-day check, correctly allowing back-to-back overnight shifts while still blocking genuine conflicts.

**UTC timezone bug in the calendar** — The monthly and weekly calendar views were showing the wrong "today" highlight for users in UTC+8 (Philippines). The root cause was using `new Date().toISOString().slice(0, 10)`, which returns the UTC date. We replaced all date key generation with local-time arithmetic using `getFullYear()`, `getMonth()`, and `getDate()` to ensure correctness regardless of timezone.

**React ESLint component-in-render error** — Three calendar sub-components (`MonthlyView`, `WeeklyView`, `DailyView`) were originally defined inside the `ShiftScheduleTab` component, causing React to recreate them as new component types on every render. This broke state and triggered ESLint errors. We lifted all three to module-level functions and passed shared state as explicit props.

---

## Results & Impact
- Replaced a fully manual paper-based entry system with a real-time digital logbook
- Supports three concurrent user roles with isolated portals and Firestore security rules
- Guard entry verification reduced from several manual steps to a single scan-to-confirm flow
- Overnight and cross-day shifts handled correctly through full datetime interval modeling
- Successfully deployed to Firebase Hosting and tested end-to-end across all three roles
- Complete documentation produced: system architecture, data model, user manuals for all three roles, deployment guide, and QA checklist

> Academic project — quantitative metrics are based on functional completeness and system correctness verified through structured QA testing across all major flows.

---

## Getting Started

```bash
git clone https://github.com/MarlanAlfonso/Digital-Renter-Logbook.git
cd Digital-Renter-Logbook
npm install
npm run dev
```

### Environment Variables

Create a `.env` file in the project root with your Firebase project credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### First-Time Setup

Before any user can log in, manually create the first admin document in Firestore:

- **Collection:** `admins`
- **Document ID:** the admin's Google email address
- **Fields:** `name`, `email`, `role: "admin"`, `status: "active"`

All other users (guards, residents) are registered through the admin panel after that.

### Deployment

```bash
npm run build
firebase deploy --only hosting
```

See the full deployment guide in `/docs` for Firestore rules setup and Firebase project configuration.

---

## What We Learned

- **Learned to design role-based access control** using Firestore security rules — writing granular read/write permissions per collection based on the authenticated user's role and document ownership.
- **Gained hands-on experience with Firebase Auth and Firestore** as a complete backend — including real-time data, serverTimestamp, compound queries, and handling the `browserSessionPersistence` setting for guard shift enforcement.
- **Improved understanding of React component architecture** — specifically why components must be defined outside of render functions to prevent state loss, and how to pass shared state through props instead.
- **Learned to model time-aware data correctly** — the overnight shift problem taught us that storing only a time (HH:MM) is insufficient when events can span midnight, and full datetime strings are the correct model for any schedule feature.
- **Practiced mobile-first UI development** with Tailwind CSS — building a responsive guard terminal that works on a phone screen, with bottom tab bars, bottom sheet modals, and a live camera QR scanner.

---

## Team

| Name | Role |
|---|---|
| Alfonso, Marlan R. | Lead Developer — Full system architecture, all frontend and backend implementation, Firebase setup and deployment |
| Militar, Angela | Documentation — Firestore data model, authentication & RBAC documentation |
| Florendo, Angel | Documentation — Admin panel user manual, system architecture overview |
| Limbaring, Maye Finlearn | Documentation — Guard terminal user manual, deployment & configuration guide |
| Berroy, Marron | Documentation — Resident portal user manual, testing & QA checklist |
