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
  if (h) h.innerHTML = `<div class="wrap nav"><a class="logo" href="index.html"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#4338CA"/><path d="M20 9 6 16l14 7 14-7z" fill="#fff"/><path d="M12 20v6c0 2 3.6 4 8 4s8-2 8-4v-6l-8 4z" fill="#2DD4BF"/></svg>Campus Skill</a><a class="btn btn-o btn-sm" style="margin-left:auto" href="index.html">← Home</a></div>`;
    /* --- Analytics + server settings (admin page shows them) --- */
  // Fire-and-forget event log. Returns a promise that always resolves, so callers may await it before navigating away.
  const track = (event, meta) => { if (!sb) return Promise.resolve(); try { return Promise.resolve(sb.rpc("log_event", { p_event: event, p_path: location.pathname, p_meta: meta || null })).then(() => {}, () => {}) } catch (e) { return Promise.resolve() } };
  // Public on/off switches set by the admin (maintenance_mode, announcement, signups_enabled, ...). Missing table => defaults apply.
  let settingsP; const settings = () => settingsP || (settingsP = !sb ? Promise.resolve({}) : Promise.resolve(sb.from("app_settings").select("key,value")).then(r => Object.fromEntries((r.data || []).map(x => [x.key, x.value])), () => ({})));
  if (!window.CS_NO_TRACK) track("page_view");


  /* --- Hamburger drawer (logged-in users): Profile, Projects, Skills, Messages --- */
  const ITEMS = [["profile", "👤", "Profile"], ["messages", "💬", "Messages"], ["skills", "🛠️", "Skills"], ["projects", "🧩", "Sample projects"]];
  // profile.html#<view> -> which section is open (old links like #notifications / #requests still land somewhere sensible)
  const viewOf = h => ITEMS.some(i => i[0] === h) ? h : h === "requests" ? "messages" : "profile";
  const onDash = () => /profile(\.html)?$/.test(location.pathname);
  function setUnread(n) {
    const b = $("drUnread"), d = $("hambDot");
    if (b) { b.textContent = n > 99 ? "99+" : n; b.hidden = !n }
    if (d) d.hidden = !n;
  }
  // Builds the drawer contents. Logged-out visitors get the public links + Login; logged-in users get their account menu.
  function drawerHTML(s, p, adm) {
    const site = `<a class="dr-i" href="index.html#home"><i aria-hidden="true">🏠</i><span>Home</span></a>
        <a class="dr-i" href="index.html#explore"><i aria-hidden="true">🔎</i><span>Explore skills</span></a>
        <a class="dr-i" href="index.html#clubs"><i aria-hidden="true">🎓</i><span>For clubs</span></a>`;
    if (!s) return `<div class="dr-top"><span class="cav" aria-hidden="true">CS</span><div class="dr-who"><b>Campus Skill</b><small>Menu</small></div><button class="dr-x" type="button" id="drX" aria-label="Close menu">✕</button></div>
      <nav class="dr-nav" aria-label="Site">${site}</nav>
      <div class="dr-sep"></div>
      <nav class="dr-nav" aria-label="Account"><a class="dr-i" href="login.html"><i aria-hidden="true">🔑</i><span>Login / Sign up</span></a></nav>`;
    const name = (p && p.full_name) || s.user.email;
    const av = p && p.avatar_url ? `<img class="cav" src="${esc(p.avatar_url)}" alt="">` : `<span class="cav" aria-hidden="true">${esc(ini(name))}</span>`;
    return `<div class="dr-top">${av}<div class="dr-who"><b>${esc(name)}</b><small>${esc(s.user.email)}</small></div><button class="dr-x" type="button" id="drX" aria-label="Close menu">✕</button></div>
      <nav class="dr-nav" aria-label="Menu">
        ${site}
        ${ITEMS.map(([k, ic, l]) => `<a class="dr-i" data-k="${k}" href="profile.html#${k}"><i aria-hidden="true">${ic}</i><span>${l}</span>${k === "messages" ? `<em class="dr-badge" id="drUnread" hidden></em>` : ""}</a>`).join("")}
      </nav>
      <div class="dr-sep"></div>
      <nav class="dr-nav" aria-label="Account">
        ${adm ? `<a class="dr-i" href="admin.html"><i aria-hidden="true">🛡️</i><span>Admin dashboard</span></a>` : ""}
        <button class="dr-i" type="button" id="drOut"><i aria-hidden="true">🚪</i><span>Log out</span></button>
      </nav>`;
  }
  async function initDrawer() {
    // Works on every page: home (#hdr), inner pages (#subhdr) and the admin page (plain <header>)
    const bar = document.querySelector("#subhdr .nav, #hdr .nav, header .nav");
    if (!bar || $("hamb")) return;
    const hdr = bar.closest("header"); hdr.classList.add("has-drawer");
    // Button first (always visible, far left) - no waiting for the login check
    const btn = document.createElement("button");
    btn.className = "hamb"; btn.id = "hamb"; btn.type = "button"; btn.setAttribute("aria-label", "Open menu"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "drawer");
    btn.innerHTML = `☰<span class="dot" id="hambDot" hidden></span>`;
    bar.prepend(btn);
    const ov = document.createElement("div"); ov.className = "dr-ov"; ov.id = "drOv";
    const dr = document.createElement("aside"); dr.className = "drawer"; dr.id = "drawer"; dr.setAttribute("aria-label", "Menu");
    dr.innerHTML = drawerHTML(null);
    document.body.append(ov, dr);
    const mark = () => { const cur = onDash() ? viewOf(location.hash.slice(1)) : ""; dr.querySelectorAll("[data-k]").forEach(a => a.toggleAttribute("aria-current", a.dataset.k === cur)) };
    const open = o => {
      dr.classList.toggle("on", o); ov.classList.toggle("on", o); document.body.classList.toggle("dr-lock", o);
      btn.setAttribute("aria-expanded", o); if (o) { const x = $("drX"); x && x.focus() } else btn.focus({ preventScroll: true });
    };
    btn.addEventListener("click", () => open(true));
    ov.addEventListener("click", () => open(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && dr.classList.contains("on")) open(false) });
    // One delegated listener, so it keeps working when the drawer contents are re-rendered after login is detected
    dr.addEventListener("click", async e => {
      if (e.target.closest("#drX")) return open(false);
      if (e.target.closest("#drOut")) { await sb.auth.signOut(); location.href = "index.html"; return }
      if (e.target.closest("a")) { dr.classList.remove("on"); ov.classList.remove("on"); document.body.classList.remove("dr-lock"); btn.setAttribute("aria-expanded", "false") }
    });
    window.addEventListener("hashchange", mark);
    if (!sb) return;
    const s = await session(); if (!s) return;
    const [p, adm] = await Promise.all([profile(s.user.id).catch(() => null), Promise.resolve(sb.rpc("is_admin")).then(r => r.data === true, () => false)]);
    dr.innerHTML = drawerHTML(s, p, adm); mark();
    const n = await sb.from("messages").select("id", { count: "exact", head: true }).eq("to_user", s.user.id).eq("is_read", false);
    setUnread(n.count || 0);
  }
  initDrawer();

window.CS = { sb, ok, $, esc, ini, toast, session, profile, track, settings, SKILLS, viewOf, setUnread };
})();
