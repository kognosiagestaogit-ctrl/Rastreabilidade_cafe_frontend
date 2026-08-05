import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ShoppingCart, Table2, LayoutGrid, Award, Wallet, List, Search, Package, DollarSign, Banknote, TrendingUp, Plus, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFazendas } from "@/lib/fazenda-context";
import { supabase } from "@/integrations/supabase/client";
import { brl, dt, num } from "@/lib/format";
import type { Venda } from "@/lib/db-types";
import { EditableGrid, type GridColumn, type GridGroup } from "@/components/editable-grid";

const searchSchema = z.object({
  visao: z.enum(["todas", "receber", "rainforest"]).default("todas").catch("todas"),
});

export const Route = createFileRoute("/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Gestão Pedra Negra" }] }),
  validateSearch: searchSchema,
  component: VendasPage,
});

const FUNRURAL = 0.015;

type Visao = "todas" | "receber" | "rainforest";

const vendaSchema = z.object({
  cliente: z.string().trim().min(1, "Informe o cliente").max(200),
  numero_lote_cooperativa: z.string().trim().max(50).optional().or(z.literal("")),
  padrao: z.string().trim().max(60).optional().or(z.literal("")),
  peneira: z.string().trim().max(30).optional().or(z.literal("")),
  quebra: z.string().optional().or(z.literal("")),
  nf_venda: z.string().trim().max(50).optional().or(z.literal("")),
  tipo_venda: z.enum(["FISICA", "CPR", "TERMO"]).optional(),
  data_venda: z.string().optional().or(z.literal("")),
  sacas_vendidas: z.string().optional().or(z.literal("")),
  vl_bruto: z.string().optional().or(z.literal("")),
  vl_liquido: z.string().optional().or(z.literal("")),
  data_recebimento: z.string().optional().or(z.literal("")),
  valor_recebido: z.string().optional().or(z.literal("")),
  premio_rainforest: z.string().optional().or(z.literal("")),
  nf_premio_rainforest: z.string().trim().max(50).optional().or(z.literal("")),
  anuncio_venda: z.string().trim().max(100).optional().or(z.literal("")),
  observacoes: z.string().max(1000).optional().or(z.literal("")),
  cooperado: z.string().trim().max(200).optional().or(z.literal("")),
  data_envio_armazem: z.string().optional().or(z.literal("")),
  sacas_do_lote: z.string().optional().or(z.literal("")),
  nr_remessa_cooperativa: z.string().trim().max(80).optional().or(z.literal("")),
  amostra: z.string().trim().max(120).optional().or(z.literal("")),
  lotes_agrupados: z.string().trim().max(500).optional().or(z.literal("")),
  descontos: z.string().optional().or(z.literal("")),
  conta_corrente: z.string().trim().max(120).optional().or(z.literal("")),
  is_ds: z.string().optional().or(z.literal("")),
  data_recebimento_premio: z.string().optional().or(z.literal("")),
});

