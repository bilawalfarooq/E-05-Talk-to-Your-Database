import { Router } from "express";
import { runQuery } from "../db/query.js";
import { isPostgres } from "../db/dialect.js";

const router = Router();

export interface DashboardMetricsPayload {
  windowDays: number;
  source: "postgresql" | "sqlite";
  kpis: {
    totalFailures: number;
    avgFailuresPerDay: number;
    mostAffectedCity: string;
    mostAffectedCityCount: number;
    mostAffectedCityPct: number;
    mttrHours: number;
    /** % change: current window vs previous window (e.g. prior 90 days). Positive = more failures than prior period. */
    trendVsPreviousPct: number;
    hardwareFailuresInWindow: number;
  };
  karachiHardwareTrend: {
    columns: string[];
    rows: unknown[][];
    rowCount: number;
  };
  /** Latest ATM failures (for dashboard table when no NL query yet). */
  recentFailures: {
    columns: string[];
    rows: unknown[][];
    rowCount: number;
  };
  loadedAt: string;
}

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return 0;
}

router.get("/dashboard", async (_req, res) => {
  const windowDays = 90;
  try {
    const payload = isPostgres() ? await loadPostgresDashboard(windowDays) : await loadSqliteDashboard(windowDays);
    res.json(payload);
  } catch (err) {
    console.error("[metrics] dashboard failed:", err);
    res.status(500).json({ error: "Metrics query failed", detail: (err as Error).message });
  }
});

async function loadPostgresDashboard(windowDays: number): Promise<DashboardMetricsPayload> {
  const interval = `${windowDays} days`;
  const prevInterval = `${windowDays * 2} days`;

  const totalQ = `
SELECT COUNT(*)::bigint AS c FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '${interval}'`;
  const totalR = await runQuery(totalQ);
  const totalFailures = num(totalR.rows[0]?.[0]);

  const distinctDaysQ = `
SELECT COUNT(DISTINCT (failed_at AT TIME ZONE 'UTC')::date)::bigint AS c FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '${interval}'`;
  const distinctDaysR = await runQuery(distinctDaysQ);
  const distinctDays = Math.max(1, num(distinctDaysR.rows[0]?.[0]));
  const avgFailuresPerDay = totalFailures / distinctDays;

  const cityQ = `
SELECT b.city, COUNT(*)::bigint AS c
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE f.failed_at >= NOW() - INTERVAL '${interval}'
GROUP BY b.city
ORDER BY c DESC
LIMIT 1`;
  const cityR = await runQuery(cityQ);
  const mostAffectedCity = String(cityR.rows[0]?.[0] ?? "—");
  const mostAffectedCityCount = num(cityR.rows[0]?.[1]);
  const mostAffectedCityPct = totalFailures > 0 ? (mostAffectedCityCount / totalFailures) * 100 : 0;

  const mttrQ = `
SELECT COALESCE(AVG(resolution_minutes), 0)::float AS m FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '${interval}'`;
  const mttrR = await runQuery(mttrQ);
  const mttrHours = num(mttrR.rows[0]?.[0]) / 60;

  const prevQ = `
SELECT COUNT(*)::bigint AS c FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '${prevInterval}'
  AND failed_at < NOW() - INTERVAL '${interval}'`;
  const prevR = await runQuery(prevQ);
  const prevCount = num(prevR.rows[0]?.[0]);
  const trendVsPreviousPct =
    prevCount > 0 ? ((totalFailures - prevCount) / prevCount) * 100 : totalFailures > 0 ? 100 : 0;

  const hwQ = `
SELECT COUNT(*)::bigint AS c FROM atm_failures
WHERE failed_at >= NOW() - INTERVAL '${interval}'
  AND reason = 'Hardware'`;
  const hwR = await runQuery(hwQ);
  const hardwareFailuresInWindow = num(hwR.rows[0]?.[0]);

  const trendSql = `
SELECT (f.failed_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(*)::bigint AS failures
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
  AND f.reason = 'Hardware'
  AND f.failed_at >= NOW() - INTERVAL '${interval}'
GROUP BY 1
ORDER BY day
LIMIT 1000`;
  const trendR = await runQuery(trendSql);

  const recentQ = `
SELECT f.id::text AS id,
  'ATM-' || lpad(a.id::text, 3, '0') AS atm_id,
  b.name AS location,
  f.reason AS failure_type,
  (f.failed_at AT TIME ZONE 'UTC')::date::text AS fail_date,
  (f.resolution_minutes / 60)::text || 'h ' || mod(f.resolution_minutes, 60)::text || 'm' AS downtime
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
ORDER BY f.failed_at DESC
LIMIT 6`;
  const recentR = await runQuery(recentQ);

  return {
    windowDays,
    source: "postgresql",
    kpis: {
      totalFailures,
      avgFailuresPerDay,
      mostAffectedCity,
      mostAffectedCityCount,
      mostAffectedCityPct,
      mttrHours,
      trendVsPreviousPct,
      hardwareFailuresInWindow,
    },
    karachiHardwareTrend: {
      columns: trendR.columns.length ? trendR.columns : ["day", "failures"],
      rows: trendR.rows,
      rowCount: trendR.rowCount,
    },
    recentFailures: {
      columns: recentR.columns.length ? recentR.columns : ["id", "atm_id", "location", "failure_type", "fail_date", "downtime"],
      rows: recentR.rows,
      rowCount: recentR.rowCount,
    },
    loadedAt: new Date().toISOString(),
  };
}

