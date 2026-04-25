import { Router } from "express";
import { z } from "zod";
import { runPipeline } from "../orchestrator.js";

const router = Router();

const Body = z.object({
  query: z.string().min(2).max(1000),
  conversationId: z.string().min(1).max(64).optional(),
});

router.post("/", async (req, res) => {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
    return;
  }
  const { query, conversationId = "default" } = parsed.data;
  try {
    const result = await runPipeline(query, conversationId);
    res.json(result);
  } catch (err) {
    console.error("[query] pipeline failed:", err);
    res.status(500).json({ error: "Pipeline failed", detail: (err as Error).message });
  }
});

export default router;
