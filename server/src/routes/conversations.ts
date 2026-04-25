import { Router } from "express";
import { isPostgres } from "../db/dialect.js";
import { getPostgresPool, getSqlite } from "../db/connection.js";

const router = Router();

/**
 * Resolve the calling user's email from the Bearer token.
 * We do a lightweight in-memory lookup via the auth route's session map.
 * Returns null when the token is missing or invalid.
 */
async function resolveEmail(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("[conversations] No Bearer token in Authorization header.");
    return null;
  }
  const token = authHeader.slice(7);
  if (!token || token === "null" || token === "undefined") {
    console.warn("[conversations] Token is empty or invalid string:", token);
    return null;
  }
  
  // Dynamic import to share the same session map as the auth route
  const { getSessionEmail } = await import("./auth.js");
  const email = await getSessionEmail(token);
  if (!email) {
    console.warn(`[conversations] Token ${token.slice(0, 4)}... not found in active sessions. (Server likely restarted)`);
  }
  return email;
}

router.get("/", async (req, res) => {
  const email = await resolveEmail(req.headers.authorization);
  if (!email) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (isPostgres()) {
      const pool = getPostgresPool();
      const r = await pool.query(
        "SELECT id, title, updated_at, messages_json FROM app_conversations WHERE user_email = $1 ORDER BY updated_at DESC",
        [email],
      );
      const history = r.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        updatedAt: Number(row.updated_at),
        messages: JSON.parse(row.messages_json),
      }));
      return res.json(history);
    } else {
      const db = getSqlite();
      const rows = db
        .prepare("SELECT id, title, updated_at, messages_json FROM app_conversations WHERE user_email = ? ORDER BY updated_at DESC")
        .all(email) as { id: string; title: string; updated_at: number; messages_json: string }[];
      return res.json(rows.map((row) => ({
        id: row.id,
        title: row.title,
        updatedAt: row.updated_at,
        messages: JSON.parse(row.messages_json),
      })));
    }
  } catch (error) {
    console.error("Failed to load conversations:", error);
    return res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.post("/", async (req, res) => {
  const email = await resolveEmail(req.headers.authorization);
  if (!email) {
    console.warn("[conversations] POST failed: No valid session token provided.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { id, title, updatedAt, messages } = req.body;
    const messagesJson = JSON.stringify(messages);

    if (isPostgres()) {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO app_conversations (id, user_email, title, updated_at, messages_json)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET title = $3, updated_at = $4, messages_json = $5`,
        [id, email, title, updatedAt, messagesJson],
      );
    } else {
      const db = getSqlite();
      db.prepare(
        `INSERT INTO app_conversations (id, user_email, title, updated_at, messages_json)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at, messages_json = excluded.messages_json`,
      ).run(id, email, title, updatedAt, messagesJson);
    }
    console.log(`[conversations] Saved conversation ${id} for ${email} (${messages.length} msgs)`);
    return res.json({ success: true });
  } catch (error) {
    console.error("[conversations] Failed to save conversation:", (error as Error).message);
    return res.status(500).json({ error: "Failed to save conversation" });
  }
});

router.delete("/:id", async (req, res) => {
  const email = await resolveEmail(req.headers.authorization);
  if (!email) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { id } = req.params;
    if (isPostgres()) {
      await getPostgresPool().query(
        "DELETE FROM app_conversations WHERE id = $1 AND user_email = $2",
        [id, email],
      );
    } else {
      getSqlite()
        .prepare("DELETE FROM app_conversations WHERE id = ? AND user_email = ?")
        .run(id, email);
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
});

export default router;
