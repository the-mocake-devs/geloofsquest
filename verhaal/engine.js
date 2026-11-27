/* Scène-engine: alles in het geheugen, niets wordt opgeslagen. */
const G = {trust:0, xp:0, journal:[]};
const $ = s => document.querySelector(s);
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
const view = $("#view");

function hud() { $("#hTrust").textContent = "🤝 " + G.trust; $("#hXp").textContent = "⭐ " + G.xp + " XP"; }
function head(s) { return `<div class="who"><span class="av">${WHO[s.who] || "💬"}</span>${s.who}</div><p>${s.text}</p>`; }
function shake(el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function next(id) { go(id); }

const R = {
  say(s) { view.innerHTML = `<div class="box">${head(s)}<button class="btn p" id="n">Verder</button></div>`; $("#n").onclick = () => next(s.next); },

  choice(s) {
    view.innerHTML = `<div class="box">${head(s)}${s.options.map((o, i) => `<button class="opt" data-i="${i}">${o.t}</button>`).join("")}<div id="f"></div></div>`;
    view.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      const o = s.options[b.dataset.i]; G.trust += o.trust || 0; hud();
      if (!o.reflect) return next(o.next);
      view.querySelectorAll(".opt").forEach(x => x.disabled = true); b.classList.add("ok");
      $("#f").innerHTML = `<div class="hint">💭 ${o.reflect}</div><button class="btn p" id="n">Verder</button>`; $("#n").onclick = () => next(o.next);
    });
  },

  quiz(s) {
    const ans = shuffle(s.answers.map((t, i) => ({t, ok: i === s.correct}))); let first = true;
    view.innerHTML = `<div class="box">${head(s)}${ans.map((a, i) => `<button class="opt" data-i="${i}">${a.t}</button>`).join("")}<div id="f"></div></div>`;
    view.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      if (ans[b.dataset.i].ok) {
        view.querySelectorAll(".opt").forEach(x => x.disabled = true); b.classList.add("ok");
        if (first) G.xp += 10; hud();
        $("#f").innerHTML = `<div class="hint">✅ ${s.explain}</div><button class="btn p" id="n">Verder</button>`; $("#n").onclick = () => next(s.next);
      } else { first = false; b.disabled = true; b.classList.add("no"); shake(b); $("#f").innerHTML = `<div class="hint">Nog niet helemaal. Probeer een ander antwoord.</div>`; }
    });
  },

  order(s) {
    let step = 0; const pool = shuffle(s.items);
    view.innerHTML = `<div class="box">${head(s)}<div class="hint" id="done">Jouw volgorde: …</div><div class="chips">${pool.map(t => `<button class="opt">${t}</button>`).join("")}</div><div id="f"></div></div>`;
    view.querySelectorAll(".chips .opt").forEach(b => b.onclick = () => {
      if (b.textContent === s.items[step]) {
        step++; b.disabled = true; b.classList.add("ok"); $("#done").textContent = "Jouw volgorde: " + s.items.slice(0, step).join(" → ");
        if (step === s.items.length) { G.xp += 15; hud(); $("#f").innerHTML = `<div class="hint">✅ ${s.explain}</div><button class="btn p" id="n">Verder</button>`; $("#n").onclick = () => next(s.next); }
      } else shake(b);
    });
  },

  sort(s) {
    let i = 0; view.innerHTML = `<div class="box">${head(s)}<div class="hint" id="cur"></div><div class="chips">${s.buckets.map((t, k) => `<button class="opt" data-k="${k}">${t}</button>`).join("")}</div><div id="f"></div></div>`;
    const show = () => $("#cur").innerHTML = `Teken: <b>${s.items[i][0]}</b> (${i + 1}/${s.items.length})`; show();
    view.querySelectorAll(".chips .opt").forEach(b => b.onclick = () => {
      if (+b.dataset.k === s.items[i][1]) {
        G.xp += 5; hud(); i++;
        if (i === s.items.length) { $("#cur").textContent = "Alles gesorteerd!"; $("#f").innerHTML = `<div class="hint">✅ ${s.explain}</div><button class="btn p" id="n">Verder</button>`; $("#n").onclick = () => next(s.next); }
        else show();
      } else shake(b);
    });
  },

  get(s) {
    G.journal.push({icon: s.icon, name: s.name, text: s.text});
    view.innerHTML = `<div class="box card"><div class="big">${s.icon}</div><h2>${s.name}</h2><p>${s.text}</p><button class="btn p" id="n">Verder</button></div>`;
    $("#n").onclick = () => next(s.next);
  },

  end(s) {
    view.innerHTML = `<div class="box card"><div class="big">🏆</div><h2>${s.text}</h2><p>${G.xp} XP · vertrouwen van Noor: ${G.trust} · ${G.journal.length} blad(en) in je dagboek</p><button class="btn p" id="n">Opnieuw beginnen</button></div>`;
    $("#n").onclick = () => { G.trust = 0; G.xp = 0; G.journal = []; hud(); go(START); };
  }
};

function go(id) {
  const s = SCENES[id]; if (!s) return console.error("Scène niet gevonden:", id);
  $("#stage").className = "stage " + (s.bg || "w0"); R[s.type](s); scrollTo(0, 0);
}
$("#hJ").onclick = () => { $("#jList").innerHTML = G.journal.length ? G.journal.map(e => `<div class="entry"><b>${e.icon} ${e.name}</b><p>${e.text}</p></div>`).join("") : "<p>Nog niets gevonden.</p>"; $("#journal").hidden = false; };
$("#jClose").onclick = () => $("#journal").hidden = true;
hud(); go(START);
