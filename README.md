# Campus Skill: Supabase only (email code login, free Gmail as the email sender)

1. config.js: paste Supabase URL + anon key (Project Settings -> API).
2. Gmail app password: Google Account -> Security -> turn on 2-Step Verification -> App passwords -> create "Campus Skill" -> copy the 16 characters.
3. Supabase -> Authentication -> SMTP Settings -> enable Custom SMTP:
   host smtp.gmail.com, port 465, username = your Gmail, password = the app password, sender email = your Gmail, sender name = Campus Skill.
4. Authentication -> Email Templates: paste email_templates.html into "Confirm signup" AND "Magic Link" (adds the code).
5. Authentication -> Rate Limits: raise the emails-per-hour limit while testing.
6. Authentication -> Providers -> Email: enabled, and "Allow new users to sign up" ON.
7. Authentication -> URL Configuration: Site URL = where you run the site (e.g. http://localhost:5500).
8. SQL Editor, one query each, in this order: 1_database.sql, 2_storage.sql, 3_check.sql.
9. Demo data (optional): Table Editor -> profiles -> Import CSV seed_profiles.csv, then skills -> seed_skills.csv.
10. Messages (Edge Function), with the Supabase CLI:
    supabase functions deploy send-message
    supabase secrets set SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=you@gmail.com SMTP_PASS=<app password> SMTP_FROM="Campus Skill <you@gmail.com>"
11. Run the folder through a local server (VS Code Live Server), not by double-clicking index.html.
