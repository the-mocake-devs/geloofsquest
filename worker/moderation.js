const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }
});

const safeJson = value => {
  try { return JSON.parse(value || "[]"); } catch { return []; }
};

async function moderatorFor(user, env) {
  if (!user?.sub) return null;

  const row = await env.DB.prepare(
    "SELECT microsoft_sub, email, role FROM users WHERE microsoft_sub=?"
  ).bind(user.sub).first();

  const configuredOpadmins = (env.OPADMIN_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (
    !row ||
    row.role !== "opadmin" ||
    !configuredOpadmins.includes(String(row.email || "").toLowerCase())
  ) {
    return null;
  }

  return row;
}
async function listPlayers(env) {
  const result = await env.DB.prepare(`
    SELECT u.id, u.microsoft_sub, u.email, u.display_name, u.avatar, u.role,
           u.is_banned, u.banned_until, u.ban_reason, u.last_seen,
           COALESCE(p.xp, 0) AS xp,
           COALESCE(p.correct, 0) AS correct,
           COALESCE(p.best_combo, 0) AS best_combo,
           COALESCE(p.medals, '[]') AS medals
    FROM users u
    LEFT JOIN progress p ON p.user_id = u.microsoft_sub
    ORDER BY u.created_at DESC
  `).all();

  const now = Date.now();
  return (result.results || []).map(row => {
    const expired = row.is_banned && row.banned_until && Date.parse(row.banned_until) <= now;
    return {
      id: row.microsoft_sub,
      email: row.email,
      display_name: row.display_name,
      avatar: row.avatar,
      role: row.role,
      is_banned: !!row.is_banned && !expired,
      banned_until: row.banned_until,
      ban_reason: row.ban_reason,
      last_seen: row.last_seen,
      online: !!row.last_seen && now - Date.parse(row.last_seen) < 5 * 60 * 1000,
      xp: Number(row.xp) || 0,
      correct: Number(row.correct) || 0,
      best_combo: Number(row.best_combo) || 0,
      medals: safeJson(row.medals)
    };
  });
}

async function logAction(env, targetId, moderatorEmail, action, reason) {
  await env.DB.prepare(`
    INSERT INTO moderation_logs (target_user_id, moderator_email, action, reason, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(targetId, moderatorEmail, action, reason || null, new Date().toISOString()).run();
}

export async function handleModeration(req, env, path, sessionUser) {
  if (!sessionUser) return json({ error: "Niet ingelogd." }, 401);
  const moderator = await moderatorFor(sessionUser, env);
  if (!moderator) return json({ error: "Geen toegang." }, 403);

  if (req.method === "GET" && path === "/api/moderation/players") {
    return json({ players: await listPlayers(env) });
  }

  if (req.method === "GET" && path === "/api/moderation/logs") {
    const result = await env.DB.prepare(`
      SELECT id, target_user_id, moderator_email, action, reason, created_at
      FROM moderation_logs ORDER BY id DESC LIMIT 100
    `).all();
    const labels = {
      ban_permanent: "Permanente ban",
      ban_temporary: "Tijdelijke ban",
      unban: "Ban opgeheven",
      kick: "Sessie ingetrokken"
    };
    return json({
      logs: (result.results || []).map(row => ({
        ...row,
        action_label: labels[row.action] || row.action
      }))
    });
  }

  if (req.method === "POST" && path === "/api/moderation/action") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Ongeldige JSON." }, 400); }

    const targetId = String(body.targetId || "").slice(0, 200);
    const action = String(body.action || "");
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!targetId || !["ban_permanent", "permban", "ban_temporary", "tempban", "unban", "kick"].includes(action)) {
      return json({ error: "Ongeldige actie of speler." }, 400);
    }
    if (action !== "unban" && !reason) return json({ error: "Een reden is verplicht." }, 400);

    const target = await env.DB.prepare(
      "SELECT microsoft_sub, email, role FROM users WHERE microsoft_sub=?"
    ).bind(targetId).first();
    if (!target) return json({ error: "Speler niet gevonden." }, 404);
    if (target.role === "admin") return json({ error: "Beheerders kunnen niet via dit paneel worden gemodereerd." }, 403);
    if (target.microsoft_sub === moderator.microsoft_sub) return json({ error: "Je kunt jezelf niet modereren." }, 403);

    const now = new Date().toISOString();

    if (action === "unban") {
      await env.DB.prepare(`
        UPDATE users SET is_banned=0, banned_until=NULL, ban_reason=NULL,
          session_version=session_version+1 WHERE microsoft_sub=?
      `).bind(targetId).run();
      await logAction(env, targetId, moderator.email, "unban", reason || "Ban opgeheven");
      return json({ ok: true });
    }

    if (action === "kick") {
      await env.DB.prepare(
        "UPDATE users SET session_version=session_version+1 WHERE microsoft_sub=?"
      ).bind(targetId).run();
      await logAction(env, targetId, moderator.email, "kick", reason);
      return json({ ok: true });
    }

    if (action === "ban_permanent" || action === "permban") {
      await env.DB.prepare(`
        UPDATE users SET is_banned=1, banned_until=NULL, ban_reason=?,
          session_version=session_version+1 WHERE microsoft_sub=?
      `).bind(reason, targetId).run();
      await logAction(env, targetId, moderator.email, "ban_permanent", reason);
      return json({ ok: true });
    }

    const hours = Number(body.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 8760) {
      return json({ error: "De duur moet tussen 1 en 8760 uur liggen." }, 400);
    }
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await env.DB.prepare(`
      UPDATE users SET is_banned=1, banned_until=?, ban_reason=?,
        session_version=session_version+1 WHERE microsoft_sub=?
    `).bind(until, reason, targetId).run();
    await logAction(env, targetId, moderator.email, "ban_temporary", reason);
    return json({ ok: true, banned_until: until });
  }

  return json({ error: "Niet gevonden." }, 404);
}
