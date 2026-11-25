/* FAITH RUNNER – 3 banen, toetsenbord + swipe, vragen met antwoordbanen. */
(() => {
  const W = 360, H = 600, PY = 480, LX = [60, 180, 300];
  let root, cv, c, raf, last, run = false, paused = false, S, best = 0, msgT;
  const $ = s => root.querySelector(s);
  const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

  const CSS = `.rn{max-width:400px;margin:0 auto}.rn-hud{display:flex;align-items:center;gap:12px;margin-bottom:8px}
  .rn-hud span{font:700 1.3rem "Space Grotesk",sans-serif;min-width:64px;color:var(--blue-dark)}.rn-hud .bar{flex:1}
  .rn-wrap{position:relative;border-radius:20px;overflow:hidden;box-shadow:var(--shadow);background:#fff}
  #rn-c{display:block;width:100%;height:auto;touch-action:none}
  #rn-q{position:absolute;top:10px;left:10px;right:10px;background:rgba(13,41,75,.93);color:#fff;padding:10px 12px;border-radius:14px;font-weight:700;display:none;text-align:center;font-size:.95rem}
  #rn-m{position:absolute;left:10px;right:10px;top:38%;background:#fff;border:2px solid var(--yellow);border-radius:14px;padding:10px;text-align:center;display:none;font-size:.9rem}
  #rn-ov{position:absolute;inset:0;background:rgba(234,242,251,.95);display:flex;align-items:center;justify-content:center;padding:18px;text-align:center}
  #rn-ov h2{margin-bottom:10px}#rn-ov p{margin-bottom:10px;font-size:.95rem}#rn-ov .btn{margin:4px}`;

  function start(r) {
    cleanup(); root = r;
    if (!document.getElementById("rn-css")) { const s = document.createElement("style"); s.id = "rn-css"; s.textContent = CSS; document.head.appendChild(s); }
    root.innerHTML = `<div class="rn"><div class="rn-hud"><span id="rn-s">0</span><div class="bar"><i id="rn-e" style="width:100%"></i></div>
      <button class="icon-btn" id="rn-p" aria-label="Pauze">⏸</button></div>
      <div class="rn-wrap"><canvas id="rn-c" width="${W}" height="${H}"></canvas><div id="rn-q"></div><div id="rn-m"></div><div id="rn-ov"></div></div></div>`;
    cv = $("#rn-c"); c = cv.getContext("2d");
    document.addEventListener("keydown", onKey); document.addEventListener("visibilitychange", onHide);
    let sx, sy;
    cv.onpointerdown = e => { sx = e.clientX; sy = e.clientY; };
    cv.onpointerup = e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1); else jump(); };
    $("#rn-p").onclick = togglePause;
    menu();
  }
  function cleanup() { run = false; cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onHide); }
  const ov = html => { const o = $("#rn-ov"); o.style.display = html ? "flex" : "none"; if (html) o.innerHTML = `<div>${html}</div>`; };

  function menu() {
    ov(`<h2>Faith Runner</h2>
      <p><b>Bewegen:</b> pijltjes links/rechts (of A/D), of veeg naar links/rechts.<br><b>Springen:</b> pijl omhoog, spatie of tik/veeg omhoog.</p>
      <p>Spring over de gele hindernissen. Wijk uit voor de grijze stenen. Verzamel munten, 🛡️ en ⭐.</p>
      <p>Verschijnt er een vraag? Ga naar de baan met het juiste antwoord. Fout kost energie.</p>
      <button class="btn primary" id="go">Start</button><button class="btn" id="back">Terug</button>`);
    $("#go").onclick = begin; $("#back").onclick = () => SJ.home();
  }
  function begin() {
    S = {t: 0, dist: 0, score: 0, energy: 100, lane: 1, x: LX[1], z: 0, vz: 0, inv: 0, obs: [], items: [], gate: null,
      spawn: 200, qt: 10, streak: 0, correct: 0, coins: 0, shield: 0, dbl: 0, shake: 0};
    ov(null); $("#rn-q").style.display = "none"; $("#rn-m").style.display = "none";
    paused = false; run = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  const loop = now => { const dt = Math.min((now - last) / 1000, .05); last = now; if (!paused && run) update(dt); draw(); if (run) raf = requestAnimationFrame(loop); };

  function move(d) { if (run && !paused) S.lane = Math.max(0, Math.min(2, S.lane + d)); }
  function jump() { if (run && !paused && S.z === 0) { S.vz = 640; SJ.beep(520, .06); } }
  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === "escape" || k === "p") return togglePause();
    if (["arrowleft", "arrowright", "arrowup", " "].includes(k)) e.preventDefault();
    if (k === "arrowleft" || k === "a") move(-1); else if (k === "arrowright" || k === "d") move(1);
    else if (k === "arrowup" || k === "w" || k === " ") jump();
  }
  const onHide = () => { if (document.hidden && run && !paused) togglePause(); };
  function togglePause() {
    if (!run) return; paused = !paused;
    if (paused) ov(`<h2>Gepauzeerd</h2><button class="btn primary" id="rs">Hervat</button><button class="btn" id="qt">Stoppen</button>`), $("#rs").onclick = togglePause, $("#qt").onclick = () => { run = false; menu(); };
    else { ov(null); last = performance.now(); }
  }
  function msg(t, ms) { const m = $("#rn-m"); m.innerHTML = t; m.style.display = "block"; clearTimeout(msgT); msgT = setTimeout(() => m.style.display = "none", ms || 1400); }

  function spawnRow() {
    const ln = shuffle([0, 1, 2]), n = S.t > 20 && Math.random() < .35 ? 2 : 1;
    for (let k = 0; k < n; k++) S.obs.push({lane: ln[k], y: -40, type: Math.random() < .5 ? "low" : "high"});
    const free = ln[n], r = Math.random();
    if (r < .55) for (let k = 0; k < 3; k++) S.items.push({lane: free, y: -40 - k * 50, type: "coin"});
    else if (r < .66) S.items.push({lane: free, y: -40, type: Math.random() < .5 ? "shield" : "star"});
    S.spawn = 340 - Math.min(S.t * 2.5, 140);
  }
  function spawnGate() {
    const q = SJ.pick({count: 1})[0]; if (!q) { S.qt = 20; return; }
    const wrong = shuffle(q.answers.filter((_, i) => i !== q.correct)).slice(0, 2);
    const opts = shuffle([{t: q.answers[q.correct], ok: true}, ...wrong.map(t => ({t, ok: false}))]);
    S.gate = {y: -90, opts, q, done: false, pick: -1};
    const b = $("#rn-q"); b.textContent = q.question; b.style.display = "block";
  }
  function hurt() {
    if (S.inv > 0) return;
    if (S.shield) { S.shield = 0; S.inv = 1; msg("🛡️ Schild gebruikt!"); return; }
    S.energy -= 20; S.inv = 1.2; S.shake = .3; SJ.beep(180, .2); if (S.energy <= 0) over();
  }
  function resolve(g) {
    g.done = true; g.pick = S.lane; $("#rn-q").style.display = "none";
    if (g.opts[S.lane].ok) {
      S.streak++; S.correct++; const bonus = 100 + Math.min(S.streak - 1, 4) * 25;
      S.score += bonus; S.energy = Math.min(100, S.energy + 15); SJ.addXp(5, {right: true, combo: S.streak}); SJ.beep(784);
      msg(`✨ Juist! +${bonus} punten${S.streak > 1 ? " · reeks x" + S.streak : ""}`, 1600); if (S.streak === 3) SJ.confetti();
    } else {
      S.streak = 0; S.energy -= 20; S.shake = .3; SJ.beep(220, .25);
      msg(`<b>Het juiste antwoord:</b> ${g.opts.find(o => o.ok).t}<br><small>${g.q.explanation}</small>`, 5000);
      if (S.energy <= 0) over();
    }
  }

  function update(dt) {
    S.t += dt;
    const sp = 230 + Math.min(S.t * 4, 230), g = S.gate, v = sp * (g && !g.done ? .5 : 1) * dt;
    S.dist += v; S.score += v * .05 * (S.dbl > 0 ? 2 : 1);
    S.x += (LX[S.lane] - S.x) * Math.min(1, dt * 14);
    if (S.z > 0 || S.vz > 0) { S.vz -= 1900 * dt; S.z += S.vz * dt; if (S.z <= 0) { S.z = 0; S.vz = 0; } }
    S.inv = Math.max(0, S.inv - dt); S.dbl = Math.max(0, S.dbl - dt); S.shake = Math.max(0, S.shake - dt);
    if (!g) {
      S.qt -= dt;
      if (S.qt <= 0) { if (!S.obs.some(o => o.y < 260)) spawnGate(); }
      else { S.spawn -= v; if (S.spawn <= 0) spawnRow(); }
    }
    S.obs.forEach(o => o.y += v); S.items.forEach(o => o.y += v);
    S.obs = S.obs.filter(o => o.y < H + 60); S.items = S.items.filter(o => o.y < H + 60 && !o.got);
    for (const o of S.obs) if (!o.hit && Math.abs(o.y - PY) < 26 && Math.abs(S.x - LX[o.lane]) < 38) {
      if (o.type === "low" && S.z > 28) continue; o.hit = true; hurt();
    }
    for (const it of S.items) if (Math.abs(it.y - PY) < 32 && Math.abs(S.x - LX[it.lane]) < 38) {
      it.got = true;
      if (it.type === "coin") { S.coins++; S.score += 10 * (S.dbl > 0 ? 2 : 1); SJ.beep(900, .05); }
      else if (it.type === "shield") { S.shield = 1; msg("🛡️ Schild!"); } else { S.dbl = 8; msg("⭐ Dubbele punten!"); }
    }
    if (g) { g.y += v; if (!g.done && g.y >= PY) resolve(g); if (g.y > H + 100) { S.gate = null; S.qt = 14; S.spawn = 250; } }
    $("#rn-s").textContent = Math.floor(S.score); $("#rn-e").style.width = Math.max(S.energy, 0) + "%";
  }

  function over() {
    run = false; cancelAnimationFrame(raf); draw(); $("#rn-q").style.display = "none";
    const sc = Math.floor(S.score), isBest = sc > best; if (isBest) best = sc;
    SJ.addXp(Math.floor(sc / 20)); if (isBest && sc > 50) SJ.confetti();
    ov(`<h2>Game over</h2><p style="font-size:2rem;font-weight:700;color:var(--green)">${sc} punten</p>
      <p>${isBest ? "🏆 Nieuw sessierecord!" : "Sessierecord: " + best}<br>${S.correct} juiste antwoorden · ${S.coins} munten</p>
      <button class="btn primary" id="again">Opnieuw</button><button class="btn" id="home">Startpagina</button>`);
    $("#again").onclick = begin; $("#home").onclick = () => SJ.home();
  }

  function wrap(t, maxW) {
    const lines = []; let cur = "";
    for (const w of t.split(" ")) { const tr = cur ? cur + " " + w : w; if (c.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; }
    lines.push(cur); return lines;
  }
  function draw() {
    if (!S) return;
    c.save(); if (S.shake > 0) c.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#eaf2fb"); bg.addColorStop(1, "#fff7d8");
    c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    c.strokeStyle = "rgba(21,60,107,.18)"; c.lineWidth = 2; c.setLineDash([24, 36]); c.lineDashOffset = -(S.dist % 60);
    [120, 240].forEach(x => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }); c.setLineDash([]);
    for (const o of S.obs) {
      if (o.type === "low") { c.fillStyle = "#f4c542"; c.fillRect(LX[o.lane] - 36, o.y - 10, 72, 20); c.fillStyle = "#153c6b"; for (let i = 0; i < 4; i++) c.fillRect(LX[o.lane] - 30 + i * 18, o.y - 10, 8, 20); }
      else { c.fillStyle = "#5b6b7f"; c.beginPath(); c.roundRect(LX[o.lane] - 32, o.y - 28, 64, 56, 12); c.fill(); }
    }
    for (const it of S.items) {
      if (it.type === "coin") { c.fillStyle = "#f4c542"; c.beginPath(); c.arc(LX[it.lane], it.y, 11, 0, 7); c.fill(); c.strokeStyle = "#c99a1c"; c.lineWidth = 3; c.stroke(); }
      else { c.font = "28px sans-serif"; c.textAlign = "center"; c.fillText(it.type === "shield" ? "🛡️" : "⭐", LX[it.lane], it.y + 10); }
    }
    const g = S.gate;
    if (g) g.opts.forEach((o, i) => {
      const x = LX[i], y = g.y;
      c.fillStyle = g.done ? (o.ok ? "#e6f3ee" : "#f3f4f6") : "#fff"; c.strokeStyle = g.done ? (o.ok ? "#3f806d" : i === g.pick ? "#c0504d" : "#e3e8ee") : "#153c6b"; c.lineWidth = 3;
      c.beginPath(); c.roundRect(x - 54, y - 42, 108, 84, 14); c.fill(); c.stroke();
      c.fillStyle = "#172231"; c.font = "700 12px 'DM Sans',sans-serif"; c.textAlign = "center";
      const ls = wrap(o.t, 96).slice(0, 5); ls.forEach((l, k) => c.fillText(l, x, y - (ls.length - 1) * 7.5 + k * 15 + 4));
    });
    const py = PY - S.z; c.fillStyle = "rgba(0,0,0,.15)"; c.beginPath(); c.ellipse(S.x, PY + 24, 20 - S.z / 12, 7, 0, 0, 7); c.fill();
    if (!(S.inv > 0 && Math.floor(S.inv * 12) % 2)) {
      c.fillStyle = "#3f806d"; c.beginPath(); c.roundRect(S.x - 15, py - 14, 30, 38, 10); c.fill();
      c.fillStyle = "#f4c542"; c.beginPath(); c.arc(S.x, py - 24, 12, 0, 7); c.fill();
      c.fillStyle = "#153c6b"; c.fillRect(S.x - 15, py - 6, 30, 5);
      if (S.shield) { c.strokeStyle = "#153c6b"; c.lineWidth = 3; c.beginPath(); c.arc(S.x, py - 4, 32, 0, 7); c.stroke(); }
    }
    if (S.dbl > 0) { c.fillStyle = "#153c6b"; c.font = "700 14px sans-serif"; c.textAlign = "right"; c.fillText("⭐ x2", W - 10, H - 12); }
    c.restore();
  }
  SJ.registerGame("runner", {start, stop: cleanup});
})();
