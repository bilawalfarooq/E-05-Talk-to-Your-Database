import { Router } from "express";
import { buildHealthPayload } from "../config/serverHealth.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(buildHealthPayload());
});

export default router;
