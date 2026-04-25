import "./env.js";
import express from "express";
import cors from "cors";
import { initConnection, DB_FILE_PATH } from "./db/connection.js";
import { isPostgres } from "./db/dialect.js";
import { initSchemaIndex } from "./rag/embeddings.js";
import { initClassifier } from "./ml/queryClassifier.js";
import healthRouter from "./routes/health.js";
import schemaRouter from "./routes/schema.js";
import queryRouter from "./routes/query.js";
import { MOCK_LLM, MODEL } from "./llm/openai.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main() {
  console.log("[boot] Starting AI Data Copilot server...");
  console.log(`[boot] LLM: ${MOCK_LLM ? "MOCK (set MOCK_LLM=false + OPENAI_API_KEY for real)" : `OpenAI ${MODEL}`}`);

  await initConnection();
  console.log(
    "[boot] DB:",
    isPostgres() ? "PostgreSQL (DATABASE_URL / Neon)" : `SQLite at ${DB_FILE_PATH}`,
  );

  await Promise.all([initSchemaIndex(), initClassifier()]);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/schema", schemaRouter);
  app.use("/api/query", queryRouter);

  app.listen(PORT, () => {
    console.log(`[boot] Listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[boot] Failed to start:", err);
  process.exit(1);
});
