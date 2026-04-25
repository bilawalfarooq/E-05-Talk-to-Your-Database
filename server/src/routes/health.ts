import { Router } from "express";
import { MOCK_LLM, MODEL } from "../llm/openai.js";
import { isPostgres } from "../db/dialect.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    mockLlm: MOCK_LLM,
    model: MODEL,
    database: isPostgres() ? "postgresql" : "sqlite",
    time: new Date().toISOString(),
  });
});
export default router;
