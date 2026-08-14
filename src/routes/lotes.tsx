import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Plus,
  Coffee,
  ArrowRight,
  Droplets,
  Calendar,
  AlertTriangle,
  Search,
  Trash2,
  Table2,
  LayoutGrid,
  LayoutList,
  Lock,
  Sprout,
  Sun,
  Flame,
  Warehouse,
  Building2,
  Filter,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { STATUS_ORDER, STATUS_LABEL, dt, num, type LoteStatus } from "@/lib/format";
import type { Lote, Talhao } from "@/lib/db-types";
import { EditableGrid, type GridColumn, type GridGroup } from "@/components/editable-grid";

export const Route = createFileRoute("/lotes")({
  head: () => ({ meta: [{ title: "Lotes — Gestão Pedra Negra" }] }),
  component: LotesPage,
});

const schema = z.object({
  numero_lote_fazenda: z.string().trim().min(1).max(50),
  lote_colheita: z.string().trim().max(50).optional().or(z.literal("")),
  tipo_cafe: z.string().trim().max(60).optional().or(z.literal("")),
  colheita_tipo: z.enum(["MANUAL", "MECANICA"]).optional(),
  data_colheita_inicio: z.string().optional().or(z.literal("")),
  numero_sacas: z.string().optional().or(z.literal("")),
  observacoes: z.string().max(1000).optional().or(z.literal("")),
});

export function calculateLoteStatus(form: {
  data_entrada_terreiro?: string | null;
  data_saida_terreiro?: string | null;
  data_entrada_secador?: string | null;
  data_saida_secador?: string | null;
  umidade?: string | number | null;
  numero_tulha?: string | null;
  data_beneficio?: string | null;
  data_envio_cooperativa?: string | null;
  numero_lote_cooperativa?: string | null;
  nf_remessa_cooperativa?: string | null;
}): LoteStatus {
  if (form.data_envio_cooperativa || form.numero_lote_cooperativa || form.nf_remessa_cooperativa) {
    return "ENVIADO_COOPERATIVA";
  }
  if (form.data_beneficio) {
    return "BENEFICIADO";
  }
  if (form.numero_tulha) {
    return "NA_TULHA";
  }
  if (
    form.data_entrada_secador ||
    form.data_saida_secador ||
    (form.umidade !== "" && form.umidade !== null)
  ) {
    return "NO_SECADOR";
  }
  if (form.data_entrada_terreiro || form.data_saida_terreiro) {
    return "NO_TERREIRO";
  }
  return "EM_COLHEITA";
}

export function hasPendingData(lote: Lote): boolean {
  const isTerreiroPending = lote.status === "NO_TERREIRO" && !lote.data_entrada_terreiro;
  const isSecadorPending =
    lote.status === "NO_SECADOR" && (!lote.data_entrada_secador || lote.umidade == null);
  const isTulhaPending = lote.status === "NA_TULHA" && !lote.numero_tulha;
  const isBeneficiadoPending = lote.status === "BENEFICIADO" && !lote.data_beneficio;
  return isTerreiroPending || isSecadorPending || isTulhaPending || isBeneficiadoPending;
}

const STATUS_ICONS: Record<LoteStatus, React.ComponentType<{ className?: string }>> = {
  EM_COLHEITA: Sprout,
  NO_TERREIRO: Sun,
  NO_SECADOR: Flame,
  NA_TULHA: Warehouse,
  BENEFICIADO: Coffee,
  ENVIADO_COOPERATIVA: Building2,
};



