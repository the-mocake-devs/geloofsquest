/* SJBquest auth + data API. Public Microsoft OAuth (PKCE), D1 storage. */
const AUTH = "https://login.microsoftonline.com";
const SESSION_DAYS = 7;
let jwksCache = { at: 0, keys: [] };

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const redirect = (url, headers = {}) => {
  const h = new Headers(headers);
  h.set("Location", url);
  if (!h.has("cache-control")) h.set("cache-control", "no-store");
  return new Response(null, { status: 302, headers: h });
};
const safeParse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = s => {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
};
const decode = s => new TextDecoder().decode(fromB64url(s));
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

function cookies(req) {
  return Object.fromEntries((req.headers.get("cookie") || "").split(";").map(p => {
    const i = p.indexOf("=");
    return i < 0 ? [p.trim(), ""] : [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1))];
  }));
}
function setCookie(name, value, maxAge, req) {
  const host = new URL(req.url).hostname;
  const domain = host === "sjbijbel.app" || host.endsWith(".sjbijbel.app") ? "; Domain=.sjbijbel.app" : "";
  const secure = host === "localhost" || host.startsWith("127.") ? "" : "; Secure";
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}${domain}`;
}

async function sign(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const head = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${head}.${body}.${b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${head}.${body}`))))}`;
}
async function verify(token, secret) {
  const [head, body, sig] = (token || "").split(".");
  if (!head || !body || !sig) return null;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(sig), enc.encode(`${head}.${body}`));
    if (!ok) return null;
    const payload = JSON.parse(decode(body));
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch { return null; }
}

async function verifyMicrosoftToken(idToken, env, nonce) {
  const [head, body, sig] = idToken.split(".");
  const header = JSON.parse(decode(head));
  if (Date.now() - jwksCache.at > 3600_000 || !jwksCache.keys.length) {
    const res = await fetch(`${AUTH}/${env.MICROSOFT_TENANT}/discovery/v2.0/keys`);
    jwksCache = { at: Date.now(), keys: (await res.json()).keys || [] };
  }
  const jwk = jwksCache.keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error("Unknown signing key");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64url(sig), new TextEncoder().encode(`${head}.${body}`));
  if (!valid) throw new Error("Invalid ID token signature");
  const claims = JSON.parse(decode(body));
  if (claims.aud !== env.MICROSOFT_CLIENT_ID) throw new Error("Wrong audience");
  if (claims.nonce !== nonce) throw new Error("Wrong nonce");
  if (claims.exp < Date.now() / 1000) throw new Error("Expired token");
  return claims;
}

async function currentUser(req, env) {
  return verify(cookies(req).sq_session, env.SESSION_SECRET || (env.MICROSOFT_CLIENT_ID + "-dev"));
}
async function requireAdmin(req, env) {
  const user = await currentUser(req, env);
  if (!user || user.role !== "admin") return json({ error: "Forbidden" }, 403);
  return null;
}

async function login(req, url, env) {
  const verifier = random(64), state = random(), nonce = random();
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const returnTo = (url.searchParams.get("return") || "/").slice(0, 200);
  const oauth = b64url(new TextEncoder().encode(JSON.stringify({ v: verifier, s: state, n: nonce, r: returnTo })));
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: `${url.origin}/auth/callback`,
    scope: "openid profile email",
    state, nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  });
  return redirect(`${AUTH}/${env.MICROSOFT_TENANT}/oauth2/v2.0/authorize?${params}`,
    { "set-cookie": setCookie("oauth", oauth, 600, req) });
}

async function callback(req, url, env) {
  const raw = cookies(req).oauth;
  const o = raw ? JSON.parse(decode(raw)) : null;
  if (!o || url.searchParams.get("state") !== o.s) return json({ error: "Invalid state" }, 400);
  const code = url.searchParams.get("code");
  if (!code) return json({ error: "Missing code" }, 400);

  const res = await fetch(`${AUTH}/${env.MICROSOFT_TENANT}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", Origin: url.origin },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${url.origin}/auth/callback`,
      code_verifier: o.v,
      scope: "openid profile email"
    })
  });
  const tokens = await res.json();
  if (!tokens.id_token) return json({ error: tokens.error_description || "Token exchange failed" }, 401);
  const claims = await verifyMicrosoftToken(tokens.id_token, env, o.n);

  const sub = claims.sub || claims.oid;
  const email = claims.preferred_username || claims.email || "";
  const name = claims.name || email;
  const admins = (env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const role = admins.includes(email.toLowerCase()) ? "admin" : "player";
  const now = new Date().toISOString();

  await env.DB.prepare(`INSERT INTO users (id, microsoft_sub, email, display_name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(microsoft_sub) DO UPDATE SET email=excluded.email, role=excluded.role`)
    .bind(sub, sub, email, name, role, now).run();

  const session = await sign({ sub, email, name, role, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 },
    env.SESSION_SECRET || (env.MICROSOFT_CLIENT_ID + "-dev"));
  const headers = new Headers();
  headers.set("Location", o.r || "/");
  headers.set("cache-control", "no-store");
  headers.append("Set-Cookie", setCookie("sq_session", session, SESSION_DAYS * 86400, req));
  headers.append("Set-Cookie", setCookie("oauth", "", 0, req));
  return new Response(null, { status: 302, headers });
}

