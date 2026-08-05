export const brl = (n: number | null | undefined) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (n: number | null | undefined, digits = 0) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("pt-BR", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const dt = (d: string | null | undefined) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export const STATUS_LABEL: Record<string, string> = {
  EM_COLHEITA: "Em colheita",
  NO_TERREIRO: "No terreiro",
  NO_SECADOR: "No secador",
  NA_TULHA: "Na tulha",
  BENEFICIADO: "Beneficiado",
  ENVIADO_COOPERATIVA: "Na cooperativa",
};

export const STATUS_ORDER = [
  "EM_COLHEITA",
  "NO_TERREIRO",
  "NO_SECADOR",
  "NA_TULHA",
  "BENEFICIADO",
  "ENVIADO_COOPERATIVA",
] as const;

export type LoteStatus = (typeof STATUS_ORDER)[number];
