# Campus Skill: backend + admin (project vtiiflxznachblkfmljg)

## 1. Database  (Supabase -> SQL Editor; paste each file in full, Run, one query each, in this order)
1. backend/01_schema.sql         all tables, triggers, notifications, requests, RLS policies
2. backend/02_storage.sql        buckets avatars, portfolio, projects + policies  (result lists 3 buckets)
3. backend/04_admin.sql          admins, suspension, server settings, analytics, audit log, admin functions
4. backend/05_admin_storage.sql  lets admins delete any file
5. backend/03_verify.sql         shows what exists
Then make YOURSELF the first admin: open 04_admin.sql, scroll to the last lines, put your email in the insert line, remove the two dashes, and run only that line.

## 2. Gmail for login codes  (Authentication -> SMTP Settings, port 587)  OR run the script
   Host smtp.gmail.com, Port 587, Username = Sender email = your Gmail, Sender name Campus Skill, Password = 16-letter app password (no spaces).
   Script version (Node 18+, PowerShell):  $env:SUPABASE_ACCESS_TOKEN="sbp_..."; $env:GMAIL_USER="you@gmail.com"; $env:GMAIL_APP_PASSWORD="abcdefghijklmnop"; node scripts/configure-auth.mjs
   Also paste email_templates.html into the Confirm signup + Magic Link templates (the script does this too).

## 3. Edge functions  (Dashboard -> Edge Functions -> function -> Code tab -> paste -> Deploy updates; or: npx supabase functions deploy NAME)
   send-message       secrets: SMTP_USER (your Gmail), SMTP_PASS (16 letters). Port is 465 inside functions (587 is blocked there).
   admin-delete-user  no secrets needed (uses the built-in service role).

## 4. Website
   config.js already has the project URL; keep your anon key there. Deploy the folder to Vercel (it is a static site, no build step).
   Admin page: /admin.html
