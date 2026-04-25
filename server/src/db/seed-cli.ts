import "../env.js";
import { initConnection, reseedAll } from "./connection.js";

const force = process.argv.includes("--force");
await initConnection();
if (force) {
  await reseedAll();
  console.log("[seed] Re-seed complete.");
} else {
  console.log("[seed] DB already initialised. Pass --force to truncate and re-seed (PostgreSQL) or re-run (SQLite).");
}
