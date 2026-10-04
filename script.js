/* ===== UI config (not data): category names + icons. Student data comes from Supabase. ===== */
const CATS = [["Graphic Design", "🎨"], ["Video Editing", "🎬"], ["Photography", "📸"], ["Web Development", "💻"], ["Presentation Design", "📊"], ["Tutoring & Academics", "📚"], ["Computer Assistance", "🛠️"]];
const EM = Object.fromEntries(CATS);
const G = ["linear-gradient(135deg,#6366F1,#A5B4FC)", "linear-gradient(135deg,#0D9488,#5EEAD4)", "linear-gradient(135deg,#F59E0B,#FCD34D)", "linear-gradient(135deg,#EC4899,#F9A8D4)", "linear-gradient(135deg,#0EA5E9,#7DD3FC)", "linear-gradient(135deg,#8B5CF6,#C4B5FD)"];
const AV = ["#4338CA", "#0D9488", "#DB2777", "#D97706", "#0284C7", "#7C3AED"];
let P = [], RT = {}, cat = "All", term = "", rating = 0;
const { $, esc, ini, toast } = CS;

/* ===== Helpers ===== */
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
const list = s => (s || "").split(",").map(x => x.trim()).filter(Boolean);
const stars = a => { const r = Math.round(a); return "★".repeat(r) + "☆".repeat(5 - r) };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
// highest-rated skill of a student (ties: more reviews wins)
function topOf(p) { let b = null; p.x.forEach(s => { const r = RT[s.id]; if (r && (!b || r.avg > b.avg || (r.avg === b.avg && r.n > b.n))) b = { title: s.title, avg: r.avg, n: r.n } }); return b }
// YouTube link -> embedded player, direct video file -> <video>, anything else -> plain link
function embed(u) {
  u = safeUrl(u); if (!u) return "";
  const y = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (y) return `<div class="vid"><iframe src="https://www.youtube.com/embed/${y[1]}" loading="lazy" allowfullscreen title="Project video"></iframe></div>`;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return `<div class="vid"><video controls preload="metadata" playsinline src="${esc(u)}"></video></div>`;
  return `<a class="btn btn-o btn-sm" href="${esc(u)}" target="_blank" rel="noopener noreferrer">▶ Watch video</a>`;
}

/* ===== Load students from Supabase: "students" view (safe public columns) + "skills" table ===== */
const empty = m => `<div class="empty">${m}</div>`;
async function loadStudents() {
  if (!CS.ok) { $("grid").innerHTML = empty("<strong>Connect Supabase</strong> by adding your URL and anon key in config.js."); return }
  $("grid").innerHTML = empty("Loading students…");
  const [st, sk, rt, pj] = await Promise.all([
    CS.sb.from("students").select("*").limit(500),
    CS.sb.from("skills").select("*").order("created_at").limit(2000),
    CS.sb.from("skill_ratings").select("*").limit(2000),
    CS.sb.from("projects").select("*").order("created_at", { ascending: false }).limit(2000)]);
  if (st.error || sk.error) { $("grid").innerHTML = empty("Could not load students: " + esc((st.error || sk.error).message)); return }
  // ratings and projects are optional: if 4_ratings_projects.sql hasn't been run yet, the cards still load
  (rt.data || []).forEach(r => RT[r.skill_id] = { avg: Number(r.avg_rating), n: r.review_count });
  const by = {}; sk.data.forEach(s => (by[s.user_id] = by[s.user_id] || []).push(s));
  const pjBy = {}; (pj.data || []).forEach(x => (pjBy[x.user_id] = pjBy[x.user_id] || []).push(x));
  P = st.data.filter(s => by[s.id]).map(s => {
    const k = by[s.id];
    return {
      id: s.id, n: s.full_name, d: [s.department, s.college].filter(Boolean).join(" · "), c: k[0].category,
      cats: [...new Set(k.map(x => x.category))], s: s.headline || k[0].title, b: s.bio || k[0].description, av: s.avatar_url, x: k, pj: pjBy[s.id] || [],
      t: [...new Set(k.flatMap(x => list(x.tags)))].slice(0, 4), pf: list(s.portfolio)
    };
  });
  P.forEach(p => p.top = topOf(p));
  P.sort((a, b) => (b.top ? b.top.avg : 0) - (a.top ? a.top.avg : 0) || (b.top ? b.top.n : 0) - (a.top ? a.top.n : 0));   // best rated first
  renderCats(); render();
}

