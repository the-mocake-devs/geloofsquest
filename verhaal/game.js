(() => {
  const {W, H, water, trees, stations, atlas} = WORLD;
  const cv = document.getElementById("cv"), c = cv.getContext("2d"), ov = document.getElementById("ov"), mini = document.getElementById("mini");
  const P = {x: 220, y: 250, r: 11, bob: 0, moving: false};
  const keys = {}; let target = null, open = false, stones = 0, xp = 0, t = 0, last = performance.now(), finalDone = false;
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const rects = [...water, ...stations.map(s => s.rect)];
  stations.forEach(s => { const [x, y, w, h] = s.rect; s.dx = x + w / 2; s.dy = y + h + 16; s.armed = true; s.done = false; });
  const A = {dx: atlas.x, dy: atlas.y, armed: true};

  function toast(m) { const e = document.getElementById("toast"); e.textContent = m; e.classList.add("show"); clearTimeout(toast.i); toast.i = setTimeout(() => e.classList.remove("show"), 2400); }
  function hud() { document.getElementById("hSt").textContent = "🪨 " + stones + "/" + stations.length; document.getElementById("hXp").textContent = "⭐ " + xp + " XP"; }
  function confetti() {
    const f = document.getElementById("cf"), x = f.getContext("2d"); f.width = innerWidth; f.height = innerHeight;
    const col = ["#f4c542", "#3f806d", "#153c6b", "#eaf2fb"], p = Array.from({length: 120}, () => ({x: Math.random() * f.width, y: -20, vx: Math.random() * 4 - 2, vy: Math.random() * 4 + 2, s: Math.random() * 8 + 4, c: col[Math.random() * 4 | 0]}));
    let n = 0; (function tick() { x.clearRect(0, 0, f.width, f.height); p.forEach(q => { q.x += q.vx; q.y += q.vy; x.fillStyle = q.c; x.fillRect(q.x, q.y, q.s, q.s); }); if (++n < 140) requestAnimationFrame(tick); else x.clearRect(0, 0, f.width, f.height); })();
  }

  /* ---------- beweging ---------- */
  const pos = e => { const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height}; };
  let down = false;
  cv.onpointerdown = e => { down = true; target = pos(e); };
  cv.onpointermove = e => { if (down) target = pos(e); };
  addEventListener("pointerup", () => down = false);
  addEventListener("keydown", e => { const k = e.key.toLowerCase(); if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault(); keys[k] = true; target = null; });
  addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  function blocked(x, y) {
    if (x < 12 || y < 12 || x > W - 12 || y > H - 12) return true;
    for (const [rx, ry, rw, rh] of rects) { const nx = Math.max(rx, Math.min(x, rx + rw)), ny = Math.max(ry, Math.min(y, ry + rh)); if (Math.hypot(x - nx, y - ny) < P.r) return true; }
    return trees.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < P.r + 10);
  }
  function update(dt) {
    let dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    if (!dx && !dy && target) { const vx = target.x - P.x, vy = target.y - P.y, d = Math.hypot(vx, vy); if (d < 5) target = null; else { dx = vx / d; dy = vy / d; } }
    P.moving = !!(dx || dy);
    if (P.moving) { const l = Math.hypot(dx, dy) || 1, sp = 150 * dt; dx = dx / l * sp; dy = dy / l * sp;
      if (!blocked(P.x + dx, P.y)) P.x += dx; if (!blocked(P.x, P.y + dy)) P.y += dy; P.bob += dt * 12; }
    for (const s of [...stations, A]) {
      const d = Math.hypot(P.x - s.dx, P.y - s.dy); if (d > 60) s.armed = true;
      if (d < 26 && s.armed && !open && !s.done) { s.armed = false; s === A ? enterAtlas() : enter(s); }
    }
  }

  /* ---------- tekenen ---------- */
  function draw() {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#8fc59b"); g.addColorStop(1, "#6fae82"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "#e9dcae"; [[100,120,24,100],[100,222,500,24],[505,120,24,100],[100,340,24,12],[505,340,24,12],[300,40,50,0]].forEach(r => c.fillRect(...r));
    c.fillRect(120, 222, 180, 24); c.fillRect(340, 222, 160, 24); c.fillRect(310, 40, 20, 50);
    for (const [x, y, w, h] of water) { c.fillStyle = "#4d94c8"; c.fillRect(x, y, w, h); c.fillStyle = "rgba(255,255,255,.35)"; for (let i = 0; i < h; i += 28) c.fillRect(x + 8 + Math.sin(t * 2 + i) * 6, y + i, 20, 3); }
    c.fillStyle = "#a9794b"; c.fillRect(296, 224, 48, 52); c.fillStyle = "#8a5f38"; for (let i = 0; i < 52; i += 10) c.fillRect(296, 224 + i, 48, 2);
    for (const [x, y] of trees) { c.fillStyle = "#6b4a2b"; c.fillRect(x - 3, y, 6, 14); c.fillStyle = "#2f7a4f"; c.beginPath(); c.arc(x, y - 4, 16, 0, 7); c.fill(); }
    c.textAlign = "center";
    for (const s of stations) {
      const [x, y, w, h] = s.rect;
      c.fillStyle = s.color; c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill();
      c.fillStyle = "#153c6b"; c.beginPath(); c.moveTo(x - 6, y + 2); c.lineTo(x + w / 2, y - 24); c.lineTo(x + w + 6, y + 2); c.fill();
      c.fillStyle = "#6b4a2b"; c.fillRect(s.dx - 8, y + h - 18, 16, 18);
      c.font = "26px sans-serif"; c.fillText(s.icon, s.dx, y + h / 2 + 6);
      c.font = "700 11px sans-serif"; c.fillStyle = "#0d294b"; c.fillText(s.name, s.dx, y + h + 30);
      if (s.done) { c.font = "20px sans-serif"; c.fillText("✅", x + w - 6, y - 4); }
      else { c.strokeStyle = "rgba(244,197,66," + (.5 + .4 * Math.sin(t * 4)) + ")"; c.lineWidth = 4; c.beginPath(); c.arc(s.dx, s.dy, 18 + Math.sin(t * 4) * 2, 0, 7); c.stroke(); }
    }
    const ready = stones >= stations.length;
    c.font = "28px sans-serif"; c.fillStyle = "#0d294b"; c.fillText(finalDone ? "📖" : ready ? "📖" : "🔒", A.dx, A.dy + 8);
    if (ready && !finalDone) { c.strokeStyle = "rgba(244,197,66," + (.5 + .4 * Math.sin(t * 4)) + ")"; c.lineWidth = 4; c.beginPath(); c.arc(A.dx, A.dy, 22, 0, 7); c.stroke(); }
    const by = Math.sin(P.bob) * (P.moving ? 2 : 0);
    c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(P.x, P.y + 12, 11, 4, 0, 0, 7); c.fill();
    c.fillStyle = "#3f806d"; c.beginPath(); c.ellipse(P.x, P.y + 4 + by, 10, 9, 0, 0, 7); c.fill();
    c.fillStyle = "#f4c542"; c.beginPath(); c.arc(P.x, P.y - 8 + by, 9, 0, 7); c.fill();
    c.fillStyle = "#153c6b"; c.fillRect(P.x - 4, P.y - 10 + by, 2, 3); c.fillRect(P.x + 2, P.y - 10 + by, 2, 3);
    if (target) { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 2; c.beginPath(); c.arc(target.x, target.y, 8, 0, 7); c.stroke(); }
  }
  (function loop(now) { const dt = Math.min((now - last) / 1000, .05); last = now; t += dt; if (!open) update(dt); draw(); requestAnimationFrame(loop); })(last);

  /* ---------- minigames ---------- */
  const close = () => { open = false; ov.classList.add("off"); };
  const show = html => { open = true; ov.classList.remove("off"); mini.innerHTML = html; };
  const shake = el => { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
  const win = (html, done) => { mini.insertAdjacentHTML("beforeend", `<div class="hint">✅ ${html}</div><button class="btn p" id="ok">Verder</button>`); document.getElementById("ok").onclick = done; };
  const head = (s, extra) => `<h2>${s.icon || "📖"} ${s.title}</h2><p>${s.prompt || ""}</p>${extra || ""}`;
  const quit = `<button class="btn" id="x" style="margin-top:10px">Later terugkomen</button>`;
  const bindQuit = () => { const x = document.getElementById("x"); if (x) x.onclick = close; };

  const M = {
    order(s, done) {
      let n = 0; show(head(s, `<div class="hint" id="o">Volgorde: …</div><div class="row">${shuffle(s.items).map(i => `<button class="opt">${i}</button>`).join("")}</div>`) + quit); bindQuit();
      mini.querySelectorAll(".row .opt").forEach(b => b.onclick = () => {
        if (b.textContent === s.items[n]) { n++; b.disabled = true; b.classList.add("ok"); document.getElementById("o").textContent = "Volgorde: " + s.items.slice(0, n).join(" → "); if (n === s.items.length) win(s.explain, done); } else shake(b);
      });
    },
    sort(s, done) {
      let i = 0; show(head(s, `<div class="hint" id="cur"></div><div class="cols">${s.buckets.map((b, k) => `<button class="opt" data-k="${k}">${b}</button>`).join("")}</div>`) + quit); bindQuit();
      const cur = () => document.getElementById("cur").innerHTML = `<b>${s.items[i][0]}</b> (${i + 1}/${s.items.length})`; cur();
      mini.querySelectorAll(".cols .opt").forEach(b => b.onclick = () => {
        if (+b.dataset.k === s.items[i][1]) { i++; if (i === s.items.length) { document.getElementById("cur").textContent = "Alles gesorteerd!"; win(s.explain, done); } else cur(); } else shake(b);
      });
    },
    match(s, done) {
      let sel = null, left = s.pairs.length;
      const L = shuffle(s.pairs.map(p => p[0])), R = shuffle(s.pairs.map(p => p[1]));
      show(head(s, `<div class="cols"><div>${L.map(t => `<button class="opt" data-s="l">${t}</button>`).join("")}</div><div>${R.map(t => `<button class="opt" data-s="r">${t}</button>`).join("")}</div></div>`) + quit); bindQuit();
      mini.querySelectorAll(".cols .opt").forEach(b => b.onclick = () => {
        if (b.dataset.s === "l") { mini.querySelectorAll('[data-s="l"]').forEach(x => x.classList.remove("sel")); sel = b; b.classList.add("sel"); return; }
        if (!sel) return shake(b);
        if (s.pairs.some(p => p[0] === sel.textContent && p[1] === b.textContent)) { [sel, b].forEach(x => { x.classList.remove("sel"); x.classList.add("ok"); x.disabled = true; }); sel = null; if (!--left) win(s.explain, done); }
        else { shake(b); shake(sel); }
      });
    }
  };

  function enter(s) { M[s.type](s, () => { s.done = true; stones++; xp += 20; hud(); close(); toast("🪨 Verhaalsteen gevonden: " + s.name); }); }
  function enterAtlas() {
    if (stones < stations.length) { toast("De Atlas wacht op " + (stations.length - stones) + " verhaalsteen(en)."); return; }
    let i = 0, first = true; const Q = FINALE.questions;
    const ask = () => {
      const q = Q[i], ans = shuffle(q.a.map((t, k) => ({t, ok: k === q.c})));
      show(`<h2>📖 ${FINALE.title}</h2><p>${i === 0 ? FINALE.stone : ""}</p><p><b>${q.q}</b> (${i + 1}/${Q.length})</p>${ans.map(a => `<button class="opt" style="display:block;width:100%">${a.t}</button>`).join("")}`);
      mini.querySelectorAll(".opt").forEach((b, k) => b.onclick = () => {
        if (ans[k].ok) { i++; if (i < Q.length) ask(); else finish(); } else { b.classList.add("no"); b.disabled = true; shake(b); }
      });
    };
    ask();
  }
  function finish() {
    finalDone = true; A.done = true; xp += 30; hud(); confetti();
    show(`<h2>🏆 Het eerste blad is terug!</h2><p>Je verzamelde ${stones} verhaalstenen en herstelde de Atlas. De Stilte trekt zich terug. Voorlopig.</p><p class="hint">${xp} XP behaald. Meer werelden volgen!</p><button class="btn p" id="r">Opnieuw spelen</button>`);
    document.getElementById("r").onclick = () => location.reload();
  }

  show(`<h2>De Verloren Atlas</h2><p>De Atlas is uit elkaar gevallen en zijn kracht zit in vier verhaalstenen verstopt in dit dorp. Vind ze, speel de uitdagingen en herstel de Atlas.</p><button class="btn p" id="go">Start</button>`);
  document.getElementById("go").onclick = close; hud();
})();
