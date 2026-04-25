import "dotenv/config";
import { getDb } from "./connection.js";

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function isoDaysAgo(days: number, hourOffset = 0, minuteOffset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hourOffset, minuteOffset, 0, 0);
  return d.toISOString();
}

const CITIES_PK = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"] as const;
const REGIONS = { Karachi: "Sindh", Lahore: "Punjab", Islamabad: "Capital", Rawalpindi: "Punjab", Faisalabad: "Punjab", Multan: "Punjab", Peshawar: "KPK" } as const;
const ATM_MODELS = ["NCR-X1", "NCR-X2", "Diebold-S2", "Wincor-P3", "GRG-H22"] as const;
const FAILURE_REASONS = ["Cash Out", "Network", "Hardware", "Software", "Power"] as const;
const SEGMENTS = ["Retail", "Premier", "SME", "Corporate"] as const;
const ACCOUNT_TYPES = ["Savings", "Current", "Term Deposit", "Loan"] as const;
const TX_CHANNELS = ["ATM", "Branch", "Online", "Mobile"] as const;
const TX_STATUS = ["Success", "Success", "Success", "Success", "Success", "Failed", "Pending"] as const;
const PRODUCTS = [
  { name: "Visa Platinum Credit Card", category: "Card" },
  { name: "MasterCard Gold", category: "Card" },
  { name: "Auto Loan", category: "Loan" },
  { name: "Home Loan", category: "Loan" },
  { name: "Personal Loan", category: "Loan" },
  { name: "Life Insurance Plan", category: "Insurance" },
  { name: "Health Insurance Plan", category: "Insurance" },
  { name: "Mutual Fund - Equity", category: "Investment" },
  { name: "Mutual Fund - Income", category: "Investment" },
];

const FIRST_NAMES = ["Ali", "Sara", "Bilal", "Ayesha", "Hassan", "Fatima", "Usman", "Zainab", "Ahmed", "Hira", "Imran", "Mariam", "Tariq", "Nida", "Faisal", "Sana", "Kamran", "Maria"];
const LAST_NAMES = ["Khan", "Malik", "Sheikh", "Qureshi", "Hussain", "Raza", "Ahmad", "Farooq", "Iqbal", "Siddiqui", "Butt", "Chaudhry"];