/* ===== Render categories (counts computed from data) + dropdown ===== */
$("heroCat").innerHTML += CATS.map(c => `<option>${c[0]}</option>`).join("");
function renderCats() { $("cats").innerHTML = CATS.map(c => `<button class="cat" data-c="${c[0]}" aria-pressed="${cat === c[0]}"><i>${c[1]}</i><b>${c[0]}</b><small>${P.filter(p => p.cats.includes(c[0])).length} students</small></button>`).join("") }
/* ===== Render marketplace cards ===== */
const cardImg = p => p.pf[0] || list(p.pj[0] && p.pj[0].images)[0] || "";
const rateLine = p => p.top ? `<div class="rate" title="Highest rated skill"><span class="stars" aria-hidden="true">${stars(p.top.avg)}</span><b>${p.top.avg.toFixed(1)}</b><small>Top skill: ${esc(p.top.title)} · ${plural(p.top.n, "review")}</small></div>` : `<div class="rate"><small>No reviews yet</small></div>`;
const projLine = p => { if (!p.pj.length) return ""; const gh = safeUrl((p.pj.find(x => /github\.com/i.test(x.github_url || "")) || {}).github_url);
  return `<div class="proj">📁 ${plural(p.pj.length, "project")}${gh ? ` · <a href="${esc(gh)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ""}</div>` };
function render() {
  const l = P.map((p, i) => ({ p, i })).filter(({ p }) => (cat === "All" || p.cats.includes(cat)) && (p.n + p.s + p.b + p.cats.join(" ") + p.t.join(" ")).toLowerCase().includes(term));
  $("count").textContent = l.length ? `${l.length} student${l.length > 1 ? "s" : ""} ${cat === "All" ? "" : "in " + cat}${term ? ` matching “${term}”` : ""}` : "";
  $("grid").innerHTML = l.length ? l.map(({ p, i }) => `<article class="card"><div class="thumb" style="background:${cardImg(p) ? `url('${esc(cardImg(p))}') center/cover` : G[i % 6]}" aria-hidden="true"><span class="badge">${esc(p.c)}</span>${cardImg(p) ? "" : EM[p.c] || "✨"}</div>
  <div class="cb"><div class="who">${p.av ? `<img class="av" src="${esc(p.av)}" alt="" style="object-fit:cover">` : `<span class="av" style="background:${AV[i % 6]}">${esc(ini(p.n))}</span>`}<div><b>${esc(p.n)}</b><small>${esc(p.d)}</small></div></div>
  <div class="skill">${esc(p.s)}</div>${rateLine(p)}<div class="tags">${p.t.map(t => `<span>#${esc(t.replace(/\s/g, ""))}</span>`).join("")}</div>${projLine(p)}<p class="bio">${esc(p.b)}</p>
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
  fillServices(p);
  $("pjBox").hidden = !p.pj.length;
  $("mPj").innerHTML = p.pj.map(x => { const g = safeUrl(x.github_url), im = list(x.images);
    return `<div class="pj"><h4>${esc(x.title)}</h4>${x.description ? `<p>${esc(x.description)}</p>` : ""}${g ? `<div><a class="btn btn-o btn-sm" href="${esc(g)}" target="_blank" rel="noopener noreferrer">🔗 View on GitHub</a></div>` : ""}
      ${im.length ? `<div class="pj-imgs">${im.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="${esc(x.title)} screenshot" loading="lazy"></a>`).join("")}</div>` : ""}${embed(x.video_url)}</div>` }).join("");
  $("pfBox").hidden = !p.pf.length;
  $("mPf").innerHTML = p.pf.map((u, k) => `<div style="background:url('${esc(u)}') center/cover" role="img" aria-label="Portfolio item ${k + 1}"></div>`).join("");
  $("rv-skill").innerHTML = p.x.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join("");
  setRating(0); $("rv-text").value = ""; $("rv-msg").textContent = ""; loadReviews(p);
  $("cerr").textContent = ""; dlg.showModal(); dlg.scrollTop = 0;
  if (contact) setTimeout(() => { $("cf").scrollIntoView({ block: "center" }); $("cm").focus() }, 60)
}
function fillServices(p) {
  $("mSvc").innerHTML = p.x.map(s => { const r = RT[s.id];
    return `<div><span><b>${esc(s.title)}</b><small>${r ? `<span class="stars">${stars(r.avg)}</span> ${r.avg.toFixed(1)} (${plural(r.n, "review")}) · ` : "No reviews yet · "}${esc(s.description)}</small></span>${s.price ? `<b class="pr">${esc(s.price)}</b>` : ""}</div>` }).join("");
}
async function loadReviews(p) {
  $("mRev").innerHTML = '<p class="sub" style="margin:0">Loading reviews…</p>';
  const { data, error } = await CS.sb.from("reviews").select("*").in("skill_id", p.x.map(s => s.id)).order("created_at", { ascending: false }).limit(50);
  if (cur !== p) return;
  if (error) { $("mRev").innerHTML = '<p class="sub" style="margin:0">Reviews are unavailable right now.</p>'; return }
  const ttl = Object.fromEntries(p.x.map(s => [s.id, s.title]));
  $("mRev").innerHTML = data.length ? data.map(r => `<div class="rv"><div class="rv-h"><b>${esc(r.reviewer_name || "Student")}</b><span class="stars">${stars(r.rating)}</span><small>${esc(ttl[r.skill_id] || "")} · ${esc(new Date(r.created_at).toLocaleDateString())}</small></div>${r.comment ? `<p>${esc(r.comment)}</p>` : ""}</div>`).join("") : '<p class="sub" style="margin:0">No reviews yet. Be the first to review.</p>';
}
function setRating(n) { rating = n; document.querySelectorAll("#rv-stars .star").forEach(b => b.classList.toggle("on", +b.dataset.s <= n)) }
$("rv-stars").addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b) setRating(+b.dataset.s) });
$("rf").addEventListener("submit", async e => {
  e.preventDefault();
  const say = t => $("rv-msg").textContent = t;
  if (!CS.ok) return say("Supabase isn't connected yet.");
  const s = await CS.session();
  if (!s) { toast("Please log in to leave a review."); location.href = "login.html?next=index.html"; return }
  if (s.user.id === cur.id) return say("You can't review your own skill.");
  if (!rating) return say("Pick 1 to 5 stars first.");
  $("rv-send").disabled = true; say("Saving…");
  const { error } = await CS.sb.from("reviews").upsert({ skill_id: $("rv-skill").value, rating, comment: $("rv-text").value.trim() || null }, { onConflict: "skill_id,reviewer_id" });
  $("rv-send").disabled = false;
  if (error) return say(error.message);
  const rt = await CS.sb.from("skill_ratings").select("*").in("skill_id", cur.x.map(x => x.id));   // refresh stars everywhere
  (rt.data || []).forEach(r => RT[r.skill_id] = { avg: Number(r.avg_rating), n: r.review_count });
  cur.top = topOf(cur); render(); fillServices(cur); loadReviews(cur); setRating(0); $("rv-text").value = ""; say("Thanks! Your review is posted.");
});
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
  dlg.close(); err(""); e.target.reset();
  toast(data && data.emailed === false ? "Message saved in " + cur.n.split(" ")[0] + "'s inbox, but the email notification could not be sent." : "Message sent to " + cur.n.split(" ")[0] + ".");
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
