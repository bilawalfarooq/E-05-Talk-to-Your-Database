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
import metricsRouter from "./routes/metrics.js";
import conversationsRouter from "./routes/conversations.js";
import authRouter from "./routes/auth.js";
import { MOCK_LLM, MODEL, llmProvider, embeddingsMode } from "./llm/openai.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main() {
  console.log("[boot] Starting AI Data Copilot server...");
  console.log(
    `[boot] LLM: ${MOCK_LLM ? "MOCK — set MOCK_LLM=false and a real GEMINI_API_KEY or OPENAI_API_KEY" : `${llmProvider()} / ${MODEL}`} | embeddings: ${embeddingsMode()}`,
  );

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
  app.use("/api/metrics", metricsRouter);
  app.use("/api/query", queryRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/auth", authRouter);

  app.listen(PORT, () => {
    console.log(`[boot] Listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[boot] Failed to start:", err);
  process.exit(1);
});
