import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DB_FILE_PATH } from "../db/connection.js";
import { isPostgres } from "../db/dialect.js";
import { EMBED_MODEL, MODEL, MOCK_LLM, embeddingsMode, llmProvider, mockLlmReasons } from "../llm/openai.js";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export interface HealthPayload {
  ok: boolean;
  time: string;
  database: "postgresql" | "sqlite";
  databaseDetail: string;
  /** LLM chat provider used for NL-to-SQL / explanations */
  llmProvider: "gemini" | "openai";
  model: string;
  embedModel: string;
  mockLlm: boolean;
  mockLlmReasons: string[];
  /** Whether schema RAG uses real embedding API or deterministic mock vectors */
  embeddings: "live" | "mock";
  envFiles: { serverDotEnv: boolean; repoRootDotEnv: boolean };
  postgresAutoSeed: boolean;
  hints: string[];
}

export function buildHealthPayload(): HealthPayload {
  const serverDotEnv = existsSync(join(serverRoot, ".env"));
  const repoRootDotEnv = existsSync(join(serverRoot, "..", ".env"));
  const hints: string[] = [];

  if (!serverDotEnv && !repoRootDotEnv) {
    hints.push("No .env found at server/.env or repo root — copy server/.env.example to server/.env");
  }
  if (MOCK_LLM) {
    hints.push("LLM is in mock mode — set a valid API key and MOCK_LLM=false for real NL-to-SQL");
  }
  if (isPostgres() && process.env.POSTGRES_AUTO_SEED !== "true") {
    hints.push(
      "Neon: first-time empty databases no longer auto-seed — set POSTGRES_AUTO_SEED=true for synthetic demo data, or run npm run seed",
    );
  }

  return {
    ok: true,
    time: new Date().toISOString(),
    database: isPostgres() ? "postgresql" : "sqlite",
    databaseDetail: isPostgres()
      ? "PostgreSQL (DATABASE_URL / Neon)"
      : `SQLite (${DB_FILE_PATH})`,
    llmProvider: llmProvider(),
    model: MODEL,
    embedModel: EMBED_MODEL,
    mockLlm: MOCK_LLM,
    mockLlmReasons: mockLlmReasons(),
    embeddings: embeddingsMode(),
    envFiles: { serverDotEnv, repoRootDotEnv },
    postgresAutoSeed: process.env.POSTGRES_AUTO_SEED === "true",
    hints,
  };
}
