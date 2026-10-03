/* ===== UI config (not data): category names + icons. Student data comes from Supabase. ===== */
const CATS = [["Graphic Design", "🎨"], ["Video Editing", "🎬"], ["Photography", "📸"], ["Web Development", "💻"], ["Presentation Design", "📊"], ["Tutoring & Academics", "📚"], ["Computer Assistance", "🛠️"]];
const EM = Object.fromEntries(CATS);
const G = ["linear-gradient(135deg,#6366F1,#A5B4FC)", "linear-gradient(135deg,#0D9488,#5EEAD4)", "linear-gradient(135deg,#F59E0B,#FCD34D)", "linear-gradient(135deg,#EC4899,#F9A8D4)", "linear-gradient(135deg,#0EA5E9,#7DD3FC)", "linear-gradient(135deg,#8B5CF6,#C4B5FD)"];
const AV = ["#4338CA", "#0D9488", "#DB2777", "#D97706", "#0284C7", "#7C3AED"];
let P = [], cat = "All", term = "";
const { $, esc, ini, toast } = CS;

/* ===== Load students from Supabase: "students" view (safe public columns) + "skills" table ===== */
const empty = m => `<div class="empty">${m}</div>`;
async function loadStudents() {
  if (!CS.ok) { $("grid").innerHTML = empty("<strong>Connect Supabase</strong> by adding your URL and anon key in config.js."); return }
  $("grid").innerHTML = empty("Loading students…");
  const [st, sk] = await Promise.all([
    CS.sb.from("students").select("*").limit(500),
    CS.sb.from("skills").select("*").order("created_at").limit(2000)]);
  if (st.error || sk.error) { $("grid").innerHTML = empty("Could not load students: " + esc((st.error || sk.error).message)); return }
  const by = {}; sk.data.forEach(s => (by[s.user_id] = by[s.user_id] || []).push(s));
  P = st.data.filter(s => by[s.id]).map(s => {
    const k = by[s.id];
    return {
      id: s.id, n: s.full_name, d: [s.department, s.college].filter(Boolean).join(" · "), c: k[0].category,
      cats: [...new Set(k.map(x => x.category))], s: s.headline || k[0].title, b: s.bio || k[0].description, av: s.avatar_url, x: k,
      t: [...new Set(k.flatMap(x => (x.tags || "").split(",").map(t => t.trim()).filter(Boolean)))].slice(0, 4),
      pf: (s.portfolio || "").split(",").map(u => u.trim()).filter(Boolean)
    };
  });
  renderCats(); render();
}

