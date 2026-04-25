import { isPostgres } from "./dialect.js";
import { getPostgresPool, getSqlite } from "./connection.js";

interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: string;
  avatar: string;
}

const DEMO_USERS: SeedUser[] = [
  {
    email: "admin@bank.com",
    password: "admin123",
    name: "Admin User",
    role: "Senior Data Analyst",
    avatar: "AU",
  },
  {
    email: "analyst@bank.com",
    password: "analyst123",
    name: "Bank Analyst",
    role: "Business Analyst",
    avatar: "BA",
  },
];

export async function seedUsers(): Promise<void> {
  if (isPostgres()) {
    const pool = getPostgresPool();
    for (const u of DEMO_USERS) {
      try {
        await pool.query(
          `INSERT INTO app_users (email, password, name, role, avatar)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email) DO NOTHING`,
          [u.email, u.password, u.name, u.role, u.avatar],
        );
      } catch (err) {
        console.warn(`[users] Could not seed ${u.email}:`, (err as Error).message);
      }
    }
    console.log("[users] Demo users seeded (PostgreSQL).");
  } else {
    const db = getSqlite();
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO app_users (email, password, name, role, avatar) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const u of DEMO_USERS) {
      stmt.run(u.email, u.password, u.name, u.role, u.avatar);
    }
    console.log("[users] Demo users seeded (SQLite).");
  }
}