function VendasPage() {
  const { fazendaAtual, fazendas } = useFazendas();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [view, setView] = useState<"planilha" | "cartoes">("planilha");
  const [busca, setBusca] = useState("");
  const [novaOpen, setNovaOpen] = useState(false);
  const [relatorioOpen, setRelatorioOpen] = useState(false);

  const visao: Visao = search.visao;
  const setVisao = (v: Visao) => navigate({ search: { visao: v }, replace: true });

  const vendasQ = useQuery({
    queryKey: ["vendas", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Venda[]> => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("fazenda_id", fazendaAtual!.id)
        .order("data_venda", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as Venda[];
    },
  });

  const vendas = vendasQ.data ?? [];

  const vendasVisao = useMemo(() => {
    return vendas.filter((v) => {
      if (visao === "receber") {
        const saldo = Number(v.vl_liquido ?? v.a_receber_previsto ?? 0) - Number(v.valor_recebido ?? 0);
        if (saldo <= 0.01) return false;
      }
      if (visao === "rainforest" && !(Number(v.premio_rainforest ?? 0) > 0)) return false;
      const termo = busca.trim().toLowerCase();
      if (!termo) return true;
      return [v.cliente, v.numero_lote_cooperativa, v.nf_venda, v.padrao].some((c) =>
        (c ?? "").toLowerCase().includes(termo),
      );
    });
  }, [vendas, visao, busca]);

  const totais = useMemo(() => {
    let bruto = 0, liquido = 0, recebido = 0, saldo = 0, premio = 0, sacas = 0;
    for (const v of vendasVisao) {
      bruto += Number(v.vl_bruto ?? 0);
      const liq = Number(v.vl_liquido ?? v.a_receber_previsto ?? 0);
      liquido += liq;
      recebido += Number(v.valor_recebido ?? 0);
      saldo += Math.max(0, liq - Number(v.valor_recebido ?? 0));
      premio += Number(v.premio_rainforest ?? 0);
      sacas += Number(v.sacas_vendidas ?? 0);
    }
    return { bruto, liquido, recebido, saldo, premio, sacas };
  }, [vendasVisao]);

  if (fazendas.length === 0) {
    return (
      <>
        <PageHeader title="Vendas" />
        <div className="p-8"><EmptyState icon={ShoppingCart} title="Cadastre uma fazenda primeiro" /></div>
      </>
    );
  }

  if (!fazendaAtual) {
    return (
      <>
        <PageHeader title="Vendas" />
        <div className="p-8"><EmptyState icon={ShoppingCart} title="Selecione uma fazenda" description="Escolha uma fazenda no seletor acima para ver as vendas." /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Vendas — ${fazendaAtual?.nome ?? ""}`}
        description="Uma linha por venda: cadastro, recebimento e prêmio Rainforest juntos."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border bg-card p-0.5">
              <ViewBtn active={view === "planilha"} onClick={() => setView("planilha")} icon={Table2} label="Planilha" />
              <ViewBtn active={view === "cartoes"} onClick={() => setView("cartoes")} icon={LayoutGrid} label="Cartões" />
            </div>
            <NovaVendaDialog open={novaOpen} onOpenChange={setNovaOpen} fazendaId={fazendaAtual!.id} />
            <Button variant="outline" size="lg" onClick={() => setRelatorioOpen(true)}>
              <FileSpreadsheet className="h-5 w-5" /> Relatório
            </Button>
          </div>
        }
      />
      <RelatorioVendasDialog
        open={relatorioOpen}
        onOpenChange={setRelatorioOpen}
        fazendaId={fazendaAtual?.id ?? null}
        fazendaNome={fazendaAtual?.nome ?? ""}
      />
      <div className="p-4 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <VisaoBtn active={visao === "todas"} onClick={() => setVisao("todas")} icon={List} label="Todas" />
          <VisaoBtn active={visao === "receber"} onClick={() => setVisao("receber")} icon={Wallet} label="A receber" />
          <VisaoBtn active={visao === "rainforest"} onClick={() => setVisao("rainforest")} icon={Award} label="Rainforest" />
          <div className="relative ml-auto min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente, lote, NF..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-10 pl-9" />
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Package} label="Sacas" value={num(totais.sacas, 1)} />
          <StatCard icon={DollarSign} label="Bruto" value={brl(totais.bruto)} />
          <StatCard icon={TrendingUp} label="Líquido" value={brl(totais.liquido)} />
          <StatCard icon={Banknote} label="Recebido" value={brl(totais.recebido)} tone="success" />
          {visao === "rainforest"
            ? <StatCard icon={Award} label="Prêmio Rainforest" value={brl(totais.premio)} tone="accent" />
            : <StatCard icon={Wallet} label="Saldo aberto" value={brl(totais.saldo)} tone={totais.saldo > 0.01 ? "warning" : "default"} />}
        </div>

        {vendas.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhuma venda registrada"
            description="Clique em Nova venda para preencher o formulário, ou lance direto na planilha abaixo."
            action={
              <Button size="lg" onClick={() => setNovaOpen(true)}>
                <Plus className="h-5 w-5" /> Nova venda
              </Button>
            }
          />
        ) : view === "planilha" ? (
          <VendasPlanilha rows={vendasVisao} fazendaId={fazendaAtual!.id} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {vendasVisao.map((v) => (
              <VendaCard key={v.id} venda={v} onChanged={() => qc.invalidateQueries({ queryKey: ["vendas"] })} />
            ))}
          </div>
        )}

        {view === "planilha" && vendas.length === 0 && (
          <VendasPlanilha rows={[]} fazendaId={fazendaAtual!.id} />
        )}
      </div>
    </>
  );
}

function ViewBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function VisaoBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:border-primary/40"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function VendaCard({ venda }: { venda: Venda; onChanged: () => void }) {
  const saldo = Number(venda.vl_liquido ?? venda.a_receber_previsto ?? 0) - Number(venda.valor_recebido ?? 0);
  const hasRainforest = Number(venda.premio_rainforest ?? 0) > 0;
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{venda.tipo_venda ?? "Venda"}</p>
          <h3 className="mt-1">{venda.cliente ?? "Cliente não informado"}</h3>
          {venda.numero_lote_cooperativa && (
            <p className="text-sm text-muted-foreground">Lote coop. {venda.numero_lote_cooperativa}</p>
          )}
        </div>
        {hasRainforest && (
          <span className="flex items-center gap-1 rounded-full bg-success px-2 py-1 text-xs font-medium text-success-foreground">
            <Award className="h-3 w-3" /> Rainforest
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Info label="Data">{dt(venda.data_venda)}</Info>
        <Info label="Sacas">{num(venda.sacas_vendidas, 1)}</Info>
        <Info label="Bruto">{brl(venda.vl_bruto)}</Info>
        <Info label="Líquido">{brl(venda.vl_liquido ?? venda.a_receber_previsto)}</Info>
        <Info label="Recebido">{brl(venda.valor_recebido)}</Info>
        <Info label="Saldo" tone={saldo > 0.01 ? "warning" : "success"}>{brl(saldo)}</Info>
      </div>
    </div>
  );
}

function Info({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "warning" | "success" }) {
  const colorClass = tone === "warning" ? "text-warning-foreground" : tone === "success" ? "text-success-foreground" : "text-foreground";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-semibold ${colorClass}`}>{children}</p>
    </div>
  );
}

function VendasPlanilha({ rows, fazendaId }: { rows: Venda[]; fazendaId: string }) {
  const qc = useQueryClient();

  const tipoVendaOptions = [
    { value: "FISICA", label: "Física" },
    { value: "CPR", label: "CPR" },
    { value: "TERMO", label: "Termo" },
  ];

  const columns: GridColumn<Venda>[] = [
    { key: "numero_lote_cooperativa", label: "Nº lote coop.", type: "text", width: 130, accessor: (r) => r.numero_lote_cooperativa ?? "" },
    { key: "padrao", label: "Padrão", type: "text", width: 110, accessor: (r) => r.padrao ?? "" },
    { key: "peneira", label: "Peneira", type: "text", width: 90, accessor: (r) => r.peneira ?? "" },
    { key: "quebra", label: "Quebra", type: "number", width: 90, accessor: (r) => r.quebra },

    { key: "cooperado", label: "Cooperado", type: "text", width: 160, accessor: (r) => r.cooperado ?? "" },
    { key: "data_envio_armazem", label: "Data envio armazém", type: "date", width: 150, accessor: (r) => r.data_envio_armazem ?? "" },
    { key: "sacas_do_lote", label: "Sacas do lote", type: "number", width: 120, accessor: (r) => r.sacas_do_lote },
    { key: "nr_remessa_cooperativa", label: "Nº remessa coop.", type: "text", width: 140, accessor: (r) => r.nr_remessa_cooperativa ?? "" },

    { key: "amostra", label: "Amostra", type: "text", width: 130, accessor: (r) => r.amostra ?? "" },
    { key: "cliente", label: "Cliente", type: "text", width: 200, required: true, accessor: (r) => r.cliente ?? "", placeholder: "Nome do comprador" },
    { key: "nf_venda", label: "NF venda", type: "text", width: 110, accessor: (r) => r.nf_venda ?? "" },
    { key: "sacas_vendidas", label: "Sacas", type: "number", width: 100, accessor: (r) => r.sacas_vendidas },
    { key: "tipo_venda", label: "Tipo", type: "select", options: tipoVendaOptions, width: 110, accessor: (r) => r.tipo_venda ?? "" },
    { key: "data_venda", label: "Data venda", type: "date", width: 150, accessor: (r) => r.data_venda ?? "" },
    { key: "vl_bruto", label: "Vl bruto (R$)", type: "number", width: 140, accessor: (r) => r.vl_bruto },
    { key: "vl_liquido", label: "Vl líquido (R$)", type: "number", width: 140, accessor: (r) => r.vl_liquido, display: (r) => "Auto = Bruto × (1 − 1,5%)" },
    { key: "lotes_agrupados", label: "Soma dos lotes", type: "text", width: 180, accessor: (r) => r.lotes_agrupados ?? "", placeholder: "Ex: 001, 002, 003" },
    { key: "descontos", label: "Descontos (R$)", type: "number", width: 140, accessor: (r) => r.descontos },
    { key: "observacoes", label: "Obs.", type: "text", width: 200, accessor: (r) => r.observacoes ?? "" },
    { key: "a_receber_previsto", label: "A receber previsto (R$)", type: "number", width: 160, accessor: (r) => r.a_receber_previsto },
    { key: "valor_recebido", label: "Valor recebido (R$)", type: "number", width: 160, accessor: (r) => r.valor_recebido },
    { key: "data_recebimento", label: "Data receb.", type: "date", width: 150, accessor: (r) => r.data_recebimento ?? "" },
    { key: "conta_corrente", label: "Conta corrente", type: "text", width: 140, accessor: (r) => r.conta_corrente ?? "" },
    { key: "is_ds", label: "IS + DS (R$)", type: "number", width: 130, accessor: (r) => r.is_ds },

    { key: "premio_rainforest", label: "Prêmio Rainf. (R$)", type: "number", width: 160, accessor: (r) => r.premio_rainforest },
    { key: "premio_liquido_funrural", label: "Prêmio líq. (R$)", type: "number", width: 150, accessor: (r) => r.premio_liquido_funrural, display: (r) => "Auto = Prêmio × (1 − 1,5%)" },
    { key: "data_recebimento_premio", label: "Data receb. prêmio", type: "date", width: 150, accessor: (r) => r.data_recebimento_premio ?? "" },
    { key: "nf_premio_rainforest", label: "NF prêmio", type: "text", width: 120, accessor: (r) => r.nf_premio_rainforest ?? "" },
    { key: "anuncio_venda", label: "Anúncio", type: "text", width: 130, accessor: (r) => r.anuncio_venda ?? "" },
  ];

  const groups: GridGroup[] = [
    { label: "Identificação", span: 4, className: "bg-slate-100 dark:bg-slate-900/40" },
    { label: "Cooperativa / Armazém", span: 4, className: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "Venda Safra", span: 16, className: "bg-sky-50 dark:bg-sky-950/30" },
    { label: "Rainforest", span: 5, className: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  function applyDerived(before: Venda | Record<string, unknown>, key: string, value: string | number | null) {
    const merged: any = { ...before, [key]: value };
    const patch: Record<string, unknown> = { [key]: value };
    // vl_liquido auto if user changed vl_bruto (and hasn't manually set liquido this edit)
    if (key === "vl_bruto") {
      const bruto = Number(value ?? 0);
      patch.vl_liquido = bruto ? +(bruto * (1 - FUNRURAL)).toFixed(2) : null;
      patch.a_receber_previsto = patch.vl_liquido;
    }
    // a_receber_previsto follows vl_liquido when manually edited
    if (key === "vl_liquido") {
      patch.a_receber_previsto = value === null || value === "" ? null : Number(value);
    }
    if (key === "premio_rainforest") {
      const p = Number(value ?? 0);
      patch.premio_liquido_funrural = p ? +(p * (1 - FUNRURAL)).toFixed(2) : null;
    }
    return patch;
  }

  async function saveCell(rowId: string, key: string, value: string | number | string[] | null) {
    const current = rows.find((r) => r.id === rowId) ?? {};
    const patch = applyDerived(current, key, value as string | number | null);
    const { error } = await supabase.from("vendas").update(patch as never).eq("id", rowId);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["vendas"] });
  }

  async function createRow(initial: Record<string, string | number | string[] | null>): Promise<string> {
    const payload: Record<string, unknown> = {
      fazenda_id: fazendaId,
      sacas_vendidas: 0,
      ...initial,
    };
    if (payload.vl_bruto != null) {
      const b = Number(payload.vl_bruto);
      payload.vl_liquido = +(b * (1 - FUNRURAL)).toFixed(2);
      payload.a_receber_previsto = payload.vl_liquido;
    }
    if (payload.premio_rainforest != null) {
      const p = Number(payload.premio_rainforest);
      payload.premio_liquido_funrural = +(p * (1 - FUNRURAL)).toFixed(2);
    }
    const { data, error } = await supabase.from("vendas").insert(payload as never).select("id").single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["vendas"] });
    toast.success("Venda criada");
    return data!.id as string;
  }

  async function duplicateRow(rowId: string) {
    const src = rows.find((r) => r.id === rowId);
    if (!src) return;
    const { id: _id, ...rest } = src as any;
    const { error } = await supabase.from("vendas").insert({ ...rest });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vendas"] });
    toast.success("Venda duplicada");
  }

  async function deleteRow(rowId: string) {
    const { error } = await supabase.from("vendas").delete().eq("id", rowId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vendas"] });
    toast.success("Venda excluída");
  }

  return (
    <EditableGrid<Venda>
      rows={rows}
      columns={columns}
      groups={groups}
      onSaveCell={saveCell}
      onCreateRow={createRow}
      onDuplicateRow={duplicateRow}
      onDeleteRow={deleteRow}
      newRowDraftKeys={["cliente"]}
      emptyDraftLabel="Digite o cliente para criar uma venda"
    />
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-2 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  );
}