function LotesPage() {
  const { fazendaAtual, fazendas } = useFazendas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [buscaDraft, setBuscaDraft] = useState("");
  const [safraDraft, setSafraDraft] = useState<string>("TODAS");

  const [buscaApplied, setBuscaApplied] = useState("");
  const [safraApplied, setSafraApplied] = useState<string>("TODAS");
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const handleApplyFilters = () => {
    setBuscaApplied(buscaDraft);
    setSafraApplied(safraDraft);
    toast.success("Filtros aplicados");
  };

  const handleClearFilters = () => {
    setBuscaDraft("");
    setSafraDraft("TODAS");
    setBuscaApplied("");
    setSafraApplied("TODAS");
    toast.info("Filtros limpos");
  };

  const lotesQ = useQuery({
    queryKey: ["lotes", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Lote[]> => {
      return await mockDb.getLotes(fazendaAtual!.id);
    },
  });

  const moveMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LoteStatus }) => {
      await mockDb.updateLote(id, { status });
    },
    onSuccess: () => {
      toast.success("Lote atualizado");
      qc.invalidateQueries({ queryKey: ["lotes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: LoteStatus) => {
    e.preventDefault();
    const loteId = e.dataTransfer.getData("text/plain");
    if (!loteId) return;

    const lote = lotesQ.data?.find((l) => l.id === loteId);
    if (!lote) return;
    if (lote.status === newStatus) return;

    const currentIndex = STATUS_ORDER.indexOf(lote.status);
    const newIndex = STATUS_ORDER.indexOf(newStatus);

    if (newIndex > currentIndex) {
      if (newIndex > currentIndex + 1) {
        toast.error(
          "O lote só pode ser avançado para a etapa imediatamente seguinte (uma de cada vez).",
        );
        return;
      }
      if (hasPendingData(lote)) {
        toast.error(
          "Este lote possui informações pendentes na etapa atual (em vermelho). Clique no lote e preencha as informações antes de avançar.",
        );
        return;
      }
    }

    if (newIndex < currentIndex) {
      if (
        !window.confirm(
          "Você está voltando este lote para uma etapa anterior. Dados das etapas seguintes poderão ser considerados inválidos ou perder o sentido. Confirma o retorno?",
        )
      ) {
        return;
      }
    }

    moveMut.mutate({ id: lote.id, status: newStatus });
  };

  if (fazendas.length === 0) {
    return (
      <>
        <PageHeader title="Lotes" />
        <div className="p-8">
          <EmptyState icon={Coffee} title="Cadastre uma fazenda primeiro" />
        </div>
      </>
    );
  }

  const lotes = lotesQ.data ?? [];

  const safrasDisponiveis = useMemo(
    () => Array.from(new Set(lotes.map((l) => l.safra))).sort((a, b) => (b ?? 0) - (a ?? 0)),
    [lotes],
  );

  const lotesFiltrados = useMemo(() => {
    const termo = buscaApplied.trim().toLowerCase();
    return lotes.filter((l) => {
      if (safraApplied !== "TODAS" && String(l.safra) !== safraApplied) return false;
      if (!termo) return true;
      const campos = [
        l.numero_lote_fazenda,
        l.lote_colheita,
        l.tipo_cafe,
        l.numero_lote_cooperativa,
        l.numero_tulha,
      ];
      return campos.some((c) => (c ?? "").toLowerCase().includes(termo));
    });
  }, [lotes, buscaApplied, safraApplied]);

  return (
    <>
      <PageHeader
        title={`Lotes — ${fazendaAtual?.nome ?? ""}`}
        description="Lance os dados como numa planilha — clique na célula, digite, Tab para a próxima."
        actions={
          <div className="flex items-center gap-2">
            <NovoLoteDialog open={open} onOpenChange={setOpen} fazendaId={fazendaAtual!.id} />
          </div>
        }
      />
      <div className="p-4 sm:p-8">
        {lotes.length === 0 ? (
          <EmptyState
            icon={Coffee}
            title="Nenhum lote registrado"
            description="Registre o primeiro lote de colheita para iniciar o acompanhamento."
            action={
              <Button size="lg" onClick={() => setOpen(true)}>
                <Plus className="h-5 w-5" /> Novo lote
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por lote, tipo, tulha..."
                  value={buscaDraft}
                  onChange={(e) => setBuscaDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleApplyFilters();
                  }}
                  className="h-11 pl-9"
                />
              </div>
              <Select value={safraDraft} onValueChange={setSafraDraft}>
                <SelectTrigger className="h-11 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as safras</SelectItem>
                  {safrasDisponiveis.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      Safra {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleApplyFilters} className="h-11 gap-2">
                <Filter className="h-4 w-4" /> Aplicar filtros
              </Button>
              <Button variant="outline" onClick={handleClearFilters} className="h-11 gap-2">
                <RotateCcw className="h-4 w-4" /> Limpar filtros
              </Button>
              <div className="ml-auto flex items-center gap-1 rounded-lg border bg-card p-1">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 gap-1.5"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="h-4 w-4" /> Kanban
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3 gap-1.5"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-4 w-4" /> Lista
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {lotesFiltrados.length} de {lotes.length} lote(s)
              </span>
            </div>
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {STATUS_ORDER.map((status) => {
                  const itens = lotesFiltrados.filter((l) => l.status === status);
                  const Icon = STATUS_ICONS[status];
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
                          <span>{STATUS_LABEL[status]}</span>
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
                        {itens.map((l) => (
                          <LoteCard
                            key={l.id}
                            lote={l}
                            onAdvance={() => {
                              if (hasPendingData(l)) {
                                toast.error(
                                  "Este lote possui informações pendentes na etapa atual (em vermelho). Clique no lote e preencha as informações antes de avançar.",
                                );
                                return;
                              }
                              const idx = STATUS_ORDER.indexOf(l.status);
                              const next = STATUS_ORDER[idx + 1];
                              if (next) moveMut.mutate({ id: l.id, status: next });
                            }}
                            onEdit={() => setEditLote(l)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {viewMode === 'list' && (
              <LoteListView
                lotes={lotesFiltrados}
                onEdit={(l) => setEditLote(l)}
              />
            )}
          </>
        )}
      </div>
      {editLote && <EditarLoteDialog lote={editLote} onClose={() => setEditLote(null)} />}
    </>
  );
}

function LoteCard({
  lote,
  onAdvance,
  onEdit,
}: {
  lote: Lote;
  onAdvance: () => void;
  onEdit: () => void;
}) {
  const hasPending = hasPendingData(lote);

  const umidadeForaIdeal =
    lote.umidade != null && (Number(lote.umidade) < 10.5 || Number(lote.umidade) > 12);
  const isLast = lote.status === "ENVIADO_COOPERATIVA";

  return (
    <div
      className={`rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing ${hasPending ? "border-destructive/50 ring-1 ring-destructive/20" : ""}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", lote.id)}
    >
      <button onClick={onEdit} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
          <span className="font-semibold text-foreground">Lote #{lote.numero_lote_fazenda}</span>
          <div className="flex items-center gap-1">
            {hasPending && (
              <span title="Faltam informações para esta etapa">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {lote.status === "EM_COLHEITA" && (
            <>
              <div className="flex justify-between">
                <span>Safra:</span>
                <span>{lote.safra || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Nº Lote:</span>
                <span>{lote.numero_lote_fazenda}</span>
              </div>
              <div className="flex justify-between">
                <span>Lote colheita:</span>
                <span>{lote.lote_colheita || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo de café:</span>
                <span>{lote.tipo_cafe || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Colheita:</span>
                <span>{lote.colheita_tipo || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Data Início:</span>
                <span className={!lote.data_colheita_inicio ? "text-destructive font-medium" : ""}>
                  {lote.data_colheita_inicio ? dt(lote.data_colheita_inicio) : "Pendente"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data Fim:</span>
                <span>{lote.data_colheita_fim ? dt(lote.data_colheita_fim) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Nº Sacas:</span>
                <span>{lote.numero_sacas ? `${num(lote.numero_sacas, 1)} sc` : "-"}</span>
              </div>
            </>
          )}

          {lote.status === "NO_TERREIRO" && (
            <>
              <div className="flex justify-between">
                <span>Data Entrada:</span>
                <span className={!lote.data_entrada_terreiro ? "text-destructive font-medium" : ""}>
                  {lote.data_entrada_terreiro ? dt(lote.data_entrada_terreiro) : "Pendente"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data Saída:</span>
                <span>{lote.data_saida_terreiro ? dt(lote.data_saida_terreiro) : "-"}</span>
              </div>
            </>
          )}

          {lote.status === "NO_SECADOR" && (
            <>
              <div className="flex justify-between">
                <span>Data Entrada:</span>
                <span className={!lote.data_entrada_secador ? "text-destructive font-medium" : ""}>
                  {lote.data_entrada_secador ? dt(lote.data_entrada_secador) : "Pendente"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Data Saída:</span>
                <span>{lote.data_saida_secador ? dt(lote.data_saida_secador) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Umidade:</span>
                <span className={!lote.umidade ? "text-destructive font-medium" : umidadeForaIdeal ? "text-warning-foreground font-medium" : ""}>
                  {lote.umidade ? `${num(lote.umidade, 1)}%` : "Pendente"}
                </span>
              </div>
            </>
          )}

          {lote.status === "NA_TULHA" && (
            <>
              <div className="flex justify-between">
                <span>Nº Tulha:</span>
                <span className={!lote.numero_tulha ? "text-destructive font-medium" : ""}>
                  {lote.numero_tulha || "Pendente"}
                </span>
              </div>
            </>
          )}

          {lote.status === "BENEFICIADO" && (
            <>
              <div className="flex justify-between">
                <span>Data Benefício:</span>
                <span className={!lote.data_beneficio ? "text-destructive font-medium" : ""}>
                  {lote.data_beneficio ? dt(lote.data_beneficio) : "Pendente"}
                </span>
              </div>
            </>
          )}

          {lote.status === "ENVIADO_COOPERATIVA" && (
            <>
              <div className="flex justify-between">
                <span>Data Envio Coop.:</span>
                <span>{lote.data_envio_cooperativa ? dt(lote.data_envio_cooperativa) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Nº Lote Coop.:</span>
                <span>{lote.numero_lote_cooperativa || "-"}</span>
              </div>
            </>
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

function LoteListView({
  lotes,
  onEdit,
}: {
  lotes: Lote[];
  onEdit: (lote: Lote) => void;
}) {
  if (lotes.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">Nenhum lote encontrado.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-secondary/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3">Lote colheita</th>
            <th className="px-4 py-3">Safra</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Etapa</th>
            <th className="px-4 py-3">Data colheita</th>
            <th className="px-4 py-3">Sacas</th>
            <th className="px-4 py-3">Umidade</th>
            <th className="px-4 py-3">Tulha</th>
            <th className="px-4 py-3">Lote coop.</th>
          </tr>
        </thead>
        <tbody>
          {lotes.map((lote, i) => {
            const hasPending = hasPendingData(lote);
            const Icon = STATUS_ICONS[lote.status];
            return (
              <tr
                key={lote.id}
                onClick={() => onEdit(lote)}
                className={`cursor-pointer border-b transition-colors last:border-0 hover:bg-secondary/30 ${
                  i % 2 === 0 ? '' : 'bg-secondary/10'
                } ${hasPending ? 'text-destructive' : ''}`}
              >
                <td className="px-4 py-3 font-semibold">
                  <span className="flex items-center gap-2">
                    {hasPending && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    #{lote.numero_lote_fazenda}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lote.lote_colheita || '-'}</td>
                <td className="px-4 py-3">{lote.safra || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{lote.tipo_cafe || '-'}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium w-fit">
                    <Icon className="h-3 w-3 shrink-0" />
                    {STATUS_LABEL[lote.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lote.data_colheita_inicio ? dt(lote.data_colheita_inicio) : '-'}
                </td>
                <td className="px-4 py-3">{lote.numero_sacas ? `${num(lote.numero_sacas, 1)} sc` : '-'}</td>
                <td className="px-4 py-3">
                  {lote.umidade != null ? `${num(lote.umidade, 1)}%` : '-'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lote.numero_tulha || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{lote.numero_lote_cooperativa || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NovoLoteDialog({
  open,
  onOpenChange,
  fazendaId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fazendaId: string;
}) {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    numero_lote_fazenda: "",
    lote_colheita: "",
    safra: String(currentYear),
    talhao_ids: [] as string[],
    tipo_cafe: "NATURAL",
    colheita_tipo: "MANUAL" as "MANUAL" | "MECANICA",
    data_colheita_inicio: "",
    numero_sacas: "",
    observacoes: "",
    data_colheita_fim: "",
    data_entrada_terreiro: "",
    data_saida_terreiro: "",
    data_entrada_secador: "",
    data_saida_secador: "",
    umidade: "",
    numero_tulha: "",
    data_beneficio: "",
    data_envio_cooperativa: "",
    numero_lote_cooperativa: "",
    nf_remessa_cooperativa: "",
  });

  const talhoesQ = useQuery({
    queryKey: ["talhoes", fazendaId],
    queryFn: async (): Promise<Talhao[]> => {
      return await mockDb.getTalhoes(fazendaId);
    },
  });
  const talhoes = talhoesQ.data ?? [];

  const isColheitaPreenchida = form.numero_lote_fazenda.trim().length > 0;

  const canFillTerreiro = isColheitaPreenchida;
  const isTerreiroPreenchido =
    canFillTerreiro && (!!form.data_entrada_terreiro || !!form.data_saida_terreiro);

  const canFillSecador = isTerreiroPreenchido;
  const isSecadorPreenchido =
    canFillSecador &&
    (!!form.data_entrada_secador ||
      !!form.data_saida_secador ||
      (form.umidade !== "" && form.umidade !== null));

  const canFillBeneficio = isSecadorPreenchido;
  const isBeneficioPreenchido = canFillBeneficio && (!!form.numero_tulha || !!form.data_beneficio);

  const canFillCooperativa = isBeneficioPreenchido;

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const computedStatus = calculateLoteStatus(form);
      await mockDb.createLote({
        fazenda_id: fazendaId,
        numero_lote_fazenda: form.numero_lote_fazenda,
        lote_colheita: form.lote_colheita || null,
        safra: Number(form.safra),
        talhao_ids: form.talhao_ids,
        tipo_cafe: form.tipo_cafe,
        colheita_tipo: form.colheita_tipo,
        status: computedStatus,
        data_colheita_inicio: form.data_colheita_inicio || null,
        data_colheita_fim: form.data_colheita_fim || null,
        numero_sacas: form.numero_sacas ? Number(form.numero_sacas) : null,
        observacoes: form.observacoes || null,
        data_entrada_terreiro: form.data_entrada_terreiro || null,
        data_saida_terreiro: form.data_saida_terreiro || null,
        data_entrada_secador: form.data_entrada_secador || null,
        data_saida_secador: form.data_saida_secador || null,
        umidade: form.umidade ? Number(form.umidade) : null,
        numero_tulha: form.numero_tulha || null,
        data_beneficio: form.data_beneficio || null,
        data_envio_cooperativa: form.data_envio_cooperativa || null,
        numero_lote_cooperativa: form.numero_lote_cooperativa || null,
        nf_remessa_cooperativa: form.nf_remessa_cooperativa || null,
      });
    },
    onSuccess: () => {
      toast.success("Lote registrado");
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onOpenChange(false);
      setForm({
        numero_lote_fazenda: "",
        lote_colheita: "",
        safra: String(new Date().getFullYear()),
        talhao_ids: [],
        tipo_cafe: "NATURAL",
        colheita_tipo: "MANUAL",
        data_colheita_inicio: "",
        numero_sacas: "",
        observacoes: "",
        data_colheita_fim: "",
        data_entrada_terreiro: "",
        data_saida_terreiro: "",
        data_entrada_secador: "",
        data_saida_secador: "",
        umidade: "",
        numero_tulha: "",
        data_beneficio: "",
        data_envio_cooperativa: "",
        numero_lote_cooperativa: "",
        nf_remessa_cooperativa: "",
      });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-5 w-5" /> Novo lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar novo lote</DialogTitle>
          <DialogDescription>
            Preencha os campos em sequência. As etapas seguintes são liberadas conforme você
            preenche a etapa atual.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
          <SectionHeader label="Colheita" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Safra *</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                className="h-12 text-base"
                value={form.safra}
                onChange={(e) => setForm({ ...form, safra: e.target.value })}
                placeholder={String(new Date().getFullYear())}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº do lote (lotão) *</Label>
              <Input
                className="h-12 text-base"
                value={form.numero_lote_fazenda}
                onChange={(e) => setForm({ ...form, numero_lote_fazenda: e.target.value })}
                placeholder="Ex.: 12"
              />
            </div>
            <div className="grid gap-2">
              <Label>Lote colheita (lotinho)</Label>
              <Input
                className="h-12 text-base"
                value={form.lote_colheita}
                onChange={(e) => setForm({ ...form, lote_colheita: e.target.value })}
                placeholder="Ex.: 12-A"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tipo de café</Label>
              <Select
                value={form.tipo_cafe}
                onValueChange={(v) => setForm({ ...form, tipo_cafe: v })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATURAL">Natural</SelectItem>
                  <SelectItem value="VARREÇÃO">Varreção</SelectItem>
                  <SelectItem value="CEREJA DESCASCADO">Cereja descascado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Colheita</Label>
              <Select
                value={form.colheita_tipo}
                onValueChange={(v: "MANUAL" | "MECANICA") => setForm({ ...form, colheita_tipo: v })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="MECANICA">Mecânica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Data início</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_colheita_inicio}
                onChange={(e) => setForm({ ...form, data_colheita_inicio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data fim</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_colheita_fim}
                onChange={(e) => setForm({ ...form, data_colheita_fim: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº de sacas (60kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="h-12 text-base"
                value={form.numero_sacas}
                onChange={(e) => setForm({ ...form, numero_sacas: e.target.value })}
                placeholder="Pode preencher depois"
              />
            </div>
          </div>
          {talhoes.length > 0 && (
            <div className="grid gap-2">
              <Label>Talhão(ões) de origem</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 justify-start text-base font-normal">
                    {form.talhao_ids.length === 0
                      ? "Selecionar talhão (pode ser mais de um)"
                      : talhoes
                          .filter((t) => form.talhao_ids.includes(t.id))
                          .map((t) => t.nome)
                          .join(", ")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {talhoes.map((t) => {
                      const checked = form.talhao_ids.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...form.talhao_ids, t.id]
                                : form.talhao_ids.filter((id) => id !== t.id);
                              setForm({ ...form, talhao_ids: next });
                            }}
                          />
                          <span className="text-sm">
                            {t.nome}
                            {t.variedade ? ` — ${t.variedade}` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <SectionHeader label="Terreiro" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Data entrada</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_entrada_terreiro}
                onChange={(e) => setForm({ ...form, data_entrada_terreiro: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data saída</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_saida_terreiro}
                onChange={(e) => setForm({ ...form, data_saida_terreiro: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Secador" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Data entrada</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_entrada_secador}
                onChange={(e) => setForm({ ...form, data_entrada_secador: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data saída</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_saida_secador}
                onChange={(e) => setForm({ ...form, data_saida_secador: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Umidade (%)</Label>
              <Input
                type="number"
                step="0.1"
                className="h-12 text-base"
                value={form.umidade}
                onChange={(e) => setForm({ ...form, umidade: e.target.value })}
                placeholder="Ideal 10,5 – 12"
              />
            </div>
          </div>

          <SectionHeader label="Benefício" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nº Tulha</Label>
              <Input
                className="h-12 text-base"
                value={form.numero_tulha}
                onChange={(e) => setForm({ ...form, numero_tulha: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data benefício</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_beneficio}
                onChange={(e) => setForm({ ...form, data_beneficio: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Depósito Cooperativa" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>
                Data envio cooperativa
              </Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_envio_cooperativa}
                onChange={(e) => setForm({ ...form, data_envio_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº Lote Cooperativa</Label>
              <Input
                className="h-12 text-base"
                value={form.numero_lote_cooperativa}
                onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                NF Remessa Cooperativa
              </Label>
              <Input
                className="h-12 text-base"
                value={form.nf_remessa_cooperativa}
                onChange={(e) => setForm({ ...form, nf_remessa_cooperativa: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Observações" />
          <div className="grid gap-2">
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar lote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function EditarLoteDialog({ lote, onClose }: { lote: Lote; onClose: () => void }) {
  const qc = useQueryClient();
  
  const talhoesQ = useQuery({
    queryKey: ["talhoes", lote.fazenda_id],
    queryFn: async (): Promise<Talhao[]> => {
      return await mockDb.getTalhoes(lote.fazenda_id);
    },
  });
  const talhoes = talhoesQ.data ?? [];

  const [form, setForm] = useState({
    status: lote.status as LoteStatus,
    safra: lote.safra?.toString() ?? new Date().getFullYear().toString(),
    numero_lote_fazenda: lote.numero_lote_fazenda ?? "",
    lote_colheita: lote.lote_colheita ?? "",
    talhao_ids: lote.talhao_ids ?? [],
    tipo_cafe: lote.tipo_cafe ?? "NATURAL",
    colheita_tipo: lote.colheita_tipo ?? "MANUAL",
    data_colheita_inicio: lote.data_colheita_inicio ?? "",
    data_colheita_fim: lote.data_colheita_fim ?? "",
    data_entrada_terreiro: lote.data_entrada_terreiro ?? "",
    data_saida_terreiro: lote.data_saida_terreiro ?? "",
    data_entrada_secador: lote.data_entrada_secador ?? "",
    data_saida_secador: lote.data_saida_secador ?? "",
    umidade: lote.umidade?.toString() ?? "",
    numero_tulha: lote.numero_tulha ?? "",
    data_beneficio: lote.data_beneficio ?? "",
    data_envio_cooperativa: lote.data_envio_cooperativa ?? "",
    numero_sacas: lote.numero_sacas?.toString() ?? "",
    numero_lote_cooperativa: lote.numero_lote_cooperativa ?? "",
    nf_remessa_cooperativa: lote.nf_remessa_cooperativa ?? "",
    observacoes: lote.observacoes ?? "",
  });

  const mut = useMutation({
    mutationFn: async () => {
      const calculatedStatus = calculateLoteStatus(form);
      const parsed = schema.parse(form);
      await mockDb.updateLote(lote.id, {
        status: calculatedStatus,
        safra: Number(form.safra),
        numero_lote_fazenda: form.numero_lote_fazenda,
        lote_colheita: form.lote_colheita || null,
        talhao_ids: form.talhao_ids,
        tipo_cafe: form.tipo_cafe,
        colheita_tipo: form.colheita_tipo,
        data_colheita_inicio: form.data_colheita_inicio || null,
        data_colheita_fim: form.data_colheita_fim || null,
        data_entrada_terreiro: canFillTerreiro ? form.data_entrada_terreiro || null : null,
        data_saida_terreiro: canFillTerreiro ? form.data_saida_terreiro || null : null,
        data_entrada_secador: canFillSecador ? form.data_entrada_secador || null : null,
        data_saida_secador: canFillSecador ? form.data_saida_secador || null : null,
        umidade: canFillSecador && form.umidade ? Number(form.umidade) : null,
        numero_tulha: canFillBeneficio ? form.numero_tulha || null : null,
        data_beneficio: canFillBeneficio ? form.data_beneficio || null : null,
        data_envio_cooperativa: canFillCooperativa ? form.data_envio_cooperativa || null : null,
        numero_sacas: form.numero_sacas ? Number(form.numero_sacas) : null,
        numero_lote_cooperativa: canFillCooperativa ? form.numero_lote_cooperativa || null : null,
        nf_remessa_cooperativa: canFillCooperativa ? form.nf_remessa_cooperativa || null : null,
        observacoes: form.observacoes || null,
      });
    },
    onSuccess: () => {
      toast.success("Lote atualizado");
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      await mockDb.deleteLote(lote.id);
    },
    onSuccess: () => {
      toast.success("Lote excluído");
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const isColheitaPreenchida = form.numero_lote_fazenda.trim().length > 0;
  const canFillTerreiro = isColheitaPreenchida;
  const isTerreiroPreenchido =
    canFillTerreiro && (!!form.data_entrada_terreiro || !!form.data_saida_terreiro);
  const canFillSecador = isTerreiroPreenchido;
  const isSecadorPreenchido =
    canFillSecador &&
    (!!form.data_entrada_secador ||
      !!form.data_saida_secador ||
      (form.umidade !== "" && form.umidade !== null));
  const canFillBeneficio = isSecadorPreenchido;
  const isBeneficioPreenchido = canFillBeneficio && (!!form.numero_tulha || !!form.data_beneficio);
  const canFillCooperativa = isBeneficioPreenchido;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lote #{lote.numero_lote_fazenda}</DialogTitle>
          <DialogDescription>
            Atualize os dados e a etapa será recalculada automaticamente. As etapas seguintes são liberadas conforme você preenche a etapa atual.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          
          <SectionHeader label="Colheita" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Safra *</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                className="h-12 text-base"
                value={form.safra}
                onChange={(e) => setForm({ ...form, safra: e.target.value })}
                placeholder={String(new Date().getFullYear())}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº do lote (lotão) *</Label>
              <Input
                className="h-12 text-base"
                value={form.numero_lote_fazenda}
                onChange={(e) => setForm({ ...form, numero_lote_fazenda: e.target.value })}
                placeholder="Ex.: 12"
              />
            </div>
            <div className="grid gap-2">
              <Label>Lote colheita (lotinho)</Label>
              <Input
                className="h-12 text-base"
                value={form.lote_colheita}
                onChange={(e) => setForm({ ...form, lote_colheita: e.target.value })}
                placeholder="Ex.: 12-A"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tipo de café</Label>
              <Select
                value={form.tipo_cafe}
                onValueChange={(v) => setForm({ ...form, tipo_cafe: v })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATURAL">Natural</SelectItem>
                  <SelectItem value="VARREÇÃO">Varreção</SelectItem>
                  <SelectItem value="CEREJA DESCASCADO">Cereja descascado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Colheita</Label>
              <Select
                value={form.colheita_tipo}
                onValueChange={(v: "MANUAL" | "MECANICA") => setForm({ ...form, colheita_tipo: v })}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="MECANICA">Mecânica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Data início</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_colheita_inicio}
                onChange={(e) => setForm({ ...form, data_colheita_inicio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data fim</Label>
              <Input
                type="date"
                className="h-12 text-base"
                value={form.data_colheita_fim}
                onChange={(e) => setForm({ ...form, data_colheita_fim: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nº de sacas (60kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="h-12 text-base"
                value={form.numero_sacas}
                onChange={(e) => setForm({ ...form, numero_sacas: e.target.value })}
                placeholder="Pode preencher depois"
              />
            </div>
          </div>
          {talhoes.length > 0 && (
            <div className="grid gap-2">
              <Label>Talhão(ões) de origem</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-12 justify-start text-base font-normal">
                    {form.talhao_ids.length === 0
                      ? "Selecionar talhão (pode ser mais de um)"
                      : talhoes
                          .filter((t) => form.talhao_ids.includes(t.id))
                          .map((t) => t.nome)
                          .join(", ")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {talhoes.map((t) => {
                      const checked = form.talhao_ids.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...form.talhao_ids, t.id]
                                : form.talhao_ids.filter((id) => id !== t.id);
                              setForm({ ...form, talhao_ids: next });
                            }}
                          />
                          <span className="text-sm">
                            {t.nome}
                            {t.variedade ? ` — ${t.variedade}` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <SectionHeader label="Terreiro" locked={!canFillTerreiro} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!canFillTerreiro ? "opacity-50" : ""}>Data entrada</Label>
              <Input
                type="date"
                disabled={!canFillTerreiro}
                className="h-12 text-base"
                value={form.data_entrada_terreiro}
                onChange={(e) => setForm({ ...form, data_entrada_terreiro: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillTerreiro ? "opacity-50" : ""}>Data saída</Label>
              <Input
                type="date"
                disabled={!canFillTerreiro}
                className="h-12 text-base"
                value={form.data_saida_terreiro}
                onChange={(e) => setForm({ ...form, data_saida_terreiro: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Secador" locked={!canFillSecador} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label className={!canFillSecador ? "opacity-50" : ""}>Data entrada</Label>
              <Input
                type="date"
                disabled={!canFillSecador}
                className="h-12 text-base"
                value={form.data_entrada_secador}
                onChange={(e) => setForm({ ...form, data_entrada_secador: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillSecador ? "opacity-50" : ""}>Data saída</Label>
              <Input
                type="date"
                disabled={!canFillSecador}
                className="h-12 text-base"
                value={form.data_saida_secador}
                onChange={(e) => setForm({ ...form, data_saida_secador: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillSecador ? "opacity-50" : ""}>Umidade (%)</Label>
              <Input
                type="number"
                step="0.1"
                disabled={!canFillSecador}
                className="h-12 text-base"
                value={form.umidade}
                onChange={(e) => setForm({ ...form, umidade: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Benefício" locked={!canFillBeneficio} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!canFillBeneficio ? "opacity-50" : ""}>Nº Tulha</Label>
              <Input
                disabled={!canFillBeneficio}
                className="h-12 text-base"
                value={form.numero_tulha}
                onChange={(e) => setForm({ ...form, numero_tulha: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillBeneficio ? "opacity-50" : ""}>Data benefício</Label>
              <Input
                type="date"
                disabled={!canFillBeneficio}
                className="h-12 text-base"
                value={form.data_beneficio}
                onChange={(e) => setForm({ ...form, data_beneficio: e.target.value })}
              />
            </div>
          </div>

          <SectionHeader label="Depósito Cooperativa" locked={!canFillCooperativa} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!canFillCooperativa ? "opacity-50" : ""}>Data envio cooperativa</Label>
              <Input
                type="date"
                disabled={!canFillCooperativa}
                className="h-12 text-base"
                value={form.data_envio_cooperativa}
                onChange={(e) => setForm({ ...form, data_envio_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label className={!canFillCooperativa ? "opacity-50" : ""}>Nº lote cooperativa</Label>
              <Input
                disabled={!canFillCooperativa}
                className="h-12 text-base"
                value={form.numero_lote_cooperativa}
                onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label className={!canFillCooperativa ? "opacity-50" : ""}>NF remessa cooperativa</Label>
              <Input
                disabled={!canFillCooperativa}
                className="h-12 text-base"
                value={form.nf_remessa_cooperativa}
                onChange={(e) => setForm({ ...form, nf_remessa_cooperativa: e.target.value })}
              />
            </div>
          </div>



          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              if (confirm(`Excluir lote #${lote.numero_lote_fazenda}?`)) delMut.mutate();
            }}
            disabled={delMut.isPending}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={onClose}>
              Fechar
            </Button>
            <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border bg-secondary/30 p-4">
      <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {legend}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="date"
        className="h-12 text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
