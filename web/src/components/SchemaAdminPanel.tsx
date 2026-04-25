import { useEffect, useState } from "react";
import { Database, X } from "lucide-react";
import { getSchema, type SchemaInfo } from "../api/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SchemaAdminPanel({ open, onClose }: Props) {
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || schema) return;
    setLoading(true);
    getSchema().then((s) => { setSchema(s); setLoading(false); }).catch(() => setLoading(false));
  }, [open, schema]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-ink-900 border-l border-ink-700 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <Database size={16} className="text-accent-400" /> Schema browser
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {loading && <div className="text-sm text-gray-500">Loading schema…</div>}
          {schema?.tables.map((t) => (
            <div key={t.table} className="rounded-xl border border-ink-700 bg-ink-800/40 p-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm text-accent-400">{t.table}</div>
                <div className="text-xs text-gray-500">{t.rowCount.toLocaleString()} rows</div>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t.description}</p>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {t.columns.map((c) => (
                  <div key={c.name} className="flex gap-2 text-xs">
                    <span className="font-mono text-gray-200 w-24 flex-shrink-0">{c.name}</span>
                    <span className="font-mono text-gray-500 w-16 flex-shrink-0">{c.type}</span>
                    <span className="text-gray-400">{c.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
