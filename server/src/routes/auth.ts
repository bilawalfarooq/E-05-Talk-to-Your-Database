import { Router } from "express";
import crypto from "crypto";
import { isPostgres } from "../db/dialect.js";
import { getPostgresPool, getSqlite } from "../db/connection.js";

const router = Router();

interface DbUser {
  email: string;
  password: string;
  name: string;
  role: string;
  avatar: string;
}

async function findUserByEmail(email: string): Promise<DbUser | null> {
  try {
    if (isPostgres()) {
      const pool = getPostgresPool();
      const r = await pool.query<DbUser>(
        "SELECT email, password, name, role, avatar FROM app_users WHERE email = $1",
        [email.toLowerCase().trim()],
      );
      return r.rows[0] ?? null;
    } else {
      const db = getSqlite();
      const row = db
        .prepare("SELECT email, password, name, role, avatar FROM app_users WHERE email = ?")
        .get(email.toLowerCase().trim()) as DbUser | undefined;
      return row ?? null;
    }
  } catch {
    return null;
  }
}

/** Used by other routes to resolve the caller's email from a Bearer token. */
export async function getSessionEmail(token: string): Promise<string | null> {
  try {
    if (isPostgres()) {
      const pool = getPostgresPool();
      const r = await pool.query(
        "SELECT user_email, expires_at FROM app_sessions WHERE token = $1",
        [token]
      );
      const session = r.rows[0];
      if (!session || Number(session.expires_at) < Date.now()) {
        if (session) await pool.query("DELETE FROM app_sessions WHERE token = $1", [token]);
        return null;
      }
      return session.user_email;
    } else {
      const db = getSqlite();
      const session = db
        .prepare("SELECT user_email, expires_at FROM app_sessions WHERE token = ?")
        .get(token) as { user_email: string; expires_at: number } | undefined;
      if (!session || session.expires_at < Date.now()) {
        if (session) db.prepare("DELETE FROM app_sessions WHERE token = ?").run(token);
        return null;
      }
      return session.user_email;
    }
  } catch (err) {
    console.error("[auth] Session resolution failed:", (err as Error).message);
    return null;
  }
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h

  try {
    if (isPostgres()) {
      await getPostgresPool().query(
        "INSERT INTO app_sessions (token, user_email, expires_at) VALUES ($1, $2, $3)",
        [token, user.email, expiresAt]
      );
    } else {
      getSqlite()
        .prepare("INSERT INTO app_sessions (token, user_email, expires_at) VALUES (?, ?, ?)")
        .run(token, user.email, expiresAt);
    }
  } catch (err) {
    console.error("[auth] Failed to store session:", (err as Error).message);
    return res.status(500).json({ error: "Failed to create session" });
  }

  return res.json({
    token,
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

router.post("/logout", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      if (isPostgres()) {
        await getPostgresPool().query("DELETE FROM app_sessions WHERE token = $1", [token]);
      } else {
        getSqlite().prepare("DELETE FROM app_sessions WHERE token = ?").run(token);
      }
    } catch (err) {
      console.error("[auth] Logout failed:", (err as Error).message);
    }
  }
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  
  const email = await getSessionEmail(token);
  if (!email) return res.status(401).json({ error: "Session expired or invalid" });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: "User not found" });

  return res.json({ email: user.email, name: user.name, role: user.role, avatar: user.avatar });
});

export default router;
