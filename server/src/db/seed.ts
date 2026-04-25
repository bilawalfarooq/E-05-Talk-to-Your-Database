import "../env.js";
import { getSqlite } from "./connection.js";
import { generateBankSeedData } from "./seedData.js";

export function seed(opts: { force?: boolean } = {}): void {
  const db = getSqlite();
  const existing = db.prepare("SELECT COUNT(*) as c FROM transactions").get() as { c: number };
  if (existing.c > 0 && !opts.force) {
    console.log(`[seed] Database already seeded (${existing.c} transactions). Skipping.`);
    return;
  }

  if (opts.force) {
    db.exec(`
      DELETE FROM customer_products;
      DELETE FROM transactions;
      DELETE FROM accounts;
      DELETE FROM atm_failures;
      DELETE FROM atms;
      DELETE FROM customers;
      DELETE FROM products;
      DELETE FROM branches;
    `);
  }

  const data = generateBankSeedData();

  const tx = db.transaction(() => {
    const insertBranch = db.prepare("INSERT INTO branches (id, name, city, region, opened_at) VALUES (?, ?, ?, ?, ?)");
    const insertAtm = db.prepare("INSERT INTO atms (id, branch_id, model, installed_at) VALUES (?, ?, ?, ?)");
    const insertFailure = db.prepare("INSERT INTO atm_failures (atm_id, failed_at, reason, resolution_minutes) VALUES (?, ?, ?, ?)");
    const insertCustomer = db.prepare("INSERT INTO customers (id, name, city, segment, opened_at) VALUES (?, ?, ?, ?, ?)");
    const insertAccount = db.prepare("INSERT INTO accounts (id, customer_id, type, balance, opened_at) VALUES (?, ?, ?, ?, ?)");
    const insertTx = db.prepare("INSERT INTO transactions (account_id, amount, type, channel, occurred_at, status) VALUES (?, ?, ?, ?, ?, ?)");
    const insertProduct = db.prepare("INSERT INTO products (id, name, category) VALUES (?, ?, ?)");
    const insertCp = db.prepare("INSERT INTO customer_products (customer_id, product_id, opened_at) VALUES (?, ?, ?)");

    for (const b of data.branches) {
      insertBranch.run(b.id, b.name, b.city, b.region, b.openedAt);
    }
    for (const a of data.atms) {
      insertAtm.run(a.id, a.branchId, a.model, a.installedAt);
    }
    for (const f of data.atmFailures) {
      insertFailure.run(f.atmId, f.failedAt, f.reason, f.resolutionMinutes);
    }
    for (const c of data.customers) {
      insertCustomer.run(c.id, c.name, c.city, c.segment, c.openedAt);
    }
    for (const a of data.accounts) {
      insertAccount.run(a.id, a.customerId, a.type, a.balance, a.openedAt);
    }
    for (const t of data.transactions) {
      insertTx.run(t.accountId, t.amount, t.type, t.channel, t.occurredAt, t.status);
    }
    for (const p of data.products) {
      insertProduct.run(p.id, p.name, p.category);
    }
    for (const cp of data.customerProducts) {
      insertCp.run(cp.customerId, cp.productId, cp.openedAt);
    }
  });

  tx();

  const counts = {
    branches: (db.prepare("SELECT COUNT(*) c FROM branches").get() as { c: number }).c,
    atms: (db.prepare("SELECT COUNT(*) c FROM atms").get() as { c: number }).c,
    atm_failures: (db.prepare("SELECT COUNT(*) c FROM atm_failures").get() as { c: number }).c,
    customers: (db.prepare("SELECT COUNT(*) c FROM customers").get() as { c: number }).c,
    accounts: (db.prepare("SELECT COUNT(*) c FROM accounts").get() as { c: number }).c,
    transactions: (db.prepare("SELECT COUNT(*) c FROM transactions").get() as { c: number }).c,
    products: (db.prepare("SELECT COUNT(*) c FROM products").get() as { c: number }).c,
  };
  console.log("[seed] Done.", counts);
}

const isMain = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`;
if (isMain) {
  const force = process.argv.includes("--force");
  seed({ force });
}
