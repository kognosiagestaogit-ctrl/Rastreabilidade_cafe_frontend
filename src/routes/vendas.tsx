import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  ShoppingCart,
  Award,
  Wallet,
  List,
  Search,
  Package,
  DollarSign,
  Banknote,
  TrendingUp,
  Plus,
  FileSpreadsheet,
  Warehouse,
  AlertTriangle,
  ArrowRight,
  Lock,
  Trash2,
  Calendar,
  Filter,
  RotateCcw,
} from "lucide-react";
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
import { mockDb } from "@/lib/mock-db";
import { brl, dt, num } from "@/lib/format";
import type { Venda } from "@/lib/db-types";

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

export const VENDA_STATUS_LABEL: Record<string, string> = {
  EM_ARMAZEM: "Em armazém",
  A_RECEBER: "A receber",
  RECEBIDA: "Recebida",
  RAINFOREST: "Prêmio Rainforest",
};

export const VENDA_STATUS_ORDER = ["EM_ARMAZEM", "A_RECEBER", "RECEBIDA", "RAINFOREST"] as const;

export type VendaStatus = (typeof VENDA_STATUS_ORDER)[number];

export const VENDA_STATUS_ICONS: Record<
  VendaStatus,
  React.ComponentType<{ className?: string }>
> = {
  EM_ARMAZEM: Warehouse,
  A_RECEBER: Wallet,
  RECEBIDA: Banknote,
  RAINFOREST: Award,
};

export function calculateVendaStatus(form: {
  premio_rainforest?: string | number | null;
  data_recebimento_premio?: string | null;
  nf_premio_rainforest?: string | null;
  data_recebimento?: string | null;
  valor_recebido?: string | number | null;
  data_venda?: string | null;
  vl_bruto?: string | number | null;
  sacas_vendidas?: string | number | null;
}): VendaStatus {
  if (
    (form.premio_rainforest !== "" &&
      form.premio_rainforest != null &&
      Number(form.premio_rainforest) > 0) ||
    form.data_recebimento_premio ||
    form.nf_premio_rainforest
  ) {
    return "RAINFOREST";
  }
  if (
    form.data_recebimento ||
    (form.valor_recebido !== "" && form.valor_recebido != null && Number(form.valor_recebido) > 0)
  ) {
    return "RECEBIDA";
  }
  if (
    form.data_venda ||
    (form.vl_bruto !== "" && form.vl_bruto != null && Number(form.vl_bruto) > 0) ||
    (form.sacas_vendidas !== "" && form.sacas_vendidas != null && Number(form.sacas_vendidas) > 0)
  ) {
    return "A_RECEBER";
  }
  return "EM_ARMAZEM";
}

export function getVendaEffectiveStatus(venda: Venda): VendaStatus {
  if (venda.status && VENDA_STATUS_ORDER.includes(venda.status as VendaStatus)) {
    return venda.status as VendaStatus;
  }
  return calculateVendaStatus(venda);
}

