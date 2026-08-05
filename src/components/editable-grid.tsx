import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Copy, Trash2, Check, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export type GridColumn<T> = {
  key: string;
  label: string;
  group?: string;
  type: "text" | "number" | "date" | "select" | "multiselect";
  options?: { value: string; label: string }[];
  width?: number;
  placeholder?: string;
  required?: boolean;
  accessor: (row: T) => string | number | string[] | null | undefined;
  warn?: (row: T) => boolean;
  display?: (row: T) => string | null;
};

export type GridGroup = {
  label: string;
  span: number;
  className?: string;
};

type SaveStatus = "idle" | "saving" | "ok" | "error";

export function EditableGrid<T extends { id: string }>({
  rows,
  columns,
  groups,
  getRowKey,
  onSaveCell,
  onCreateRow,
  onDuplicateRow,
  onDeleteRow,
  newRowDraftKeys,
  emptyDraftLabel = "Nova linha — comece a digitar para criar",
}: {
  rows: T[];
  columns: GridColumn<T>[];
  groups?: GridGroup[];
  getRowKey?: (r: T) => string;
  onSaveCell: (rowId: string, key: string, value: string | number | string[] | null) => Promise<void>;
  onCreateRow: (initial: Record<string, string | number | string[] | null>) => Promise<string>;
  onDuplicateRow?: (rowId: string) => Promise<void>;
  onDeleteRow?: (rowId: string) => Promise<void>;
  newRowDraftKeys?: string[];
  emptyDraftLabel?: string;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function handleSave(rowId: string, key: string, value: string | number | string[] | null) {
    setStatus("saving");
    try {
      await onSaveCell(rowId, key, value);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  function focusCell(rowIdx: number, colIdx: number) {
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-cell="${rowIdx}-${colIdx}"] input, [data-cell="${rowIdx}-${colIdx}"] select`,
    );
    el?.focus();
    if (el instanceof HTMLInputElement) el.select?.();
  }

  function handleNav(e: KeyboardEvent, rowIdx: number, colIdx: number) {
    const totalRows = rows.length + 1; // +1 for draft row at top
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      const nextCol = colIdx + 1;
      if (nextCol < columns.length) focusCell(rowIdx, nextCol);
      else if (rowIdx + 1 < totalRows) focusCell(rowIdx + 1, 0);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (colIdx > 0) focusCell(rowIdx, colIdx - 1);
      else if (rowIdx > 0) focusCell(rowIdx - 1, columns.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rowIdx + 1 < totalRows) focusCell(rowIdx + 1, colIdx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIdx > 0) focusCell(rowIdx - 1, colIdx);
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
        <span>{rows.length} linha(s) — clique numa célula para editar. Tab/Enter avançam, ↑↓ navegam.</span>
        <SaveBadge status={status} />
      </div>
      <div ref={containerRef} className="max-h-[70vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          {groups && groups.length > 0 && (
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-10 w-10 border-b border-r bg-card" />
                {groups.map((g, i) => (
                  <th
                    key={i}
                    colSpan={g.span}
                    className={cn(
                      "border-b border-r px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                      g.className ?? "bg-secondary/60",
                    )}
                  >
                    {g.label}
                  </th>
                ))}
                <th className="sticky right-0 z-10 w-20 border-b bg-card" />
              </tr>
            </thead>
          )}
          <thead className={cn("sticky z-20 bg-card", groups ? "top-[33px]" : "top-0")}>
            <tr>
              <th className="sticky left-0 z-10 w-10 border-b border-r bg-card" />
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ minWidth: c.width ?? 130 }}
                  className="border-b border-r bg-card px-3 py-2 text-left text-xs font-semibold text-foreground"
                >
                  {c.label}
                  {c.required && <span className="ml-0.5 text-destructive">*</span>}
                </th>
              ))}
              <th className="sticky right-0 z-10 w-20 border-b bg-card" />
            </tr>
          </thead>
          <tbody>
            <DraftRow
              columns={columns}
              rowIdx={0}
              onNav={handleNav}
              onCreate={async (init) => {
                setStatus("saving");
                try {
                  await onCreateRow(init);
                  setStatus("ok");
                  setTimeout(() => setStatus("idle"), 1500);
                } catch {
                  setStatus("error");
                }
              }}
              draftKeys={newRowDraftKeys ?? [columns[0]?.key]}
              label={emptyDraftLabel}
            />
            {rows.map((row, rIdx) => (
              <tr key={getRowKey?.(row) ?? row.id} className="hover:bg-secondary/30">
                <td className="sticky left-0 z-[1] w-10 border-b border-r bg-card text-center text-[11px] text-muted-foreground">
                  {rIdx + 1}
                </td>
                {columns.map((c, cIdx) => (
                  <Cell
                    key={c.key}
                    row={row}
                    col={c}
                    rowIdx={rIdx + 1}
                    colIdx={cIdx}
                    onSave={(v) => handleSave(row.id, c.key, v)}
                    onNav={handleNav}
                  />
                ))}
                <td className="sticky right-0 z-[1] w-20 border-b bg-card">
                  <div className="flex items-center justify-center gap-1">
                    {onDuplicateRow && (
                      <button
                        type="button"
                        title="Duplicar linha (Ctrl+D)"
                        onClick={() => onDuplicateRow(row.id)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDeleteRow && (
                      <button
                        type="button"
                        title="Excluir linha"
                        onClick={() => {
                          if (confirm("Excluir esta linha?")) onDeleteRow(row.id);
                        }}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status === "saving") return <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</span>;
  if (status === "ok") return <span className="flex items-center gap-1 text-success-foreground"><Check className="h-3 w-3" /> Salvo</span>;
  if (status === "error") return <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" /> Erro ao salvar</span>;
  return <span className="opacity-0">.</span>;
}

function Cell<T extends { id: string }>({
  row,
  col,
  rowIdx,
  colIdx,
  onSave,
  onNav,
}: {
  row: T;
  col: GridColumn<T>;
  rowIdx: number;
  colIdx: number;
  onSave: (v: string | number | string[] | null) => Promise<void>;
  onNav: (e: KeyboardEvent, rowIdx: number, colIdx: number) => void;
}) {
  const initial = col.accessor(row);
  const [val, setVal] = useState<string>(
    initial == null || Array.isArray(initial) ? "" : String(initial),
  );
  useEffect(() => {
    setVal(initial == null || Array.isArray(initial) ? "" : String(initial));
  }, [initial]);

  const warn = col.warn?.(row);
  const display = col.display?.(row);

  async function commit() {
    const original = initial == null ? "" : String(initial);
    if (val === original) return;
    if (col.type === "number") {
      await onSave(val === "" ? null : Number(val));
    } else {
      await onSave(val === "" ? null : val);
    }
  }

  const cellClass = cn(
    "border-b border-r p-0 align-middle",
    warn && "bg-warning/15",
  );

  if (col.type === "multiselect" && col.options) {
    const selected = Array.isArray(initial) ? (initial as string[]) : [];
    const labels = selected
      .map((v) => col.options!.find((o) => o.value === v)?.label ?? v)
      .join(", ");
    return (
      <td data-cell={`${rowIdx}-${colIdx}`} className={cellClass}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-10 w-full truncate px-3 text-left text-sm outline-none hover:bg-primary/5 focus:bg-primary/5"
              title={labels}
            >
              {labels || <span className="text-muted-foreground">—</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2" align="start">
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {col.options.map((o) => {
                const checked = selected.includes(o.value);
                return (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = v
                          ? [...selected, o.value]
                          : selected.filter((s) => s !== o.value);
                        onSave(next);
                      }}
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </td>
    );
  }

  if (col.type === "select" && col.options) {
    return (
      <td data-cell={`${rowIdx}-${colIdx}`} className={cellClass}>
        <select
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            // immediate save on select
            const v = e.target.value;
            if (col.type === "select") {
              onSave(v === "" ? null : v);
            }
          }}
          onKeyDown={(e) => onNav(e, rowIdx, colIdx)}
          className="h-10 w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/5"
        >
          <option value="">—</option>
          {col.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <td data-cell={`${rowIdx}-${colIdx}`} className={cellClass} title={display ?? undefined}>
      <input
        type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
        step={col.type === "number" ? "0.01" : undefined}
        value={val}
        placeholder={col.placeholder}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey) || e.key === "ArrowDown" || (e.key === "Tab" && e.shiftKey) || e.key === "ArrowUp") {
            void commit();
          }
          if (e.key === "Escape") {
            setVal(initial == null ? "" : String(initial));
            (e.target as HTMLInputElement).blur();
            return;
          }
          onNav(e, rowIdx, colIdx);
        }}
        className="h-10 w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/5"
      />
    </td>
  );
}

function DraftRow<T extends { id: string }>({
  columns,
  rowIdx,
  onCreate,
  onNav,
  draftKeys,
  label,
}: {
  columns: GridColumn<T>[];
  rowIdx: number;
  onCreate: (initial: Record<string, string | number | null>) => Promise<void>;
  onNav: (e: KeyboardEvent, rowIdx: number, colIdx: number) => void;
  draftKeys: (string | undefined)[];
  label: string;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  async function tryCreate() {
    const hasRequired = draftKeys.every((k) => k && (draft[k] ?? "").toString().trim() !== "");
    if (!hasRequired) return;
    const payload: Record<string, string | number | null> = {};
    for (const c of columns) {
      const v = draft[c.key];
      if (v == null || v === "") continue;
      payload[c.key] = c.type === "number" ? Number(v) : v;
    }
    await onCreate(payload);
    setDraft({});
  }

  return (
    <tr className="bg-primary/5">
      <td className="sticky left-0 z-[1] w-10 border-b border-r bg-primary/5 text-center text-[11px] font-bold text-primary">
        +
      </td>
      {columns.map((c, cIdx) => {
        const isDraftKey = draftKeys.includes(c.key);
        if (c.type === "select" && c.options) {
          return (
            <td key={c.key} data-cell={`${rowIdx - 1}-${cIdx}`} className="border-b border-r p-0">
              <select
                value={draft[c.key] ?? ""}
                onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
                onBlur={tryCreate}
                onKeyDown={(e) => onNav(e, rowIdx - 1, cIdx)}
                className="h-10 w-full bg-transparent px-3 text-sm outline-none focus:bg-primary/10"
              >
                <option value="">—</option>
                {c.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </td>
          );
        }
        return (
          <td key={c.key} data-cell={`${rowIdx - 1}-${cIdx}`} className="border-b border-r p-0">
            <input
              type={c.type === "date" ? "date" : c.type === "number" ? "number" : "text"}
              step={c.type === "number" ? "0.01" : undefined}
              value={draft[c.key] ?? ""}
              placeholder={cIdx === 0 ? label : c.placeholder}
              onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
              onBlur={tryCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isDraftKey) {
                  e.preventDefault();
                  void tryCreate();
                  return;
                }
                onNav(e, rowIdx - 1, cIdx);
              }}
              className="h-10 w-full bg-transparent px-3 text-sm placeholder:text-muted-foreground/70 outline-none focus:bg-primary/10"
            />
          </td>
        );
      })}
      <td className="sticky right-0 z-[1] w-20 border-b bg-primary/5" />
    </tr>
  );
}