# FolioOS

A design portfolio that looks and behaves like a desktop operating system, built to get you hired. Visitors open your case studies as windows, but a **Hire me** screen is always one click away so a busy recruiter never has to learn the metaphor.

Built with Next.js (App Router), React, TypeScript, Supabase, Zustand and Framer Motion.

## What is in it

**For recruiters and hiring managers**
- **Hire me fast lane:** your positioning line, strengths, résumé, email, LinkedIn, three best projects and your references on one screen. It has a button on the lock screen, the taskbar and the desktop.
- **Case studies** with role, tools, problem, process and result, shareable links (`/work/your-project`), a **Save as PDF** version for attachments, and rich link previews on LinkedIn and Slack.
- **"Making of FolioOS"** is included as the first case study: the site itself as evidence of craft, accessibility and engineering.
- **References:** quotes from real people, managed from the admin.
- **Feedback with star ratings:** held for your approval, and the average stays hidden until there are 3 approved reviews.

**For you**
- **Private company links:** `/for/acme-x7k2` greets a company by name, opens the project you chose, and counts when it is opened. Track every application's stage.
- **Insights:** visits, projects opened, résumé downloads, messages sent and where visitors came from. No cookies and no IP addresses stored.
- **Admin:** manage projects (with image uploads), applications, feedback, references and insights.
- **Five games** (Snake, 2048, Minesweeper, Memory Match, Tic-Tac-Toe), a terminal, themes and wallpapers for personality.

## 1. Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
npm test
```

With no Supabase keys the site still runs: it shows the sample content, feedback is kept in memory, and the admin stays locked.

## 2. Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor > New query**, paste all of `supabase/schema.sql`, run it. (Safe to run again after updates. If you used an earlier version, existing feedback becomes "waiting for approval"; approve it in the admin.)
3. **Project Settings > API**: copy the URL, `anon` key and `service_role` key into `.env.local`, and set `ADMIN_EMAIL`.
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...      # secret: never share or commit it
   ADMIN_EMAIL=you@example.com
   ```
4. **Authentication > Users > Add user**: create a user with exactly that email and a strong password (tick Auto Confirm).
5. **Authentication > Sign In / Providers > Email**: turn off "Allow new users to sign up".
6. Restart the dev server.

## 3. Your first-day checklist (before you send the link to anyone)

- [ ] `src/config/site.ts`: your **name**, the **role you are applying for**, headline, strengths, email, LinkedIn, availability.
- [ ] `public/resume.pdf`: replace the placeholder with your résumé (same file name).
- [ ] Admin > Projects: replace the **4 sample projects** with your own work (2 or 3 deep case studies beat 4 thin ones). The samples say "Replace this" on purpose, so no invented numbers go live. Keep or edit **Making of FolioOS**.
- [ ] Admin > References: add 2 or 3 quotes (with permission).
- [ ] Admin > Applications: make a private link for each company you apply to.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to your real domain.
- [ ] Open the site on a real phone.

## 4. The admin

**Finding the door:** a thin invisible strip at the **far right edge of the taskbar**, next to the clock. Hover and a lock appears; click it. Keyboard shortcut: **Ctrl + Shift + A**. Or go to `/admin/login`.

| Tab | What it does |
|---|---|
| Insights | Visits, project opens, Hire me opens, résumé downloads, messages, company link visits, top projects, referrers |
| Projects | Add, edit, publish or hide, reorder, delete. Upload a cover and up to 8 gallery images |
| Applications | One private link per company, with a greeting, a project to open first, a stage and a view count |
| Feedback | Approve, hide or delete feedback. A badge shows how many are waiting |
| References | Curated quotes shown on Hire me and About |

### Private company links
Create an application, copy its link, send it in your application. Their lock screen says "Prepared for {Company}" and the link opens the project you picked. Set the stage to **sent** when you share it; it flips to **viewed** on their first visit. Links are unguessable (random ending), never indexed by search engines, and unknown links are a plain 404.

## 5. How it is protected

- **Admin:** only `ADMIN_EMAIL` can use admin features, re-checked on the server for every request. Failed logins give one vague message and lock out after 8 tries in 15 minutes.
- **Database:** Row Level Security is on. Visitors can read only published projects and references and approved feedback. Applications and analytics are private to the server. Every write goes through the API, which validates input.
- **Cross-site requests:** all write endpoints refuse other origins.
- **Uploads:** the real file type is checked from the bytes, SVG is refused, 4 MB limit.
- **Privacy:** analytics use no cookies and store no IP address or browser details; Do Not Track is respected. Private notes and stages are never sent to visitors.
- **Spam:** feedback and contact forms are rate limited and have a hidden trap field, and feedback is moderated.
- The secret button is a convenience, not security. The login is the protection.
- The rate limiter is in memory. On serverless hosting, use a Redis store in `src/lib/rateLimit.ts` for a strict global limit.

## 6. Optional: a self-checking loop for Claude Code

`docs/LOOP.md` and `scripts/gate.mjs` let Claude Code keep fixing problems until `npm run typecheck` and `npm test` pass, with a hard stop after 8 tries. It is opt-in: nothing runs until you copy `docs/loop/settings.example.json` to `.claude/settings.json`.

## Where things are

```
supabase/schema.sql          tables, security rules, storage bucket
src/config/site.ts           your name, role, headline, links
src/data/projects.ts         fallback/sample projects (the admin is the real source)
src/app/admin/               login and dashboard tabs
src/app/for/[slug]/          private company links
src/app/work/[slug]/         case study links, print version, share image
src/app/api/                 comments, track, contact, projects, admin/*
src/components/os/           Desktop, windows, taskbar, start menu, lock screen
src/components/apps/         Hire me, Work, About, Mail, Terminal, Feedback, ...
src/components/games/        the five games
src/lib/                     auth, guards, repositories, validation, analytics
docs/openapi.yaml            API documentation
tests/                       Vitest tests
```

## Deploy

Push to GitHub and import in Vercel. Add every variable from `.env.example` (keep `SUPABASE_SERVICE_ROLE_KEY` secret) and set `NEXT_PUBLIC_SITE_URL`. Feedback, admin, references, company links and analytics all need the Supabase variables in production.

Optional: set up a [Resend](https://resend.com) account (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`) so the Mail app emails you.
