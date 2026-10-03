/* ===== Shared helpers + Supabase client (loaded on every page after config.js) ===== */
(() => {
  const C = window.CS_CONFIG || {};
  const ok = !!(window.supabase && C.SUPABASE_URL && !/^YOUR_/.test(C.SUPABASE_URL) && C.SUPABASE_ANON_KEY && !/^YOUR_/.test(C.SUPABASE_ANON_KEY));
  const sb = ok ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const ini = n => String(n || "?").trim().split(/\s+|@/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  function toast(m) { const t = $("toast"); if (!t) return; t.textContent = m; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 3000); }
  const session = async () => sb ? (await sb.auth.getSession()).data.session : null;
  const profile = async uid => { const { data } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle(); return data; };
  // Skill choices for the dropdown (same categories as the marketplace)
  const SKILLS = ["Graphic Design", "Video Editing", "Photography", "Web Development", "Presentation Design", "Tutoring & Academics", "Computer Assistance"];
  // Simple header for inner pages (login, skill, profile)
  const h = $("subhdr");
  if (h) h.innerHTML = `<div class="wrap nav"><a class="logo" href="index.html"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#4338CA"/><path d="M20 9 6 16l14 7 14-7z" fill="#fff"/><path d="M12 20v6c0 2 3.6 4 8 4s8-2 8-4v-6l-8 4z" fill="#2DD4BF"/></svg>Campus Skill</a><a class="btn btn-o btn-sm" style="margin-left:auto" href="index.html">← Back to home</a></div>`;
  window.CS = { sb, ok, $, esc, ini, toast, session, profile, SKILLS };
})();