export function seed(opts: { force?: boolean } = {}): void {
  const db = getDb();
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

  const rng = mulberry32(42);
  const tx = db.transaction(() => {
    const insertBranch = db.prepare("INSERT INTO branches (id, name, city, region, opened_at) VALUES (?, ?, ?, ?, ?)");
    const insertAtm = db.prepare("INSERT INTO atms (id, branch_id, model, installed_at) VALUES (?, ?, ?, ?)");
    const insertFailure = db.prepare("INSERT INTO atm_failures (atm_id, failed_at, reason, resolution_minutes) VALUES (?, ?, ?, ?)");
    const insertCustomer = db.prepare("INSERT INTO customers (id, name, city, segment, opened_at) VALUES (?, ?, ?, ?, ?)");
    const insertAccount = db.prepare("INSERT INTO accounts (id, customer_id, type, balance, opened_at) VALUES (?, ?, ?, ?, ?)");
    const insertTx = db.prepare("INSERT INTO transactions (account_id, amount, type, channel, occurred_at, status) VALUES (?, ?, ?, ?, ?, ?)");
    const insertProduct = db.prepare("INSERT INTO products (id, name, category) VALUES (?, ?, ?)");
    const insertCp = db.prepare("INSERT INTO customer_products (customer_id, product_id, opened_at) VALUES (?, ?, ?)");

    let branchId = 1;
    const branchIds: number[] = [];
    const branchCity: Record<number, string> = {};
    for (const city of CITIES_PK) {
      // Karachi gets 6 branches (more weight). Others get 2.
      const n = city === "Karachi" ? 6 : 2;
      for (let i = 0; i < n; i++) {
        const name = `${city} Branch ${i + 1}`;
        insertBranch.run(branchId, name, city, REGIONS[city], isoDaysAgo(900 + Math.floor(rng() * 1500)));
        branchIds.push(branchId);
        branchCity[branchId] = city;
        branchId++;
      }
    }

    let atmId = 1;
    const atmInfo: { id: number; branchId: number; model: string; city: string }[] = [];
    for (const bId of branchIds) {
      const cityCount = branchCity[bId] === "Karachi" ? 4 : 2;
      for (let i = 0; i < cityCount; i++) {
        // Bias: Karachi branches favour NCR-X1 (the bad model).
        const model = branchCity[bId] === "Karachi" && rng() < 0.7 ? "NCR-X1" : pick(rng, ATM_MODELS);
        insertAtm.run(atmId, bId, model, isoDaysAgo(200 + Math.floor(rng() * 800)));
        atmInfo.push({ id: atmId, branchId: bId, model, city: branchCity[bId] });
        atmId++;
      }
    }

    // ATM failures over the last 180 days.
    // Bias: NCR-X1 has 3x failure rate. Karachi has +30% in last 30 days.
    for (const atm of atmInfo) {
      const baseDailyRate = atm.model === "NCR-X1" ? 0.18 : 0.06;
      for (let day = 180; day >= 0; day--) {
        let rate = baseDailyRate;
        if (atm.city === "Karachi" && day <= 30) rate *= 1.3;
        const failures = Math.floor(rng() * (rate * 4));
        for (let f = 0; f < failures; f++) {
          const hour = Math.floor(rng() * 24);
          const minute = Math.floor(rng() * 60);
          // NCR-X1 failures skew toward Hardware/Cash Out.
          const reason = atm.model === "NCR-X1" && rng() < 0.55
            ? (rng() < 0.5 ? "Hardware" : "Cash Out")
            : pick(rng, FAILURE_REASONS);
          const resolutionMinutes = 15 + Math.floor(rng() * 240);
          insertFailure.run(atm.id, isoDaysAgo(day, hour, minute), reason, resolutionMinutes);
        }
      }
    }

    // Customers.
    const totalCustomers = 600;
    const customerIds: number[] = [];
    const customerCity: Record<number, string> = {};
    for (let cId = 1; cId <= totalCustomers; cId++) {
      const city = rng() < 0.45 ? "Karachi" : pick(rng, CITIES_PK);
      const segment = pick(rng, SEGMENTS);
      const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
      insertCustomer.run(cId, name, city, segment, isoDaysAgo(60 + Math.floor(rng() * 1500)));
      customerIds.push(cId);
      customerCity[cId] = city;
    }

    // Accounts: 1-3 per customer. Retail favours Savings.
    let accountId = 1;
    const accountInfo: { id: number; customerId: number; type: string }[] = [];
    for (const cId of customerIds) {
      const n = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const type = i === 0 ? "Savings" : pick(rng, ACCOUNT_TYPES);
        const balance = Math.round((1000 + rng() * 5_000_000) * 100) / 100;
        insertAccount.run(accountId, cId, type, balance, isoDaysAgo(30 + Math.floor(rng() * 1400)));
        accountInfo.push({ id: accountId, customerId: cId, type });
        accountId++;
      }
    }

    // Transactions over the last 120 days. Bias: one Karachi branch dominates volume.
    for (const acct of accountInfo) {
      const txPerAccount = 5 + Math.floor(rng() * 25);
      for (let i = 0; i < txPerAccount; i++) {
        const day = Math.floor(rng() * 120);
        const hour = Math.floor(rng() * 24);
        const minute = Math.floor(rng() * 60);
        const isHighValue = rng() < 0.04;
        const amount = isHighValue
          ? Math.round((1_000_000 + rng() * 4_000_000) * 100) / 100
          : Math.round((100 + rng() * 50_000) * 100) / 100;
        const txType = rng() < 0.55 ? "Debit" : "Credit";
        const channel = pick(rng, TX_CHANNELS);
        const status = pick(rng, TX_STATUS);
        insertTx.run(acct.id, amount, txType, channel, isoDaysAgo(day, hour, minute), status);
      }
    }

    // Products + customer_products.
    PRODUCTS.forEach((p, i) => insertProduct.run(i + 1, p.name, p.category));
    for (const cId of customerIds) {
      const n = Math.floor(rng() * 3);
      const used = new Set<number>();
      for (let i = 0; i < n; i++) {
        const pId = 1 + Math.floor(rng() * PRODUCTS.length);
        if (used.has(pId)) continue;
        used.add(pId);
        insertCp.run(cId, pId, isoDaysAgo(15 + Math.floor(rng() * 800)));
      }
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
