(() => {
  const BASE = window.SJ_BASE || "";
  const $ = s => document.querySelector(s);
  const state = { players: [], logs: [] };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const fmt = value => value ? new Date(value).toLocaleString("nl-BE") : "—";
  const level = xp => Math.floor((Number(xp) || 0) / 100) + 1;
  const number = value => (Number(value) || 0).toLocaleString("nl-BE");

  function alertUser(message, error = false) {
    const el = $("#alert");
    el.textContent = message;
    el.classList.toggle("error", error);
    el.hidden = false;
    window.clearTimeout(alertUser.timer);
    alertUser.timer = window.setTimeout(() => { el.hidden = true; }, 5000);
  }

  async function api(path, options = {}) {
    const response = await fetch(BASE + path, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: { ...(options.headers || {}), ...(options.body ? {"content-type":"application/json"} : {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Er ging iets mis (${response.status}).`);
    return data;
  }

  function playerMarkup(p, mobile = false) {
    const isBanned = !!p.is_banned;
    const avatar = p.avatar
      ? `<span class="mod-avatar"><img src="${esc(p.avatar)}" alt=""></span>`
      : `<span class="mod-avatar">${esc((p.display_name || p.email || "?").trim().charAt(0).toUpperCase())}</span>`;
    const status = isBanned
      ? `<span class="mod-status banned">Geblokkeerd</span>`
      : p.online ? `<span class="mod-status">Recent actief</span>` : `<span class="mod-status offline">Niet recent actief</span>`;
    const actions = isBanned
      ? `<button class="mod-action" data-action="unban" data-id="${esc(p.id)}">Deblokkeren</button>`
      : `<button class="mod-action danger" data-action="tempban" data-id="${esc(p.id)}">Tijdelijk bannen</button>
         <button class="mod-action danger" data-action="permban" data-id="${esc(p.id)}">Permanent bannen</button>
         <button class="mod-action" data-action="kick" data-id="${esc(p.id)}">Sessie intrekken</button>`;
    const player = `<div class="mod-player">${avatar}<div><div class="mod-player-name">${esc(p.display_name || "Naamloos")}</div><div class="mod-player-email">${esc(p.email || "Geen e-mail")}</div><div class="mod-player-email">ID: ${esc(p.id)}</div></div></div>`;
    const progress = `<div class="mod-progress"><strong>Niveau ${level(p.xp)} · ${number(p.xp)} XP</strong><span>${number(p.correct)} juist · combo ${number(p.best_combo)} · ${(p.medals || []).length} medailles</span></div>`;
    if (mobile) return `<article class="mod-mobile-player">${player}<p>${progress}</p><p>${status} <span class="mod-subtle">Laatste activiteit: ${esc(fmt(p.last_seen))}</span></p><div class="mod-actions">${actions}</div></article>`;
    return `<tr><td>${player}</td><td>${progress}</td><td><span class="mod-subtle">${esc(fmt(p.last_seen))}</span></td><td>${status}</td><td><div class="mod-actions">${actions}</div></td></tr>`;
  }

  function renderPlayers() {
    const query = ($("#playerSearch").value || "").trim().toLowerCase();
    const filtered = state.players.filter(p =>
      [p.display_name, p.email, p.id].some(v => String(v || "").toLowerCase().includes(query))
    );
    $("#playersBody").innerHTML = filtered.length
      ? filtered.map(p => playerMarkup(p)).join("")
      : `<tr><td colspan="5" class="mod-empty">Geen spelers gevonden.</td></tr>`;
    $("#playersMobile").innerHTML = filtered.length
      ? filtered.map(p => playerMarkup(p, true)).join("")
      : `<div class="mod-empty">Geen spelers gevonden.</div>`;
  }

  function renderLogs() {
    $("#logsBody").innerHTML = state.logs.length ? state.logs.map(log => `
      <tr>
        <td><strong>${esc(log.action_label || log.action)}</strong></td>
        <td><span class="mod-subtle">${esc(log.target_user_id)}</span></td>
        <td>${esc(log.moderator_email)}</td>
        <td>${esc(log.reason || "—")}</td>
        <td><span class="mod-subtle">${esc(fmt(log.created_at))}</span></td>
      </tr>`).join("") : `<tr><td colspan="5" class="mod-empty">Nog geen moderatieacties.</td></tr>`;
  }

  function renderStats() {
    const total = state.players.length;
    const xp = state.players.reduce((sum, p) => sum + (Number(p.xp) || 0), 0);
    const avg = total ? state.players.reduce((sum, p) => sum + level(p.xp), 0) / total : 0;
    $("#statPlayers").textContent = number(total);
    $("#statLevel").textContent = avg ? avg.toFixed(1).replace(".", ",") : "0";
    $("#statXp").textContent = number(xp);
    $("#statBans").textContent = number(state.players.filter(p => p.is_banned).length);
  }

  async function load() {
    $("#refreshBtn").disabled = true;
    try {
      const session = await api("/api/session");
      if (!session.user) {
        location.href = BASE + "/auth/login?return=" + encodeURIComponent(BASE + "/panel/");
        return;
      }
      if (session.user.role !== "opadmin") {
        document.querySelector(".mod-main").innerHTML = `<section class="mod-card"><h1>Geen toegang</h1><p>Dit paneel is alleen toegankelijk voor bevoegde beheerders.</p><a class="btn" href="./">Terug naar SJBquest</a></section>`;
        return;
      }
      $("#panelUser").textContent = session.user.name || session.user.email || "Beheerder";
      const [players, logs] = await Promise.all([
        api("/api/moderation/players"),
        api("/api/moderation/logs")
      ]);
      state.players = players.players || [];
      state.logs = logs.logs || [];
      renderStats();
      renderPlayers();
      renderLogs();
    } catch (error) {
      alertUser(error.message, true);
    } finally {
      $("#refreshBtn").disabled = false;
    }
  }

  async function perform(action, id) {
    const player = state.players.find(p => p.id === id);
    if (!player) return;
    let reason = "";
    let hours = null;

    if (action === "unban") {
      if (!confirm(`De ban van ${player.display_name || player.email} opheffen?`)) return;
    } else if (action === "kick") {
      reason = prompt("Reden voor het intrekken van de sessie:");
      if (reason === null) return;
      reason = reason.trim();
      if (!reason) return alertUser("Geef een reden op.", true);
      if (!confirm("De huidige sessie van deze speler intrekken?")) return;
    } else {
      reason = prompt("Reden voor de ban:");
      if (reason === null) return;
      reason = reason.trim();
      if (!reason) return alertUser("Een ban vereist een reden.", true);
      if (action === "tempban") {
        const input = prompt("Hoeveel uur? (1 tot 8760)", "24");
        if (input === null) return;
        hours = Number(input);
        if (!Number.isInteger(hours) || hours < 1 || hours > 8760) return alertUser("Kies een aantal uur tussen 1 en 8760.", true);
      }
      if (!confirm(action === "permban" ? "Deze speler permanent bannen?" : `Deze speler ${hours} uur bannen?`)) return;
    }

    try {
      await api("/api/moderation/action", {
        method: "POST",
        body: JSON.stringify({ action, targetId: id, reason, hours })
      });
      alertUser("Moderatieactie uitgevoerd.");
      await load();
    } catch (error) {
      alertUser(error.message, true);
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (button) perform(button.dataset.action, button.dataset.id);
  });
  $("#playerSearch").addEventListener("input", renderPlayers);
  $("#refreshBtn").addEventListener("click", load);
  load();
})();
