export interface GuardCheckResult {
  ok: boolean;
  rewrittenSql: string;
  checks: { name: string; passed: boolean; detail?: string }[];
  blockedReason?: string;
}

const FORBIDDEN_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
  "CREATE", "REPLACE", "ATTACH", "DETACH", "PRAGMA",
  "VACUUM", "REINDEX", "GRANT", "REVOKE",
];

const FORBIDDEN_TABLES = ["sqlite_master", "sqlite_sequence", "sqlite_temp_master", "sqlite_schema"];

const MAX_LIMIT = 1000;

export function sqlGuard(sql: string): GuardCheckResult {
  const checks: GuardCheckResult["checks"] = [];
  const trimmed = sql.trim().replace(/;+\s*$/, "");

  const upper = trimmed.toUpperCase();

  const isSelect = /^\s*(WITH\b[\s\S]+?\bSELECT\b|SELECT\b)/.test(upper);
  checks.push({ name: "select_only", passed: isSelect, detail: isSelect ? undefined : "Statement must start with SELECT or WITH ... SELECT" });
  if (!isSelect) {
    return { ok: false, rewrittenSql: trimmed, checks, blockedReason: "Only SELECT statements are allowed." };
  }

  const hasMultipleStatements = trimmed.includes(";");
  checks.push({ name: "single_statement", passed: !hasMultipleStatements, detail: hasMultipleStatements ? "Multiple statements detected" : undefined });
  if (hasMultipleStatements) {
    return { ok: false, rewrittenSql: trimmed, checks, blockedReason: "Multiple statements are not allowed." };
  }

  const forbiddenHit = FORBIDDEN_KEYWORDS.find((kw) => new RegExp(`\\b${kw}\\b`, "i").test(trimmed));
  checks.push({ name: "no_dml_ddl", passed: !forbiddenHit, detail: forbiddenHit ? `Forbidden keyword: ${forbiddenHit}` : undefined });
  if (forbiddenHit) {
    return { ok: false, rewrittenSql: trimmed, checks, blockedReason: `Forbidden keyword: ${forbiddenHit}` };
  }

  const tableHit = FORBIDDEN_TABLES.find((t) => new RegExp(`\\b${t}\\b`, "i").test(trimmed));
  checks.push({ name: "no_system_tables", passed: !tableHit, detail: tableHit ? `System table referenced: ${tableHit}` : undefined });
  if (tableHit) {
    return { ok: false, rewrittenSql: trimmed, checks, blockedReason: `System table not allowed: ${tableHit}` };
  }

  let rewrittenSql = trimmed;
  const limitMatch = /\bLIMIT\s+(\d+)/i.exec(rewrittenSql);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10);
    if (limit > MAX_LIMIT) {
      rewrittenSql = rewrittenSql.replace(/\bLIMIT\s+\d+/i, `LIMIT ${MAX_LIMIT}`);
      checks.push({ name: "limit_capped", passed: true, detail: `LIMIT ${limit} reduced to ${MAX_LIMIT}` });
    } else {
      checks.push({ name: "has_limit", passed: true, detail: `LIMIT ${limit}` });
    }
  } else {
    rewrittenSql = `${rewrittenSql} LIMIT ${MAX_LIMIT}`;
    checks.push({ name: "limit_added", passed: true, detail: `Auto-added LIMIT ${MAX_LIMIT}` });
  }

  return { ok: true, rewrittenSql, checks };
}
