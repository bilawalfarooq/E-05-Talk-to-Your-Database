import { useState, useEffect } from "react";
import { Eye, EyeOff, Sparkles, Shield, Database, BrainCircuit, Lock } from "lucide-react";
import { useAuth } from "../store/auth";

export function LoginPage() {
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (error) clearError();
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!email.trim() || !password.trim()) return;
    await login(email.trim(), password);
  };

  const fillDemo = (type: "admin" | "analyst") => {
    if (type === "admin") { setEmail("admin@bank.com"); setPassword("admin123"); }
    else { setEmail("analyst@bank.com"); setPassword("analyst123"); }
    clearError();
  };

  return (
    <div className="aurora-shell flex h-screen w-screen items-center justify-center bg-ink-950 overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute -bottom-20 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
        <div className="absolute top-1/2 left-10 h-[300px] w-[300px] rounded-full bg-indigo-500/6 blur-[80px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl items-center gap-16 px-6">
        {/* Left: Branding */}
        <div className="hidden flex-1 flex-col lg:flex">
          <div className="mb-8 inline-flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_40px_rgba(124,58,237,0.5)]">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Data Copilot</h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300/70">Banking Intelligence</p>
            </div>
          </div>

          <h2 className="mb-5 text-4xl font-bold leading-tight text-white">
            Talk to your<br />
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              banking data
            </span>
          </h2>
          <p className="mb-10 max-w-md text-base leading-relaxed text-gray-400">
            Ask any question in plain English. Our AI Copilot translates it to SQL, queries your live PostgreSQL warehouse, and returns instant visual insights.
          </p>

          <div className="space-y-4">
            {[
              { icon: <BrainCircuit size={18} className="text-purple-300" />, label: "Groq LLM", detail: "llama-3.3-70b-versatile inference" },
              { icon: <Database size={18} className="text-cyan-300" />, label: "Neon PostgreSQL", detail: "Live banking data warehouse" },
              { icon: <Shield size={18} className="text-emerald-300" />, label: "Read-only Guardrails", detail: "All SQL validated before execution" },
            ].map(({ icon, label, detail }) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  {icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-200">{label}</div>
                  <div className="text-xs text-gray-500">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-2xl">
            {/* Corner glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />

            {/* Logo (mobile only) */}
            <div className="relative mb-8 flex flex-col items-center lg:hidden">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 shadow-[0_0_32px_rgba(124,58,237,0.5)]">
                <Sparkles size={26} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">AI Data Copilot</h1>
            </div>

            <div className="relative">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-400/10">
                <Lock size={22} className="text-purple-300" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">Sign in</h2>
              <p className="mt-1 text-sm text-gray-500">Access your analytics dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="relative mt-8 space-y-5">
              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bank.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm text-gray-100 placeholder-gray-600 outline-none transition-all focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10"
                  autoComplete="email"
                />
                {touched && !email.trim() && (
                  <p className="mt-1.5 text-xs text-red-400">Email is required</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 pr-12 text-sm text-gray-100 placeholder-gray-600 outline-none transition-all focus:border-purple-400/50 focus:ring-4 focus:ring-purple-400/10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-300"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched && !password.trim() && (
                  <p className="mt-1.5 text-xs text-red-400">Password is required</p>
                )}
              </div>

              {/* API error */}
              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-4 text-sm font-bold text-white shadow-[0_0_40px_rgba(124,58,237,0.35)] transition hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(124,58,237,0.5)] disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Authenticating...
                  </span>
                ) : (
                  "Sign in to Dashboard"
                )}
              </button>
            </form>

            {/* Demo quick-fill */}
            <div className="relative mt-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600">Demo Accounts</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fillDemo("admin")}
                  className="rounded-2xl border border-purple-400/20 bg-purple-400/5 px-3 py-3 text-left transition hover:bg-purple-400/10"
                >
                  <div className="text-xs font-bold text-purple-200">Admin</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">admin@bank.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo("analyst")}
                  className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-3 text-left transition hover:bg-cyan-400/10"
                >
                  <div className="text-xs font-bold text-cyan-200">Analyst</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">analyst@bank.com</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
