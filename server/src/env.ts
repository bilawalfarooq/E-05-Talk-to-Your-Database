/**
 * Load env from `server/.env` first, then repo-root `.env`, so `npm run dev` works from any CWD.
 * Rename `server.env` → `server/.env` (the filename must be literally `.env`).
 */
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(serverRoot, ".env") });
config({ path: join(serverRoot, "..", ".env") });