async function loadSqliteDashboard(windowDays: number): Promise<DashboardMetricsPayload> {
  const totalQ = `
SELECT COUNT(*) AS c FROM atm_failures
WHERE failed_at >= date('now', '-${windowDays} day')`;
  const totalR = await runQuery(totalQ);
  const totalFailures = num(totalR.rows[0]?.[0]);

  const distinctDaysQ = `
SELECT COUNT(DISTINCT date(failed_at)) AS c FROM atm_failures
WHERE failed_at >= date('now', '-${windowDays} day')`;
  const distinctDaysR = await runQuery(distinctDaysQ);
  const distinctDays = Math.max(1, num(distinctDaysR.rows[0]?.[0]));
  const avgFailuresPerDay = totalFailures / distinctDays;

  const cityQ = `
SELECT b.city, COUNT(*) AS c
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE f.failed_at >= date('now', '-${windowDays} day')
GROUP BY b.city
ORDER BY c DESC
LIMIT 1`;
  const cityR = await runQuery(cityQ);
  const mostAffectedCity = String(cityR.rows[0]?.[0] ?? "—");
  const mostAffectedCityCount = num(cityR.rows[0]?.[1]);
  const mostAffectedCityPct = totalFailures > 0 ? (mostAffectedCityCount / totalFailures) * 100 : 0;

  const mttrQ = `
SELECT COALESCE(AVG(resolution_minutes), 0) AS m FROM atm_failures
WHERE failed_at >= date('now', '-${windowDays} day')`;
  const mttrR = await runQuery(mttrQ);
  const mttrHours = num(mttrR.rows[0]?.[0]) / 60;

  const prevQ = `
SELECT COUNT(*) AS c FROM atm_failures
WHERE failed_at >= date('now', '-${windowDays * 2} day')
  AND failed_at < date('now', '-${windowDays} day')`;
  const prevR = await runQuery(prevQ);
  const prevCount = num(prevR.rows[0]?.[0]);
  const trendVsPreviousPct =
    prevCount > 0 ? ((totalFailures - prevCount) / prevCount) * 100 : totalFailures > 0 ? 100 : 0;

  const hwQ = `
SELECT COUNT(*) AS c FROM atm_failures
WHERE failed_at >= date('now', '-${windowDays} day')
  AND reason = 'Hardware'`;
  const hwR = await runQuery(hwQ);
  const hardwareFailuresInWindow = num(hwR.rows[0]?.[0]);

  const trendSql = `
SELECT date(f.failed_at) AS day, COUNT(*) AS failures
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
  AND f.reason = 'Hardware'
  AND f.failed_at >= date('now', '-${windowDays} day')
GROUP BY date(f.failed_at)
ORDER BY day
LIMIT 1000`;
  const trendR = await runQuery(trendSql);

  const recentQ = `
SELECT CAST(f.id AS TEXT) AS id,
  'ATM-' || printf('%03d', a.id) AS atm_id,
  b.name AS location,
  f.reason AS failure_type,
  date(f.failed_at) AS fail_date,
  printf('%dh %02dm', f.resolution_minutes / 60, f.resolution_minutes % 60) AS downtime
FROM atm_failures f
JOIN atms a ON a.id = f.atm_id
JOIN branches b ON b.id = a.branch_id
WHERE b.city = 'Karachi'
ORDER BY f.failed_at DESC
LIMIT 6`;
  const recentR = await runQuery(recentQ);

  return {
    windowDays,
    source: "sqlite",
    kpis: {
      totalFailures,
      avgFailuresPerDay,
      mostAffectedCity,
      mostAffectedCityCount,
      mostAffectedCityPct,
      mttrHours,
      trendVsPreviousPct,
      hardwareFailuresInWindow,
    },
    karachiHardwareTrend: {
      columns: trendR.columns.length ? trendR.columns : ["day", "failures"],
      rows: trendR.rows,
      rowCount: trendR.rowCount,
    },
    recentFailures: {
      columns: recentR.columns.length ? recentR.columns : ["id", "atm_id", "location", "failure_type", "fail_date", "downtime"],
      rows: recentR.rows,
      rowCount: recentR.rowCount,
    },
    loadedAt: new Date().toISOString(),
  };
}

export default router;