/* ===== Render categories (counts computed from data) + dropdown ===== */
$("heroCat").innerHTML += CATS.map(c => `<option>${c[0]}</option>`).join("");
function renderCats() { $("cats").innerHTML = CATS.map(c => `<button class="cat" data-c="${c[0]}" aria-pressed="${cat === c[0]}"><i>${c[1]}</i><b>${c[0]}</b><small>${P.filter(p => p.cats.includes(c[0])).length} students</small></button>`).join("") }
/* ===== Render marketplace cards ===== */
function render() {
  const l = P.map((p, i) => ({ p, i })).filter(({ p }) => (cat === "All" || p.cats.includes(cat)) && (p.n + p.s + p.b + p.cats.join(" ") + p.t.join(" ")).toLowerCase().includes(term));
  $("count").textContent = l.length ? `${l.length} student${l.length > 1 ? "s" : ""} ${cat === "All" ? "" : "in " + cat}${term ? ` matching “${term}”` : ""}` : "";
  $("grid").innerHTML = l.length ? l.map(({ p, i }) => `<article class="card"><div class="thumb" style="background:${p.pf[0] ? `url('${esc(p.pf[0])}') center/cover` : G[i % 6]}" aria-hidden="true"><span class="badge">${esc(p.c)}</span>${p.pf[0] ? "" : EM[p.c] || "✨"}</div>
  <div class="cb"><div class="who">${p.av ? `<img class="av" src="${esc(p.av)}" alt="" style="object-fit:cover">` : `<span class="av" style="background:${AV[i % 6]}">${esc(ini(p.n))}</span>`}<div><b>${esc(p.n)}</b><small>${esc(p.d)}</small></div></div>
  <div class="skill">${esc(p.s)}</div><div class="tags">${p.t.map(t => `<span>#${esc(t.replace(/\s/g, ""))}</span>`).join("")}</div><p class="bio">${esc(p.b)}</p>
  <div class="cbtn"><button class="btn btn-o btn-sm" data-v="${i}">View Profile</button><button class="btn btn-p btn-sm" data-v="${i}" data-contact="1">Contact Student</button></div></div></article>`).join("") :
    empty(P.length ? `<strong>No students match that search.</strong><br>Try another keyword or <a href="#explore" id="reset">clear filters</a>.` : "No students have listed skills yet. Be the first with <strong>Offer a Service</strong>.")
}
function setFilter(c, t) { cat = c; term = t.toLowerCase().trim(); $("heroCat").value = c; renderCats(); render() }
/* ===== Events ===== */
$("cats").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (!b) return; setFilter(cat === b.dataset.c ? "All" : b.dataset.c, term); $("explore").scrollIntoView() });
$("fbar").addEventListener("submit", e => { e.preventDefault(); setFilter($("heroCat").value, $("heroQ").value); $("explore").scrollIntoView() });
$("navQ").addEventListener("input", e => { setFilter("All", e.target.value) });
$("navQ").addEventListener("keydown", e => { if (e.key === "Enter") $("explore").scrollIntoView() });
$("grid").addEventListener("click", e => {
  if (e.target.id === "reset") { e.preventDefault(); $("navQ").value = $("heroQ").value = ""; setFilter("All", ""); return }
  const b = e.target.closest("[data-v]"); if (b) openProfile(+b.dataset.v, !!b.dataset.contact)
});
$("talent").addEventListener("click", () => { setFilter("All", ""); $("explore").scrollIntoView(); toast("Browse students below and tap Contact Student to share your event brief.") });
$("menu").addEventListener("click", () => { const o = $("hdr").classList.toggle("open"); $("menu").setAttribute("aria-expanded", o) });
document.querySelectorAll(".links a").forEach(a => a.addEventListener("click", () => { $("hdr").classList.remove("open"); $("menu").setAttribute("aria-expanded", "false") }));
/* ===== Profile modal ===== */
const dlg = $("dlg"); let cur = null;
function openProfile(i, contact) {
  const p = P[i]; cur = p;
  $("mAv").innerHTML = p.av ? `<img src="${esc(p.av)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : esc(ini(p.n)); $("mAv").className = "av"; $("mAv").style.background = AV[i % 6];
  $("mName").textContent = p.n; $("mSub").textContent = [p.d, p.s].filter(Boolean).join(" · "); $("mBio").textContent = p.b; $("mFirst").textContent = p.n.split(" ")[0];
  $("mSvc").innerHTML = p.x.map(s => `<div><span><b>${esc(s.title)}</b><small>${esc(s.description)}</small></span>${s.price ? `<b class="pr">${esc(s.price)}</b>` : ""}</div>`).join("");
  $("pfBox").hidden = !p.pf.length;
  $("mPf").innerHTML = p.pf.map((u, k) => `<div style="background:url('${esc(u)}') center/cover" role="img" aria-label="Portfolio item ${k + 1}"></div>`).join("");
  $("cerr").textContent = ""; dlg.showModal(); dlg.scrollTop = 0;
  if (contact) setTimeout(() => { $("cf").scrollIntoView({ block: "center" }); $("cm").focus() }, 60)
}
$("close").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close() });
/* ===== Send message: Edge Function saves it and emails the student via your SMTP ===== */
$("cf").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("cm").value.trim(), err = t => $("cerr").textContent = t;
  if (msg.length < 5) return err("Write a short message first.");
  if (!CS.ok) return err("Supabase isn't connected yet. Check config.js.");
  if (!(await CS.session())) { toast("Please log in to message students."); location.href = "login.html?next=index.html"; return }
  $("csend").disabled = true; err("Sending…");
  const { data, error } = await CS.sb.functions.invoke("send-message", { body: { student_id: cur.id, message: msg } });
  $("csend").disabled = false;
  let reason = data && data.error;
  if (error && !reason) { try { reason = (await error.context.json()).error } catch (_) { reason = error.message } }
  if (reason) return err(reason);
  dlg.close(); err(""); e.target.reset(); toast("Message sent to " + cur.n.split(" ")[0] + ".");
});
/* ===== Login-aware nav + Offer a Service guard ===== */
$("offerBtn").addEventListener("click", async () => {
  const s = CS.ok ? await CS.session() : null;   // logged in -> skill page, otherwise -> login (then back to skill page)
  location.href = s ? "skill.html" : "login.html?next=skill.html";
});
(async () => {
  if (!CS.ok) return;
  const s = await CS.session(); if (!s) return;
  const p = await CS.profile(s.user.id), name = (p && p.full_name) || s.user.email;
  const pic = p && p.avatar_url ? `<img class="mini" src="${esc(p.avatar_url)}" alt="">` : `<span class="mini" aria-hidden="true">${esc(ini(name))}</span>`;
  $("loginBtn").style.display = "none";
  $("profBtn").innerHTML = `${pic} ${esc(name.split(" ")[0])}`; $("profBtn").style.display = "inline-flex";
})();
renderCats(); loadStudents();