export function hasPendingVendaData(venda: Venda): boolean {
  const status = getVendaEffectiveStatus(venda);
  const isAReceberPending = status === "A_RECEBER" && !venda.data_venda && !venda.vl_bruto;
  const isRecebidaPending =
    status === "RECEBIDA" && !venda.data_recebimento && !venda.valor_recebido;
  const isRainforestPending =
    status === "RAINFOREST" && !venda.premio_rainforest && !venda.data_recebimento_premio;
  return isAReceberPending || isRecebidaPending || isRainforestPending;
}

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
  const [buscaDraft, setBuscaDraft] = useState("");
  const [visaoDraft, setVisaoDraft] = useState<Visao>("todas");

  const [buscaApplied, setBuscaApplied] = useState("");
  const [visaoApplied, setVisaoApplied] = useState<Visao>("todas");

  const [novaOpen, setNovaOpen] = useState(false);
  const [editVenda, setEditVenda] = useState<Venda | null>(null);
  const [relatorioOpen, setRelatorioOpen] = useState(false);

  const handleApplyFilters = () => {
    setBuscaApplied(buscaDraft);
    setVisaoApplied(visaoDraft);
    toast.success("Filtros aplicados");
  };

  const handleClearFilters = () => {
    setBuscaDraft("");
    setVisaoDraft("todas");
    setBuscaApplied("");
    setVisaoApplied("todas");
    toast.info("Filtros limpos");
  };

  const vendasQ = useQuery({
    queryKey: ["vendas", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Venda[]> => {
      return await mockDb.getVendas(fazendaAtual!.id);
    },
  });

  const moveMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VendaStatus }) => {
      await mockDb.updateVenda(id, { status });
    },
    onSuccess: () => {
      toast.success("Venda atualizada");
      qc.invalidateQueries({ queryKey: ["vendas"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar venda"),
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: VendaStatus) => {
    e.preventDefault();
    const vendaId = e.dataTransfer.getData("text/plain");
    if (!vendaId) return;

    const venda = vendasQ.data?.find((v) => v.id === vendaId);
    if (!venda) return;

    const currentStatus = getVendaEffectiveStatus(venda);
    if (currentStatus === newStatus) return;

    const currentIndex = VENDA_STATUS_ORDER.indexOf(currentStatus);
    const newIndex = VENDA_STATUS_ORDER.indexOf(newStatus);

    if (newIndex > currentIndex) {
      if (newIndex > currentIndex + 1) {
        toast.error(
          "A venda só pode ser avançada para a etapa imediatamente seguinte (uma de cada vez).",
        );
        return;
      }
      if (hasPendingVendaData(venda)) {
        toast.error(
          "Esta venda possui informações pendentes na etapa atual (em vermelho). Clique na venda e preencha as informações antes de avançar.",
        );
        return;
      }
    }

    if (newIndex < currentIndex) {
      if (
        !window.confirm(
          "Você está voltando esta venda para uma etapa anterior. Dados das etapas seguintes poderão ser considerados inválidos ou perder o sentido. Confirma o retorno?",
        )
      ) {
        return;
      }
    }

    moveMut.mutate({ id: venda.id, status: newStatus });
  };

  const vendas = vendasQ.data ?? [];

  const vendasVisao = useMemo(() => {
    return vendas.filter((v) => {
      if (visaoApplied === "receber") {
        const saldo =
          Number(v.vl_liquido ?? v.a_receber_previsto ?? 0) - Number(v.valor_recebido ?? 0);
        if (saldo <= 0.01) return false;
      }
      if (visaoApplied === "rainforest" && !(Number(v.premio_rainforest ?? 0) > 0)) return false;
      const termo = buscaApplied.trim().toLowerCase();
      if (!termo) return true;
      return [v.cliente, v.numero_lote_cooperativa, v.nf_venda, v.padrao].some((c) =>
        (c ?? "").toLowerCase().includes(termo),
      );
    });
  }, [vendas, visaoApplied, buscaApplied]);

  const totais = useMemo(() => {
    let bruto = 0,
      liquido = 0,
      recebido = 0,
      saldo = 0,
      premio = 0,
      sacas = 0;
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
        <div className="p-8">
          <EmptyState icon={ShoppingCart} title="Cadastre uma fazenda primeiro" />
        </div>
      </>
    );
  }

  if (!fazendaAtual) {
    return (
      <>
        <PageHeader title="Vendas" />
        <div className="p-8">
          <EmptyState
            icon={ShoppingCart}
            title="Selecione uma fazenda"
            description="Escolha uma fazenda no seletor acima para ver as vendas."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Vendas — ${fazendaAtual?.nome ?? ""}`}
        description="Acompanhamento por colunas de Kanban: do armazém ao recebimento do prêmio."
        actions={
          <div className="flex items-center gap-2">
            <NovaVendaDialog
              open={novaOpen}
              onOpenChange={setNovaOpen}
              fazendaId={fazendaAtual!.id}
            />
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
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <VisaoBtn
              active={visaoDraft === "todas"}
              onClick={() => setVisaoDraft("todas")}
              icon={List}
              label="Todas"
            />
            <VisaoBtn
              active={visaoDraft === "receber"}
              onClick={() => setVisaoDraft("receber")}
              icon={Wallet}
              label="A receber"
            />
            <VisaoBtn
              active={visaoDraft === "rainforest"}
              onClick={() => setVisaoDraft("rainforest")}
              icon={Award}
              label="Rainforest"
            />
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, lote, NF..."
              value={buscaDraft}
              onChange={(e) => setBuscaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplyFilters();
              }}
              className="h-10 pl-9"
            />
          </div>
          <Button onClick={handleApplyFilters} className="h-10 gap-2">
            <Filter className="h-4 w-4" /> Aplicar filtros
          </Button>
          <Button variant="outline" onClick={handleClearFilters} className="h-10 gap-2">
            <RotateCcw className="h-4 w-4" /> Limpar filtros
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={Package} label="Sacas" value={num(totais.sacas, 1)} />
          <StatCard icon={DollarSign} label="Bruto" value={brl(totais.bruto)} />
          <StatCard icon={TrendingUp} label="Líquido" value={brl(totais.liquido)} />
          <StatCard icon={Banknote} label="Recebido" value={brl(totais.recebido)} tone="success" />
          {visaoApplied === "rainforest" ? (
            <StatCard
              icon={Award}
              label="Prêmio Rainforest"
              value={brl(totais.premio)}
              tone="accent"
            />
          ) : (
            <StatCard
              icon={Wallet}
              label="Saldo aberto"
              value={brl(totais.saldo)}
              tone={totais.saldo > 0.01 ? "warning" : "default"}
            />
          )}
        </div>

        {vendas.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Nenhuma venda registrada"
            description="Clique em Nova venda para registrar uma venda no Kanban."
            action={
              <Button size="lg" onClick={() => setNovaOpen(true)}>
                <Plus className="h-5 w-5" /> Nova venda
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {VENDA_STATUS_ORDER.map((status) => {
              const itens = vendasVisao.filter((v) => getVendaEffectiveStatus(v) === status);
              const Icon = VENDA_STATUS_ICONS[status];
              return (
                <div
                  key={status}
                  className="flex flex-col rounded-xl border bg-secondary/40 p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <header className="mb-3 flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <span>{VENDA_STATUS_LABEL[status]}</span>
                    </h2>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium">
                      {itens.length}
                    </span>
                  </header>
                  <div className="flex flex-col gap-2">
                    {itens.length === 0 && (
                      <p className="rounded-lg border border-dashed bg-card/60 px-3 py-4 text-center text-xs text-muted-foreground">
                        Vazio
                      </p>
                    )}
                    {itens.map((v) => (
                      <VendaCard
                        key={v.id}
                        venda={v}
                        onAdvance={() => {
                          if (hasPendingVendaData(v)) {
                            toast.error(
                              "Esta venda possui informações pendentes na etapa atual (em vermelho). Clique na venda e preencha as informações antes de avançar.",
                            );
                            return;
                          }
                          const curStatus = getVendaEffectiveStatus(v);
                          const idx = VENDA_STATUS_ORDER.indexOf(curStatus);
                          const next = VENDA_STATUS_ORDER[idx + 1];
                          if (next) moveMut.mutate({ id: v.id, status: next });
                        }}
                        onEdit={() => setEditVenda(v)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editVenda && <EditarVendaDialog venda={editVenda} onClose={() => setEditVenda(null)} />}
    </>
  );
}

function VisaoBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:border-primary/40"}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function VendaCard({
  venda,
  onAdvance,
  onEdit,
}: {
  venda: Venda;
  onAdvance: () => void;
  onEdit: () => void;
}) {
  const currentStatus = getVendaEffectiveStatus(venda);
  const hasPending = hasPendingVendaData(venda);
  const saldo =
    Number(venda.vl_liquido ?? venda.a_receber_previsto ?? 0) - Number(venda.valor_recebido ?? 0);
  const hasRainforest = Number(venda.premio_rainforest ?? 0) > 0;
  const isLast = currentStatus === "RAINFOREST";

  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-sm cursor-grab active:cursor-grabbing ${hasPending ? "border-destructive/50 ring-1 ring-destructive/20" : ""}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", venda.id)}
    >
      <button onClick={onEdit} className="block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {venda.tipo_venda ?? "Venda"}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-foreground">
              {venda.cliente ?? "Cliente não informado"}
            </h3>
            {venda.numero_lote_cooperativa && (
              <p className="text-xs text-muted-foreground">
                Lote coop. #{venda.numero_lote_cooperativa}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasPending && (
              <span title="Faltam informações para esta etapa">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              </span>
            )}
            {hasRainforest && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Award className="h-3 w-3" /> Rainforest
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {venda.sacas_vendidas != null && (
            <div>
              <span className="text-[10px] uppercase text-muted-foreground">Sacas</span>
              <p className="font-semibold text-foreground">{num(venda.sacas_vendidas, 1)} sc</p>
            </div>
          )}
          {venda.vl_bruto != null && (
            <div>
              <span className="text-[10px] uppercase text-muted-foreground">Valor bruto</span>
              <p className="font-semibold text-foreground">{brl(venda.vl_bruto)}</p>
            </div>
          )}
          {venda.valor_recebido != null && (
            <div>
              <span className="text-[10px] uppercase text-muted-foreground">Recebido</span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(venda.valor_recebido)}
              </p>
            </div>
          )}
          {saldo > 0.01 && (
            <div>
              <span className="text-[10px] uppercase text-muted-foreground">Saldo</span>
              <p className="font-semibold text-amber-600 dark:text-amber-400">{brl(saldo)}</p>
            </div>
          )}
        </div>
      </button>

      {!isLast && (
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onAdvance}>
          Avançar etapa <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function SectionHeader({ label, locked }: { label: string; locked?: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-between border-b pb-1 text-xs font-semibold uppercase tracking-wide">
      <span className={locked ? "text-muted-foreground/40" : "text-muted-foreground"}>{label}</span>
      {locked && (
        <span className="flex items-center gap-1 font-normal text-muted-foreground/60 lowercase italic text-[11px]">
          <Lock className="h-3 w-3" /> preencha a etapa anterior
        </span>
      )}
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

  const isIdentificacaoPreenchida = form.cliente.trim().length > 0;

  const canFillVendaSafra = isIdentificacaoPreenchida;
  const isVendaSafraPreenchida =
    canFillVendaSafra &&
    (!!form.data_venda ||
      (form.vl_bruto !== "" && Number(form.vl_bruto) > 0) ||
      (form.sacas_vendidas !== "" && Number(form.sacas_vendidas) > 0));

  const canFillRecebimento = isVendaSafraPreenchida;
  const isRecebimentoPreenchido =
    canFillRecebimento &&
    (!!form.data_recebimento || (form.valor_recebido !== "" && Number(form.valor_recebido) > 0));

  const canFillRainforest = isRecebimentoPreenchido;

  const brutoNum = Number(form.vl_bruto || 0);
  const liquidoAuto = brutoNum ? +(brutoNum * (1 - FUNRURAL)).toFixed(2) : null;
  const aReceberPrevisto = form.vl_liquido !== "" ? Number(form.vl_liquido) : liquidoAuto;
  const premioNum = Number(form.premio_rainforest || 0);
  const premioLiquidoAuto = premioNum ? +(premioNum * (1 - FUNRURAL)).toFixed(2) : null;

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = vendaSchema.parse(form);
      const computedStatus = calculateVendaStatus(form);
      const vlLiquido =
        parsed.vl_liquido !== "" && parsed.vl_liquido != null
          ? Number(parsed.vl_liquido)
          : liquidoAuto;
      const premioLiq = premioLiquidoAuto;
      await mockDb.createVenda({
        fazenda_id: fazendaId,
        status: computedStatus,
        cliente: parsed.cliente,
        numero_lote_cooperativa: parsed.numero_lote_cooperativa || null,
        padrao: parsed.padrao || null,
        peneira: parsed.peneira || null,
        quebra: parsed.quebra ? Number(parsed.quebra) : null,
        cooperado: parsed.cooperado || null,
        data_envio_armazem: parsed.data_envio_armazem || null,
        sacas_do_lote: parsed.sacas_do_lote ? Number(parsed.sacas_do_lote) : null,
        nr_remessa_cooperativa: parsed.nr_remessa_cooperativa || null,

        // Venda Safra
        amostra: canFillVendaSafra ? parsed.amostra || null : null,
        nf_venda: canFillVendaSafra ? parsed.nf_venda || null : null,
        tipo_venda: canFillVendaSafra ? (parsed.tipo_venda ?? null) : null,
        data_venda: canFillVendaSafra ? parsed.data_venda || null : null,
        sacas_vendidas:
          canFillVendaSafra && parsed.sacas_vendidas ? Number(parsed.sacas_vendidas) : 0,
        vl_bruto: canFillVendaSafra && parsed.vl_bruto ? Number(parsed.vl_bruto) : null,
        vl_liquido: canFillVendaSafra ? vlLiquido : null,
        a_receber_previsto: canFillVendaSafra ? vlLiquido : null,
        lotes_agrupados: canFillVendaSafra ? parsed.lotes_agrupados || null : null,
        descontos: canFillVendaSafra && parsed.descontos ? Number(parsed.descontos) : null,

        // Recebimento
        data_recebimento: canFillRecebimento ? parsed.data_recebimento || null : null,
        valor_recebido:
          canFillRecebimento && parsed.valor_recebido ? Number(parsed.valor_recebido) : null,
        conta_corrente: canFillRecebimento ? parsed.conta_corrente || null : null,
        is_ds: canFillRecebimento && parsed.is_ds ? Number(parsed.is_ds) : null,

        // Rainforest
        premio_rainforest:
          canFillRainforest && parsed.premio_rainforest ? Number(parsed.premio_rainforest) : null,
        premio_liquido_funrural: canFillRainforest ? premioLiq : null,
        nf_premio_rainforest: canFillRainforest ? parsed.nf_premio_rainforest || null : null,
        anuncio_venda: canFillRainforest ? parsed.anuncio_venda || null : null,
        data_recebimento_premio: canFillRainforest ? parsed.data_recebimento_premio || null : null,

        observacoes: parsed.observacoes || null,
      });
    },
    onSuccess: () => {
      toast.success("Venda registrada");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      onOpenChange(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar venda"),
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
            Preencha os campos em sequência. As etapas seguintes são liberadas conforme você
            preenche a etapa atual.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
          <SectionHeader label="Identificação" />
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Input
                className="h-12 text-base"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                placeholder="Nome do comprador"
              />
            </div>
          </div>

          <SectionHeader label="Cooperativa / Armazém" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Cooperado</Label>
              <Input
                className="h-12 text-base"
                value={form.cooperado}
                onChange={(e) => setForm({ ...form, cooperado: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data envio armazém</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_envio_armazem}
                onChange={(e) => setForm({ ...form, data_envio_armazem: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº sacas do lote</Label>
              <Input
                type="number"
                step="0.1"
                className="h-12 text-base"
                value={form.sacas_do_lote}
                onChange={(e) => setForm({ ...form, sacas_do_lote: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº lote cooperativa</Label>
              <Input
                className="h-12 text-base"
                value={form.numero_lote_cooperativa}
                onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº remessa cooperativa</Label>
              <Input
                className="h-12 text-base"
                value={form.nr_remessa_cooperativa}
                onChange={(e) => setForm({ ...form, nr_remessa_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Padrão</Label>
              <Input
                className="h-12 text-base"
                value={form.padrao}
                onChange={(e) => setForm({ ...form, padrao: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Quebra (%)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base"
                value={form.quebra}
                onChange={(e) => setForm({ ...form, quebra: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Peneira</Label>
              <Input
                className="h-12 text-base"
                value={form.peneira}
                onChange={(e) => setForm({ ...form, peneira: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Venda Safra" locked={!canFillVendaSafra} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Amostra</Label>
              <Input
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.amostra}
                onChange={(e) => setForm({ ...form, amostra: e.target.value })}
                placeholder="Identificação da amostra"
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>NF venda</Label>
              <Input
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.nf_venda}
                onChange={(e) => setForm({ ...form, nf_venda: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Sacas vendidas</Label>
              <Input
                type="number"
                step="0.1"
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.sacas_vendidas}
                onChange={(e) => setForm({ ...form, sacas_vendidas: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Tipo de venda</Label>
              <Select
                disabled={!canFillVendaSafra}
                value={form.tipo_venda}
                onValueChange={(v: "FISICA" | "CPR" | "TERMO") =>
                  setForm({ ...form, tipo_venda: v })
                }
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FISICA">Física</SelectItem>
                  <SelectItem value="CPR">CPR</SelectItem>
                  <SelectItem value="TERMO">Termo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Data da venda</Label>
              <Input
                type="date"
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.data_venda}
                onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Vl bruto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.vl_bruto}
                onChange={(e) => setForm({ ...form, vl_bruto: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Vl líquido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.vl_liquido}
                onChange={(e) => setForm({ ...form, vl_liquido: e.target.value })}
                placeholder={
                  liquidoAuto != null ? `Auto: ${liquidoAuto}` : "Auto = Bruto × (1 − 1,5%)"
                }
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>
                Soma dos lotes (quando a venda for mais de um lote)
              </Label>
              <Input
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.lotes_agrupados}
                onChange={(e) => setForm({ ...form, lotes_agrupados: e.target.value })}
                placeholder="Ex: 001, 002, 003"
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillVendaSafra ? "opacity-50" : ""}>Descontos (R$)</Label>
              <Input
                type="number"
                step="0.01"
                disabled={!canFillVendaSafra}
                className="h-12 text-base"
                value={form.descontos}
                onChange={(e) => setForm({ ...form, descontos: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Recebimento" locked={!canFillRecebimento} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!canFillRecebimento ? "opacity-50" : ""}>Valor recebido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                disabled={!canFillRecebimento}
                className="h-12 text-base"
                value={form.valor_recebido}
                onChange={(e) => setForm({ ...form, valor_recebido: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillRecebimento ? "opacity-50" : ""}>Data do recebimento</Label>
              <Input
                type="date"
                disabled={!canFillRecebimento}
                className="h-12 text-base"
                value={form.data_recebimento}
                onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillRecebimento ? "opacity-50" : ""}>Conta corrente</Label>
              <Input
                disabled={!canFillRecebimento}
                className="h-12 text-base"
                value={form.conta_corrente}
                onChange={(e) => setForm({ ...form, conta_corrente: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillRecebimento ? "opacity-50" : ""}>IS + DS (R$)</Label>
              <Input
                type="number"
                step="0.01"
                disabled={!canFillRecebimento}
                className="h-12 text-base"
                value={form.is_ds}
                onChange={(e) => setForm({ ...form, is_ds: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Rainforest" locked={!canFillRainforest} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!canFillRainforest ? "opacity-50" : ""}>
                Valor prêmio Rainforest (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                disabled={!canFillRainforest}
                className="h-12 text-base"
                value={form.premio_rainforest}
                onChange={(e) => setForm({ ...form, premio_rainforest: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillRainforest ? "opacity-50" : ""}>
                Data do recebimento (prêmio)
              </Label>
              <Input
                type="date"
                disabled={!canFillRainforest}
                className="h-12 text-base"
                value={form.data_recebimento_premio}
                onChange={(e) => setForm({ ...form, data_recebimento_premio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillRainforest ? "opacity-50" : ""}>NF prêmio</Label>
              <Input
                disabled={!canFillRainforest}
                className="h-12 text-base"
                value={form.nf_premio_rainforest}
                onChange={(e) => setForm({ ...form, nf_premio_rainforest: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillRainforest ? "opacity-50" : ""}>Anúncio</Label>
              <Input
                disabled={!canFillRainforest}
                className="h-12 text-base"
                value={form.anuncio_venda}
                onChange={(e) => setForm({ ...form, anuncio_venda: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Observações" />
          <div className="grid gap-2">
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarVendaDialog({ venda, onClose }: { venda: Venda; onClose: () => void }) {
  const qc = useQueryClient();
  const currentStatus = getVendaEffectiveStatus(venda);
  const [form, setForm] = useState({
    status: currentStatus,
    cliente: venda.cliente ?? "",
    numero_lote_cooperativa: venda.numero_lote_cooperativa ?? "",
    padrao: venda.padrao ?? "",
    peneira: venda.peneira ?? "",
    quebra: venda.quebra?.toString() ?? "",
    nf_venda: venda.nf_venda ?? "",
    tipo_venda: (venda.tipo_venda ?? "FISICA") as "FISICA" | "CPR" | "TERMO",
    data_venda: venda.data_venda ?? "",
    sacas_vendidas: venda.sacas_vendidas?.toString() ?? "",
    vl_bruto: venda.vl_bruto?.toString() ?? "",
    vl_liquido: venda.vl_liquido?.toString() ?? "",
    data_recebimento: venda.data_recebimento ?? "",
    valor_recebido: venda.valor_recebido?.toString() ?? "",
    premio_rainforest: venda.premio_rainforest?.toString() ?? "",
    nf_premio_rainforest: venda.nf_premio_rainforest ?? "",
    anuncio_venda: venda.anuncio_venda ?? "",
    observacoes: venda.observacoes ?? "",
    cooperado: venda.cooperado ?? "",
    data_envio_armazem: venda.data_envio_armazem ?? "",
    sacas_do_lote: venda.sacas_do_lote?.toString() ?? "",
    nr_remessa_cooperativa: venda.nr_remessa_cooperativa ?? "",
    amostra: venda.amostra ?? "",
    lotes_agrupados: venda.lotes_agrupados ?? "",
    descontos: venda.descontos?.toString() ?? "",
    conta_corrente: venda.conta_corrente ?? "",
    is_ds: venda.is_ds?.toString() ?? "",
    data_recebimento_premio: venda.data_recebimento_premio ?? "",
  });

  const brutoNum = Number(form.vl_bruto || 0);
  const liquidoAuto = brutoNum ? +(brutoNum * (1 - FUNRURAL)).toFixed(2) : null;
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
      await mockDb.updateVenda(venda.id, {
        status: form.status,
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
      });
    },
    onSuccess: () => {
      toast.success("Venda atualizada");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar venda"),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      await mockDb.deleteVenda(venda.id);
    },
    onSuccess: () => {
      toast.success("Venda excluída");
      qc.invalidateQueries({ queryKey: ["vendas"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir venda"),
  });

  const originalIndex = VENDA_STATUS_ORDER.indexOf(currentStatus);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Venda — {venda.cliente}</DialogTitle>
          <DialogDescription>
            Atualize os dados e a etapa da venda conforme o andamento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Etapa atual</Label>
            <Select
              value={form.status}
              onValueChange={(v: VendaStatus) => setForm({ ...form, status: v })}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENDA_STATUS_ORDER.map((s, idx) => {
                  const isSkipping = idx > originalIndex + 1;
                  return (
                    <SelectItem key={s} value={s} disabled={isSkipping}>
                      {VENDA_STATUS_LABEL[s]} {isSkipping ? "(Etapa bloqueada)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <SectionHeader label="Identificação & Armazém" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Input
                className="h-12 text-base"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Cooperado</Label>
              <Input
                className="h-12 text-base"
                value={form.cooperado}
                onChange={(e) => setForm({ ...form, cooperado: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data envio armazém</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_envio_armazem}
                onChange={(e) => setForm({ ...form, data_envio_armazem: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº sacas do lote</Label>
              <Input
                type="number"
                step="0.1"
                className="h-12 text-base"
                value={form.sacas_do_lote}
                onChange={(e) => setForm({ ...form, sacas_do_lote: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº lote cooperativa</Label>
              <Input
                className="h-12 text-base"
                value={form.numero_lote_cooperativa}
                onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº remessa cooperativa</Label>
              <Input
                className="h-12 text-base"
                value={form.nr_remessa_cooperativa}
                onChange={(e) => setForm({ ...form, nr_remessa_cooperativa: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Venda Safra" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Amostra</Label>
              <Input
                className="h-12 text-base"
                value={form.amostra}
                onChange={(e) => setForm({ ...form, amostra: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>NF venda</Label>
              <Input
                className="h-12 text-base"
                value={form.nf_venda}
                onChange={(e) => setForm({ ...form, nf_venda: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Sacas vendidas</Label>
              <Input
                type="number"
                step="0.1"
                className="h-12 text-base"
                value={form.sacas_vendidas}
                onChange={(e) => setForm({ ...form, sacas_vendidas: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de venda</Label>
              <Select
                value={form.tipo_venda}
                onValueChange={(v: "FISICA" | "CPR" | "TERMO") =>
                  setForm({ ...form, tipo_venda: v })
                }
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FISICA">Física</SelectItem>
                  <SelectItem value="CPR">CPR</SelectItem>
                  <SelectItem value="TERMO">Termo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Data da venda</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_venda}
                onChange={(e) => setForm({ ...form, data_venda: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Vl bruto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base"
                value={form.vl_bruto}
                onChange={(e) => setForm({ ...form, vl_bruto: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Vl líquido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base"
                value={form.vl_liquido}
                onChange={(e) => setForm({ ...form, vl_liquido: e.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Soma dos lotes</Label>
              <Input
                className="h-12 text-base"
                value={form.lotes_agrupados}
                onChange={(e) => setForm({ ...form, lotes_agrupados: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Recebimento" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Valor recebido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base"
                value={form.valor_recebido}
                onChange={(e) => setForm({ ...form, valor_recebido: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data do recebimento</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_recebimento}
                onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Conta corrente</Label>
              <Input
                className="h-12 text-base"
                value={form.conta_corrente}
                onChange={(e) => setForm({ ...form, conta_corrente: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Rainforest" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Valor prêmio Rainforest (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="h-12 text-base"
                value={form.premio_rainforest}
                onChange={(e) => setForm({ ...form, premio_rainforest: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data do recebimento (prêmio)</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_recebimento_premio}
                onChange={(e) => setForm({ ...form, data_recebimento_premio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>NF prêmio</Label>
              <Input
                className="h-12 text-base"
                value={form.nf_premio_rainforest}
                onChange={(e) => setForm({ ...form, nf_premio_rainforest: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Observações" />
          <div className="grid gap-2">
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              if (window.confirm(`Excluir a venda para "${venda.cliente}"?`)) {
                delMut.mutate();
              }
            }}
            disabled={delMut.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Excluir
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
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
      let rows = await mockDb.getVendas(fazendaId);

      if (inicio) rows = rows.filter((r) => (r.data_venda || "") >= inicio);
      if (fim) rows = rows.filter((r) => (r.data_venda || "") <= fim);
      if (rows.length === 0) {
        toast.info("Nenhuma venda encontrada no período");
        setGerando(false);
        return;
      }

      const mapped = rows.map((v) => {
        const liq = v.vl_liquido ?? v.a_receber_previsto ?? null;
        const saldo = liq != null ? Number(liq) - Number(v.valor_recebido ?? 0) : null;
        return {
          Cliente: v.cliente ?? "",
          "Nº lote coop.": v.numero_lote_cooperativa ?? "",
          Padrão: v.padrao ?? "",
          Peneira: v.peneira ?? "",
          "Quebra (%)": v.quebra ?? null,
          Cooperado: v.cooperado ?? "",
          "Data envio armazém": v.data_envio_armazem ?? "",
          "Sacas do lote": v.sacas_do_lote ?? null,
          "Nº remessa cooperativa": v.nr_remessa_cooperativa ?? "",
          Amostra: v.amostra ?? "",
          "NF venda": v.nf_venda ?? "",
          "Sacas vendidas": v.sacas_vendidas ?? 0,
          "Tipo de venda": v.tipo_venda ?? "",
          "Data venda": v.data_venda ?? "",
          "Vl bruto (R$)": v.vl_bruto ?? null,
          "Vl líquido (R$)": liq,
          "A receber previsto (R$)": v.a_receber_previsto ?? null,
          "Soma dos lotes": v.lotes_agrupados ?? "",
          "Descontos (R$)": v.descontos ?? null,
          Observações: v.observacoes ?? "",
          "Valor recebido (R$)": v.valor_recebido ?? null,
          "Data recebimento": v.data_recebimento ?? "",
          "Conta corrente": v.conta_corrente ?? "",
          "IS + DS (R$)": v.is_ds ?? null,
          "Valor prêmio Rainforest (R$)": v.premio_rainforest ?? null,
          "Prêmio des. FUNRURAL 1,5% (R$)": v.premio_liquido_funrural ?? null,
          "Data recebimento prêmio": v.data_recebimento_premio ?? "",
          "NF prêmio": v.nf_premio_rainforest ?? "",
          Anúncio: v.anuncio_venda ?? "",
          "Saldo aberto (R$)": saldo,
        };
      });

      const ws = XLSX.utils.json_to_sheet(mapped);
      const cols = Object.keys(mapped[0]).map((k) => ({
        wch: Math.min(
          40,
          Math.max(k.length + 2, ...mapped.map((r) => String((r as any)[k] ?? "").length + 2)),
        ),
      }));
      (ws as any)["!cols"] = cols;

      const totalSacas = rows.reduce((s, v) => s + Number(v.sacas_vendidas ?? 0), 0);
      const totalBruto = rows.reduce((s, v) => s + Number(v.vl_bruto ?? 0), 0);
      const totalDescontos = rows.reduce((s, v) => s + Number(v.descontos ?? 0), 0);
      const totalLiquido = rows.reduce(
        (s, v) => s + Number(v.vl_liquido ?? v.a_receber_previsto ?? 0),
        0,
      );
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
            Selecione o período desejado. O arquivo Excel será baixado com todas as vendas do
            intervalo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="rel-inicio">Data inicial</Label>
            <Input
              id="rel-inicio"
              type="date"
              className="h-12 text-base"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rel-fim">Data final</Label>
            <Input
              id="rel-fim"
              type="date"
              className="h-12 text-base"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: deixe as datas em branco para exportar todo o histórico.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="lg" onClick={gerar} disabled={gerando || !fazendaId}>
            <FileSpreadsheet className="h-5 w-5" />
            {gerando ? "Gerando..." : "Gerar Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
