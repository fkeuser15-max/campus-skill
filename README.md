# Campus Skill: fixes for "projects bucket missing" and Gmail "535 Username and Password not accepted"

## A. projects bucket
Supabase -> SQL Editor -> paste ALL of 5_storage_projects.sql -> Run. The result table at the bottom must list avatars, portfolio and projects.
(No SQL alternative: Storage -> New bucket -> name `projects` -> turn Public ON -> Create, then run only section 3 of the file.)

## B. Gmail error 535 5.7.8 (credentials rejected). Fix it in TWO places with the same values
1. Google Account (the same Gmail you use as SMTP user) -> Security -> 2-Step Verification must be ON.
2. Security -> App passwords -> delete the old "Campus Skill" one -> create a new one -> copy the 16 letters. Type them WITHOUT spaces.
   (Use your normal Gmail password here and you get exactly this error. College/Workspace accounts often block app passwords: use a personal @gmail.com.)
3. Supabase -> Authentication -> SMTP Settings (sends the login codes): host smtp.gmail.com, port 465, username = FULL address you@gmail.com,
   password = the new app password, sender email = the same address. Click Save.
4. Supabase -> Edge Functions -> Secrets (sends student messages): SMTP_USER = you@gmail.com, SMTP_PASS = the new app password, SMTP_HOST = smtp.gmail.com, SMTP_PORT = 465,
   SMTP_FROM = Campus Skill <you@gmail.com>. Then redeploy: supabase functions deploy send-message
5. If Google emailed you a "critical security alert / sign-in blocked", open it and approve, then try again.
