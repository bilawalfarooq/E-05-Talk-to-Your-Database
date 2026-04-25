import type { PoolClient } from "pg";
import { getPostgresPool } from "./connection.js";
import { generateBankSeedData } from "./seedData.js";

export async function truncatePostgres(client: PoolClient): Promise<void> {
  await client.query(`
    TRUNCATE
      customer_products,
      transactions,
      accounts,
      atm_failures,
      atms,
      customers,
      products,
      branches
    RESTART IDENTITY CASCADE
  `);
}

async function insertFailuresBulk(
  client: PoolClient,
  rows: { atmId: number; failedAt: string; reason: string; resolutionMinutes: number }[],
): Promise<void> {
  if (rows.length === 0) return;
  const step = 3000;
  for (let i = 0; i < rows.length; i += step) {
    const chunk = rows.slice(i, i + step);
    const atmIds = chunk.map((r) => r.atmId);
    const dts = chunk.map((r) => r.failedAt);
    const reasons = chunk.map((r) => r.reason);
    const mins = chunk.map((r) => r.resolutionMinutes);
    await client.query(
      `INSERT INTO atm_failures (atm_id, failed_at, reason, resolution_minutes)
       SELECT a, f, re, m FROM UNNEST($1::int[], $2::timestamptz[], $3::text[], $4::int[]) AS t(a, f, re, m)`,
      [atmIds, dts, reasons, mins],
    );
  }
}

async function insertTransactionsBulk(
  client: PoolClient,
  rows: { accountId: number; amount: number; type: string; channel: string; occurredAt: string; status: string }[],
): Promise<void> {
  if (rows.length === 0) return;
  const step = 3000;
  for (let i = 0; i < rows.length; i += step) {
    const chunk = rows.slice(i, i + step);
    await client.query(
      `INSERT INTO transactions (account_id, amount, type, channel, occurred_at, status)
       SELECT a, amt, ttyp, ch, oa, st FROM UNNEST(
         $1::int[], $2::float8[], $3::text[], $4::text[], $5::timestamptz[], $6::text[]
       ) AS t(a, amt, ttyp, ch, oa, st)`,
      [
        chunk.map((r) => r.accountId),
        chunk.map((r) => r.amount),
        chunk.map((r) => r.type),
        chunk.map((r) => r.channel),
        chunk.map((r) => r.occurredAt),
        chunk.map((r) => r.status),
      ],
    );
  }
}

export async function seedPostgres(opts: { force?: boolean } = {}): Promise<void> {
  const pool = getPostgresPool();
  const cRes = await pool.query("SELECT count(*)::int AS c FROM transactions");
  const existing = Number((cRes.rows[0] as { c: string | number }).c);
  if (existing > 0 && !opts.force) {
    console.log(`[seed] PG already seeded (${existing} transactions). Skipping.`);
    return;
  }

  const client = await pool.connect();
  try {
    if (existing > 0 && opts.force) {
      await truncatePostgres(client);
    }

    const data = generateBankSeedData();
    await client.query("BEGIN");

    for (const b of data.branches) {
      await client.query(
        "INSERT INTO branches (id, name, city, region, opened_at) VALUES ($1, $2, $3, $4, $5::timestamptz)",
        [b.id, b.name, b.city, b.region, b.openedAt],
      );
    }
    for (const a of data.atms) {
      await client.query(
        "INSERT INTO atms (id, branch_id, model, installed_at) VALUES ($1, $2, $3, $4::timestamptz)",
        [a.id, a.branchId, a.model, a.installedAt],
      );
    }
    await insertFailuresBulk(client, data.atmFailures);
    for (const c of data.customers) {
      await client.query(
        "INSERT INTO customers (id, name, city, segment, opened_at) VALUES ($1, $2, $3, $4, $5::timestamptz)",
        [c.id, c.name, c.city, c.segment, c.openedAt],
      );
    }
    for (const a of data.accounts) {
      await client.query(
        "INSERT INTO accounts (id, customer_id, type, balance, opened_at) VALUES ($1, $2, $3, $4, $5::timestamptz)",
        [a.id, a.customerId, a.type, a.balance, a.openedAt],
      );
    }
    await insertTransactionsBulk(client, data.transactions);
    for (const p of data.products) {
      await client.query("INSERT INTO products (id, name, category) VALUES ($1, $2, $3)", [p.id, p.name, p.category]);
    }
    for (const cp of data.customerProducts) {
      await client.query(
        "INSERT INTO customer_products (customer_id, product_id, opened_at) VALUES ($1, $2, $3::timestamptz)",
        [cp.customerId, cp.productId, cp.openedAt],
      );
    }
    await client.query("COMMIT");
    const counts = {
      branches: (await pool.query("SELECT count(*)::int c FROM branches")).rows[0].c,
      atms: (await pool.query("SELECT count(*)::int c FROM atms")).rows[0].c,
      atm_failures: (await pool.query("SELECT count(*)::int c FROM atm_failures")).rows[0].c,
      customers: (await pool.query("SELECT count(*)::int c FROM customers")).rows[0].c,
      accounts: (await pool.query("SELECT count(*)::int c FROM accounts")).rows[0].c,
      transactions: (await pool.query("SELECT count(*)::int c FROM transactions")).rows[0].c,
      products: (await pool.query("SELECT count(*)::int c FROM products")).rows[0].c,
    };
    console.log("[seed] PG done.", counts);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