function NovaVendaDialog({
  open,
  onOpenChange,
  fazendaId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fazendaId: string;
}) {
  const qc = useQueryClient();
  const emptyForm = {
    cliente: "",
    numero_lote_cooperativa: "",
    padrao: "",
    peneira: "",
    quebra: "",
    nf_venda: "",
    tipo_venda: "FISICA" as "FISICA" | "CPR" | "TERMO",
    data_venda: "",
    sacas_vendidas: "",
    vl_bruto: "",
    vl_liquido: "",
    data_recebimento: "",
    valor_recebido: "",
    premio_rainforest: "",
    nf_premio_rainforest: "",
    anuncio_venda: "",
    observacoes: "",
    cooperado: "",
    data_envio_armazem: "",
    sacas_do_lote: "",
    nr_remessa_cooperativa: "",
    amostra: "",
    lotes_agrupados: "",
    descontos: "",
    conta_corrente: "",
    is_ds: "",
    data_recebimento_premio: "",
  };
  const [form, setForm] = useState(emptyForm);

  const brutoNum = Number(form.vl_bruto || 0);
  const liquidoAuto = brutoNum ? +(brutoNum * (1 - FUNRURAL)).toFixed(2) : null;
  const aReceberPrevisto = form.vl_liquido !== "" ? Number(form.vl_liquido) : liquidoAuto;
  const premioNum = Number(form.premio_rainforest || 0);
  const premioLiquidoAuto = premioNum ? +(premioNum * (1 - FUNRURAL)).toFixed(2) : null;

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = vendaSchema.parse(form);
      const vlLiquido =
        parsed.vl_liquido !== "" && parsed.vl_liquido != null
          ? Number(parsed.vl_liquido)
          : liquidoAuto;
      const premioLiq = premioLiquidoAuto;
      const { error } = await supabase.from("vendas").insert({
        fazenda_id: fazendaId,
        cliente: parsed.cliente,
        numero_lote_cooperativa: parsed.numero_lote_cooperativa || null,
        padrao: parsed.padrao || null,
        peneira: parsed.peneira || null,
        quebra: parsed.quebra ? Number(parsed.quebra) : null,
        nf_venda: parsed.nf_venda || null,
        tipo_venda: parsed.tipo_venda ?? null,
        data_venda: parsed.data_venda || null,
        sacas_vendidas: parsed.sacas_vendidas ? Number(parsed.sacas_vendidas) : 0,
        vl_bruto: parsed.vl_bruto ? Number(parsed.vl_bruto) : null,
        vl_liquido: vlLiquido,
        a_receber_previsto: vlLiquido,
        data_recebimento: parsed.data_recebimento || null,
        valor_recebido: parsed.valor_recebido ? Number(parsed.valor_recebido) : null,
        premio_rainforest: parsed.premio_rainforest ? Number(parsed.premio_rainforest) : null,
        premio_liquido_funrural: premioLiq,
        nf_premio_rainforest: parsed.nf_premio_rainforest || null,
        anuncio_venda: parsed.anuncio_venda || null,
        observacoes: parsed.observacoes || null,
        cooperado: parsed.cooperado || null,
        data_envio_armazem: parsed.data_envio_armazem || null,
        sacas_do_lote: parsed.sacas_do_lote ? Number(parsed.sacas_do_lote) : null,
        nr_remessa_cooperativa: parsed.nr_remessa_cooperativa || null,
        amostra: parsed.amostra || null,
        lotes_agrupados: parsed.lotes_agrupados || null,
        descontos: parsed.descontos ? Number(parsed.descontos) : null,
        conta_corrente: parsed.conta_corrente || null,
        is_ds: parsed.is_ds ? Number(parsed.is_ds) : null,
        data_recebimento_premio: parsed.data_recebimento_premio || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Venda registrada");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      onOpenChange(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-5 w-5" /> Nova venda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar nova venda</DialogTitle>
          <DialogDescription>
            Preencha o que já tem em mãos — recebimento e prêmio Rainforest podem ficar em branco e ser completados depois.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
          <SectionHeader label="Identificação" />
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Input className="h-12 text-base" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nome do comprador" />
            </div>
          </div>

          <SectionHeader label="Cooperativa / Armazém" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Cooperado</Label>
              <Input className="h-12 text-base" value={form.cooperado} onChange={(e) => setForm({ ...form, cooperado: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Data envio armazém</Label>
              <Input type="date" className="h-12 text-base" value={form.data_envio_armazem} onChange={(e) => setForm({ ...form, data_envio_armazem: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Nº sacas do lote</Label>
              <Input type="number" step="0.1" className="h-12 text-base" value={form.sacas_do_lote} onChange={(e) => setForm({ ...form, sacas_do_lote: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Nº lote cooperativa</Label>
              <Input className="h-12 text-base" value={form.numero_lote_cooperativa} onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Nº remessa cooperativa</Label>
              <Input className="h-12 text-base" value={form.nr_remessa_cooperativa} onChange={(e) => setForm({ ...form, nr_remessa_cooperativa: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Padrão</Label>
              <Input className="h-12 text-base" value={form.padrao} onChange={(e) => setForm({ ...form, padrao: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Quebra (%)</Label>
              <Input type="number" step="0.01" className="h-12 text-base" value={form.quebra} onChange={(e) => setForm({ ...form, quebra: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Peneira</Label>
              <Input className="h-12 text-base" value={form.peneira} onChange={(e) => setForm({ ...form, peneira: e.target.value })} />
            </div>
          </div>

          <SectionHeader label="Venda Safra" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Amostra</Label>
              <Input className="h-12 text-base" value={form.amostra} onChange={(e) => setForm({ ...form, amostra: e.target.value })} placeholder="Identificação da amostra" />
            </div>
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Input className="h-12 text-base bg-muted" value={form.cliente} readOnly placeholder="Preenchido na identificação" />
            </div>
            <div className="grid gap-2">
              <Label>NF venda</Label>
              <Input className="h-12 text-base" value={form.nf_venda} onChange={(e) => setForm({ ...form, nf_venda: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Sacas vendidas</Label>
              <Input type="number" step="0.1" className="h-12 text-base" value={form.sacas_vendidas} onChange={(e) => setForm({ ...form, sacas_vendidas: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de venda</Label>
              <Select value={form.tipo_venda} onValueChange={(v: "FISICA" | "CPR" | "TERMO") => setForm({ ...form, tipo_venda: v })}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FISICA">Física</SelectItem>
                  <SelectItem value="CPR">CPR</SelectItem>
                  <SelectItem value="TERMO">Termo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data da venda</Label>
              <Input type="date" className="h-12 text-base" value={form.data_venda} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Vl bruto (R$)</Label>
              <Input type="number" step="0.01" className="h-12 text-base" value={form.vl_bruto} onChange={(e) => setForm({ ...form, vl_bruto: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Vl líquido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base"
                value={form.vl_liquido}
                onChange={(e) => setForm({ ...form, vl_liquido: e.target.value })}
                placeholder={liquidoAuto != null ? `Auto: ${liquidoAuto}` : "Auto = Bruto × (1 − 1,5%)"}
              />
            </div>
            <div className="grid gap-2">
              <Label>A receber previsto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base bg-muted"
                value={aReceberPrevisto ?? ""}
                readOnly
                placeholder="Auto = Valor líquido"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Soma dos lotes (quando a venda for mais de um lote)</Label>
              <Input className="h-12 text-base" value={form.lotes_agrupados} onChange={(e) => setForm({ ...form, lotes_agrupados: e.target.value })} placeholder="Ex: 001, 002, 003" />
            </div>
            <div className="grid gap-2">
              <Label>Descontos (R$)</Label>
              <Input type="number" step="0.01" className="h-12 text-base" value={form.descontos} onChange={(e) => setForm({ ...form, descontos: e.target.value })} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>Valor recebido (R$)</Label>
              <Input type="number" step="0.01" className="h-12 text-base" value={form.valor_recebido} onChange={(e) => setForm({ ...form, valor_recebido: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Data do recebimento</Label>
              <Input type="date" className="h-12 text-base" value={form.data_recebimento} onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Conta corrente</Label>
              <Input className="h-12 text-base" value={form.conta_corrente} onChange={(e) => setForm({ ...form, conta_corrente: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>IS + DS (R$)</Label>
              <Input type="number" step="0.01" className="h-12 text-base" value={form.is_ds} onChange={(e) => setForm({ ...form, is_ds: e.target.value })} />
            </div>
          </div>

          <SectionHeader label="Rainforest" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Valor prêmio Rainforest (R$)</Label>
              <Input type="number" step="0.01" className="h-12 text-base" value={form.premio_rainforest} onChange={(e) => setForm({ ...form, premio_rainforest: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Prêmio des. FUNRURAL 1,5% (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base bg-muted"
                value={premioLiquidoAuto ?? ""}
                readOnly
                placeholder="Auto = Prêmio × (1 − 1,5%)"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data do recebimento (prêmio)</Label>
              <Input type="date" className="h-12 text-base" value={form.data_recebimento_premio} onChange={(e) => setForm({ ...form, data_recebimento_premio: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>NF prêmio</Label>
              <Input className="h-12 text-base" value={form.nf_premio_rainforest} onChange={(e) => setForm({ ...form, nf_premio_rainforest: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Anúncio</Label>
              <Input className="h-12 text-base" value={form.anuncio_venda} onChange={(e) => setForm({ ...form, anuncio_venda: e.target.value })} />
            </div>
          </div>

          <SectionHeader label="Observações" />
          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RelatorioVendasDialog({
  open,
  onOpenChange,
  fazendaId,
  fazendaNome,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fazendaId: string | null;
  fazendaNome: string;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioAno = `${new Date().getFullYear()}-01-01`;
  const [inicio, setInicio] = useState(inicioAno);
  const [fim, setFim] = useState(hoje);
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    if (!fazendaId) return;
    if (inicio && fim && inicio > fim) {
      toast.error("Data inicial não pode ser maior que a final");
      return;
    }
    setGerando(true);
    try {
      let q = supabase.from("vendas").select("*").eq("fazenda_id", fazendaId).order("data_venda", { ascending: true, nullsFirst: false });
      if (inicio) q = q.gte("data_venda", inicio);
      if (fim) q = q.lte("data_venda", fim);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Venda[];
      if (rows.length === 0) {
        toast.info("Nenhuma venda encontrada no período");
        setGerando(false);
        return;
      }

      const mapped = rows.map((v) => {
        const liq = v.vl_liquido ?? v.a_receber_previsto ?? null;
        const saldo = liq != null ? Number(liq) - Number(v.valor_recebido ?? 0) : null;
        return {
          // Identificação
          "Cliente": v.cliente ?? "",
          "Nº lote coop.": v.numero_lote_cooperativa ?? "",
          "Padrão": v.padrao ?? "",
          "Peneira": v.peneira ?? "",
          "Quebra (%)": v.quebra ?? null,
          // Cooperativa / Armazém
          "Cooperado": v.cooperado ?? "",
          "Data envio armazém": v.data_envio_armazem ?? "",
          "Sacas do lote": v.sacas_do_lote ?? null,
          "Nº remessa cooperativa": v.nr_remessa_cooperativa ?? "",
          // Venda Safra
          "Amostra": v.amostra ?? "",
          "NF venda": v.nf_venda ?? "",
          "Sacas vendidas": v.sacas_vendidas ?? 0,
          "Tipo de venda": v.tipo_venda ?? "",
          "Data venda": v.data_venda ?? "",
          "Vl bruto (R$)": v.vl_bruto ?? null,
          "Vl líquido (R$)": liq,
          "A receber previsto (R$)": v.a_receber_previsto ?? null,
          "Soma dos lotes": v.lotes_agrupados ?? "",
          "Descontos (R$)": v.descontos ?? null,
          "Observações": v.observacoes ?? "",
          "Valor recebido (R$)": v.valor_recebido ?? null,
          "Data recebimento": v.data_recebimento ?? "",
          "Conta corrente": v.conta_corrente ?? "",
          "IS + DS (R$)": v.is_ds ?? null,
          // Rainforest
          "Valor prêmio Rainforest (R$)": v.premio_rainforest ?? null,
          "Prêmio des. FUNRURAL 1,5% (R$)": v.premio_liquido_funrural ?? null,
          "Data recebimento prêmio": v.data_recebimento_premio ?? "",
          "NF prêmio": v.nf_premio_rainforest ?? "",
          "Anúncio": v.anuncio_venda ?? "",
          // Resumo
          "Saldo aberto (R$)": saldo,
        };
      });

      const ws = XLSX.utils.json_to_sheet(mapped);
      const cols = Object.keys(mapped[0]).map((k) => ({
        wch: Math.min(40, Math.max(k.length + 2, ...mapped.map((r) => String((r as any)[k] ?? "").length + 2))),
      }));
      (ws as any)["!cols"] = cols;

      // Totais (linha simples ao final)
      const totalSacas = rows.reduce((s, v) => s + Number(v.sacas_vendidas ?? 0), 0);
      const totalBruto = rows.reduce((s, v) => s + Number(v.vl_bruto ?? 0), 0);
      const totalDescontos = rows.reduce((s, v) => s + Number(v.descontos ?? 0), 0);
      const totalLiquido = rows.reduce((s, v) => s + Number(v.vl_liquido ?? v.a_receber_previsto ?? 0), 0);
      const totalRecebido = rows.reduce((s, v) => s + Number(v.valor_recebido ?? 0), 0);
      const totalPremio = rows.reduce((s, v) => s + Number(v.premio_rainforest ?? 0), 0);
      const totalIsDs = rows.reduce((s, v) => s + Number(v.is_ds ?? 0), 0);
      XLSX.utils.sheet_add_aoa(
        ws,
        [
          [],
          [
            "TOTAIS",
            `${rows.length} venda(s)`,
            `Sacas: ${totalSacas}`,
            `Bruto: ${totalBruto.toFixed(2)}`,
            `Descontos: ${totalDescontos.toFixed(2)}`,
            `Líquido: ${totalLiquido.toFixed(2)}`,
            `IS+DS: ${totalIsDs.toFixed(2)}`,
            `Recebido: ${totalRecebido.toFixed(2)}`,
            `Saldo: ${(totalLiquido - totalRecebido).toFixed(2)}`,
            `Prêmio: ${totalPremio.toFixed(2)}`,
          ],
        ],
        { origin: -1 },
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vendas");

      const nomeArq = `vendas_${fazendaNome.replace(/[^a-zA-Z0-9]+/g, "_")}_${inicio || "inicio"}_a_${fim || "hoje"}.xlsx`;
      XLSX.writeFile(wb, nomeArq);
      toast.success(`${rows.length} venda(s) exportada(s)`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar relatório");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Relatório de vendas</DialogTitle>
          <DialogDescription>
            Selecione o período desejado. O arquivo Excel será baixado com todas as vendas do intervalo (por data da venda).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="rel-inicio">Data inicial</Label>
            <Input id="rel-inicio" type="date" className="h-12 text-base" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rel-fim">Data final</Label>
            <Input id="rel-fim" type="date" className="h-12 text-base" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: deixe as datas em branco para exportar todo o histórico.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="lg" onClick={gerar} disabled={gerando || !fazendaId}>
            <FileSpreadsheet className="h-5 w-5" />
            {gerando ? "Gerando..." : "Gerar Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}