async function progress(req, env) {
  const user = await currentUser(req, env);
  if (!user) return json({ error: "Not signed in" }, 401);
  if (req.method === "GET") {
    const row = await env.DB.prepare("SELECT xp, correct, best_combo, medals FROM progress WHERE user_id=?").bind(user.sub).first();
    return json(row || { xp: 0, correct: 0, best_combo: 0, medals: "[]" });
  }
  if (req.method === "POST") {
    const b = await req.json();
    await env.DB.prepare(`INSERT INTO progress (user_id, xp, correct, best_combo, medals, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET xp=excluded.xp, correct=excluded.correct, best_combo=excluded.best_combo, medals=excluded.medals, updated_at=excluded.updated_at`)
      .bind(user.sub, Number(b.xp) || 0, Number(b.correct) || 0, Number(b.best_combo) || 0,
        JSON.stringify(b.medals || []), new Date().toISOString()).run();
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

async function questions(req, env, url) {
  if (req.method === "GET") {
    const rows = await env.DB.prepare("SELECT id, category, difficulty, question, answers, correct, explanation, suitable FROM questions ORDER BY id").all();
    const list = (rows.results || []).map(q => ({
      ...q,
      answers: safeParse(q.answers, []),
      suitable: safeParse(q.suitable, ["quiz"])
    }));
    return json(list);
  }
  const denied = await requireAdmin(req, env);
  if (denied) return denied;
  if (req.method === "POST" || req.method === "PUT") {
    const b = await req.json();
    const values = [String(b.category || ""), String(b.difficulty || "medium"), String(b.question || ""),
      JSON.stringify(b.answers || []), Number(b.correct) || 0, String(b.explanation || ""),
      JSON.stringify(b.suitable || ["quiz"]), Number(b.id)];
    const sql = req.method === "POST"
      ? "INSERT INTO questions (category, difficulty, question, answers, correct, explanation, suitable, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      : "UPDATE questions SET category=?, difficulty=?, question=?, answers=?, correct=?, explanation=?, suitable=? WHERE id=?";
    await env.DB.prepare(sql).bind(...values).run();
    return json({ ok: true });
  }
  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    await env.DB.prepare("DELETE FROM questions WHERE id=?").bind(Number(id)).run();
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/auth/login") return login(req, url, env);
      if (url.pathname === "/auth/callback") return callback(req, url, env);
      if (url.pathname === "/auth/logout") {
        return redirect("/", { "set-cookie": setCookie("sq_session", "", 0, req) });
      }
      if (url.pathname === "/api/session") {
        if (url.searchParams.has("debug")) {
          const raw = cookies(req).sq_session;
          const verified = await currentUser(req, env);
          return json({ host: url.host, hasCookie: !!raw, cookieLength: raw?.length || 0,
            verified: !!verified, user: verified ? { name: verified.name, email: verified.email, role: verified.role } : null });
        }
        const user = await currentUser(req, env);
        if (!user) return json({ user: null });
        const row = await env.DB.prepare("SELECT display_name, avatar, role FROM users WHERE microsoft_sub=?").bind(user.sub).first();
        return json({ user: {
          name: row?.display_name || user.name,
          email: user.email,
          role: row?.role || user.role,
          avatar: row?.avatar || null
        }});
      }
      if (url.pathname === "/api/profile") {
        const user = await currentUser(req, env);
        if (!user) return json({ error: "Not signed in" }, 401);
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        const b = await req.json();
        const name = String(b.display_name || "").slice(0, 80) || user.name || user.email;
        const avatar = b.avatar == null ? null : String(b.avatar);
        if (avatar && (!/^data:image\//.test(avatar) || avatar.length > 300000)) return json({ error: "Invalid avatar" }, 400);
        await env.DB.prepare("UPDATE users SET display_name=?, avatar=? WHERE microsoft_sub=?").bind(name, avatar, user.sub).run();
        return json({ ok: true, display_name: name, avatar });
      }
      if (url.pathname === "/api/progress") return progress(req, env);
      if (url.pathname === "/api/questions") return questions(req, env, url);
      if (url.pathname === "/api/export") {
        const denied = await requireAdmin(req, env);
        if (denied) return denied;
        const rows = await env.DB.prepare("SELECT id, category, difficulty, question, answers, correct, explanation, suitable FROM questions ORDER BY id").all();
        return json((rows.results || []).map(q => ({
          ...q, answers: safeParse(q.answers, []), suitable: safeParse(q.suitable, ["quiz"])
        })));
      }
      return new Response("Not found", { status: 404 });
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  }
};
