export type Rng = () => number;

export function mulberry32(seed: number): Rng {
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

export function isoDaysAgo(days: number, hourOffset = 0, minuteOffset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hourOffset, minuteOffset, 0, 0);
  return d.toISOString();
}

const CITIES_PK = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar"] as const;
const REGIONS: Record<string, string> = { Karachi: "Sindh", Lahore: "Punjab", Islamabad: "Capital", Rawalpindi: "Punjab", Faisalabad: "Punjab", Multan: "Punjab", Peshawar: "KPK" };
const ATM_MODELS = ["NCR-X1", "NCR-X2", "Diebold-S2", "Wincor-P3", "GRG-H22"] as const;
const FAILURE_REASONS = ["Cash Out", "Network", "Hardware", "Software", "Power"] as const;
const SEGMENTS = ["Retail", "Premier", "SME", "Corporate"] as const;
const ACCOUNT_TYPES = ["Savings", "Current", "Term Deposit", "Loan"] as const;
const TX_CHANNELS = ["ATM", "Branch", "Online", "Mobile"] as const;
const TX_STATUS = ["Success", "Success", "Success", "Success", "Success", "Failed", "Pending"] as const;
export const PRODUCTS = [
  { name: "Visa Platinum Credit Card", category: "Card" },
  { name: "MasterCard Gold", category: "Card" },
  { name: "Auto Loan", category: "Loan" },
  { name: "Home Loan", category: "Loan" },
  { name: "Personal Loan", category: "Loan" },
  { name: "Life Insurance Plan", category: "Insurance" },
  { name: "Health Insurance Plan", category: "Insurance" },
  { name: "Mutual Fund - Equity", category: "Investment" },
  { name: "Mutual Fund - Income", category: "Investment" },
] as const;

const FIRST_NAMES = ["Ali", "Sara", "Bilal", "Ayesha", "Hassan", "Fatima", "Usman", "Zainab", "Ahmed", "Hira", "Imran", "Mariam", "Tariq", "Nida", "Faisal", "Sana", "Kamran", "Maria"];
const LAST_NAMES = ["Khan", "Malik", "Sheikh", "Qureshi", "Hussain", "Raza", "Ahmad", "Farooq", "Iqbal", "Siddiqui", "Butt", "Chaudhry"];

export interface BankSeedData {
  branches: { id: number; name: string; city: string; region: string; openedAt: string }[];
  atms: { id: number; branchId: number; model: string; installedAt: string }[];
  atmFailures: { atmId: number; failedAt: string; reason: string; resolutionMinutes: number }[];
  customers: { id: number; name: string; city: string; segment: string; openedAt: string }[];
  accounts: { id: number; customerId: number; type: string; balance: number; openedAt: string }[];
  transactions: { accountId: number; amount: number; type: string; channel: string; occurredAt: string; status: string }[];
  products: { id: number; name: string; category: string }[];
  customerProducts: { customerId: number; productId: number; openedAt: string }[];
}

export function generateBankSeedData(rng: Rng = mulberry32(42)): BankSeedData {
  const branches: BankSeedData["branches"] = [];
  const atms: BankSeedData["atms"] = [];
  const atmFailures: BankSeedData["atmFailures"] = [];
  const customers: BankSeedData["customers"] = [];
  const accounts: BankSeedData["accounts"] = [];
  const transactions: BankSeedData["transactions"] = [];
  const products: BankSeedData["products"] = PRODUCTS.map((p, i) => ({ id: i + 1, name: p.name, category: p.category }));
  const customerProducts: BankSeedData["customerProducts"] = [];

  let branchId = 1;
  const branchIds: number[] = [];
  const branchCity: Record<number, string> = {};
  for (const city of CITIES_PK) {
    const n = city === "Karachi" ? 6 : 2;
    for (let i = 0; i < n; i++) {
      const name = `${city} Branch ${i + 1}`;
      branches.push({ id: branchId, name, city, region: REGIONS[city] ?? "Punjab", openedAt: isoDaysAgo(900 + Math.floor(rng() * 1500)) });
      branchIds.push(branchId);
      branchCity[branchId] = city;
      branchId++;
    }
  }

  let atmId = 1;
  const atmInfo: { id: number; city: string; model: string }[] = [];
  for (const bId of branchIds) {
    const cityCount = branchCity[bId] === "Karachi" ? 4 : 2;
    for (let i = 0; i < cityCount; i++) {
      const model = branchCity[bId] === "Karachi" && rng() < 0.7 ? "NCR-X1" : pick(rng, ATM_MODELS);
      atms.push({ id: atmId, branchId: bId, model, installedAt: isoDaysAgo(200 + Math.floor(rng() * 800)) });
      atmInfo.push({ id: atmId, city: branchCity[bId], model });
      atmId++;
    }
  }

  for (const atm of atmInfo) {
    const baseExpectedPerDay = atm.model === "NCR-X1" ? 0.65 : 0.18;
    for (let day = 180; day >= 0; day--) {
      let expected = baseExpectedPerDay;
      if (atm.city === "Karachi" && day <= 30) expected *= 1.45;
      const whole = Math.floor(expected);
      const frac = expected - whole;
      const failures = whole + (rng() < frac ? 1 : 0);
      for (let f = 0; f < failures; f++) {
        const hour = Math.floor(rng() * 24);
        const minute = Math.floor(rng() * 60);
        const reason = atm.model === "NCR-X1" && rng() < 0.55
          ? (rng() < 0.5 ? "Hardware" : "Cash Out")
          : pick(rng, FAILURE_REASONS);
        const resolutionMinutes = 15 + Math.floor(rng() * 240);
        atmFailures.push({ atmId: atm.id, failedAt: isoDaysAgo(day, hour, minute), reason, resolutionMinutes });
      }
    }
  }

  const totalCustomers = 600;
  const customerIds: number[] = [];
  for (let cId = 1; cId <= totalCustomers; cId++) {
    const city = rng() < 0.45 ? "Karachi" : pick(rng, CITIES_PK);
    const segment = pick(rng, SEGMENTS);
    const name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
    customers.push({ id: cId, name, city, segment, openedAt: isoDaysAgo(60 + Math.floor(rng() * 1500)) });
    customerIds.push(cId);
  }

  let accountId = 1;
  const accountInfo: { id: number }[] = [];
  for (const cId of customerIds) {
    const n = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const type = i === 0 ? "Savings" : pick(rng, ACCOUNT_TYPES);
      const balance = Math.round((1000 + rng() * 5_000_000) * 100) / 100;
      accounts.push({ id: accountId, customerId: cId, type, balance, openedAt: isoDaysAgo(30 + Math.floor(rng() * 1400)) });
      accountInfo.push({ id: accountId });
      accountId++;
    }
  }

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
      const type = rng() < 0.55 ? "Debit" : "Credit";
      const channel = pick(rng, TX_CHANNELS);
      const status = pick(rng, TX_STATUS);
      transactions.push({ accountId: acct.id, amount, type, channel, occurredAt: isoDaysAgo(day, hour, minute), status });
    }
  }

  for (const cId of customerIds) {
    const n = Math.floor(rng() * 3);
    const used = new Set<number>();
    for (let i = 0; i < n; i++) {
      const pId = 1 + Math.floor(rng() * PRODUCTS.length);
      if (used.has(pId)) continue;
      used.add(pId);
      customerProducts.push({ customerId: cId, productId: pId, openedAt: isoDaysAgo(15 + Math.floor(rng() * 800)) });
    }
  }

  return { branches, atms, atmFailures, customers, accounts, transactions, products, customerProducts };
}
