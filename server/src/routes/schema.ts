import { Router } from "express";
import { SCHEMA_DOCS } from "../rag/schemaDocs.js";
import { SAMPLE_QUERIES } from "../rag/sampleQueries.js";
import { runQuery } from "../db/query.js";

const router = Router();

router.get("/", async (_req, res) => {
  const counts: Record<string, number> = {};
  for (const doc of SCHEMA_DOCS) {
    try {
      const r = await runQuery(`SELECT COUNT(*) AS c FROM ${doc.table}`);
      const v = r.rowCount > 0 ? r.rows[0][0] : 0;
      counts[doc.table] = Number(v);
    } catch {
      counts[doc.table] = -1;
    }
  }
  res.json({
    tables: SCHEMA_DOCS.map((d) => ({ ...d, rowCount: counts[d.table] })),
    sampleQueries: SAMPLE_QUERIES.map((s) => ({ question: s.question, tables: s.tables })),
  });
});

export default router;
