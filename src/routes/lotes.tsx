import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Coffee, ArrowRight, Droplets, Calendar, AlertTriangle, Search, Trash2, Table2, LayoutGrid } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
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

function LotesPage() {
  const { fazendaAtual, fazendas } = useFazendas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editLote, setEditLote] = useState<Lote | null>(null);
  const [busca, setBusca] = useState("");
  const [safraFiltro, setSafraFiltro] = useState<string>("TODAS");
  const [view, setView] = useState<"planilha" | "kanban">("planilha");

  const lotesQ = useQuery({
    queryKey: ["lotes", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Lote[]> => {
      const { data, error } = await supabase
        .from("lotes")
        .select("*")
        .eq("fazenda_id", fazendaAtual!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lote[];
    },
  });

  const moveMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LoteStatus }) => {
      const { error } = await supabase.from("lotes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lote avançado");
      qc.invalidateQueries({ queryKey: ["lotes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

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
    () => Array.from(new Set(lotes.map((l) => l.safra))).sort((a, b) => b - a),
    [lotes],
  );

  const lotesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lotes.filter((l) => {
      if (safraFiltro !== "TODAS" && String(l.safra) !== safraFiltro) return false;
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
  }, [lotes, busca, safraFiltro]);

  return (
    <>
      <PageHeader
        title={`Lotes — ${fazendaAtual?.nome ?? ""}`}
        description="Lance os dados como numa planilha — clique na célula, digite, Tab para a próxima."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border bg-card p-0.5">
              <button
                onClick={() => setView("planilha")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${view === "planilha" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Table2 className="h-4 w-4" /> Planilha
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" /> Kanban
              </button>
            </div>
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
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <Select value={safraFiltro} onValueChange={setSafraFiltro}>
              <SelectTrigger className="h-11 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as safras</SelectItem>
                {safrasDisponiveis.map((s) => (
                  <SelectItem key={s} value={String(s)}>Safra {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {lotesFiltrados.length} de {lotes.length} lote(s)
            </span>
          </div>
          {view === "planilha" ? (
            <LotesPlanilha rows={lotesFiltrados} fazendaId={fazendaAtual!.id} />
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {STATUS_ORDER.map((status) => {
              const itens = lotesFiltrados.filter((l) => l.status === status);
              return (
                <div key={status} className="flex flex-col rounded-xl border bg-secondary/40 p-3">
                  <header className="mb-3 flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {STATUS_LABEL[status]}
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
          </>
        )}
      </div>
      {editLote && (
        <EditarLoteDialog lote={editLote} onClose={() => setEditLote(null)} />
      )}
    </>
  );
}

function LoteCard({ lote, onAdvance, onEdit }: { lote: Lote; onAdvance: () => void; onEdit: () => void }) {
  const umidadeForaIdeal = lote.umidade != null && (Number(lote.umidade) < 10.5 || Number(lote.umidade) > 12);
  const isLast = lote.status === "ENVIADO_COOPERATIVA";
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <button onClick={onEdit} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground">#{lote.numero_lote_fazenda}</span>
          {lote.lote_colheita && (
            <span className="text-xs text-muted-foreground">{lote.lote_colheita}</span>
          )}
        </div>
        {lote.tipo_cafe && (
          <p className="mt-1 text-xs text-muted-foreground">{lote.tipo_cafe}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {lote.data_colheita_inicio && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {dt(lote.data_colheita_inicio)}
            </span>
          )}
          {lote.umidade != null && (
            <span className={`flex items-center gap-1 ${umidadeForaIdeal ? "text-warning-foreground font-medium" : ""}`}>
              <Droplets className="h-3 w-3" /> {num(lote.umidade, 1)}%
              {umidadeForaIdeal && <AlertTriangle className="h-3 w-3" />}
            </span>
          )}
          {lote.numero_sacas != null && (
            <span>{num(lote.numero_sacas, 1)} sc</span>
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
  const [form, setForm] = useState({
    numero_lote_fazenda: "",
    lote_colheita: "",
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
      const { data, error } = await supabase
        .from("talhoes")
        .select("*")
        .eq("fazenda_id", fazendaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Talhao[];
    },
  });
  const talhoes = talhoesQ.data ?? [];

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse(form);
      const { error } = await supabase.from("lotes").insert({
        fazenda_id: fazendaId,
        talhao_id: form.talhao_ids[0] ?? null,
        talhao_ids: form.talhao_ids,
        numero_lote_fazenda: parsed.numero_lote_fazenda,
        lote_colheita: parsed.lote_colheita || null,
        tipo_cafe: parsed.tipo_cafe || null,
        colheita_tipo: parsed.colheita_tipo ?? null,
        data_colheita_inicio: parsed.data_colheita_inicio || null,
        numero_sacas: parsed.numero_sacas ? Number(parsed.numero_sacas) : null,
        observacoes: parsed.observacoes || null,
        data_colheita_fim: form.data_colheita_fim || null,
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
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lote registrado");
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onOpenChange(false);
      setForm({ numero_lote_fazenda: "", lote_colheita: "", talhao_ids: [], tipo_cafe: "NATURAL", colheita_tipo: "MANUAL", data_colheita_inicio: "", numero_sacas: "", observacoes: "", data_colheita_fim: "", data_entrada_terreiro: "", data_saida_terreiro: "", data_entrada_secador: "", data_saida_secador: "", umidade: "", numero_tulha: "", data_beneficio: "", data_envio_cooperativa: "", numero_lote_cooperativa: "", nf_remessa_cooperativa: "" });
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
          <DialogDescription>Preencha o que já tem em mãos — os campos das etapas seguintes podem ficar em branco e ser completados depois.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-2 pr-1">
          <SectionHeader label="Colheita" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nº do lote (lotão) *</Label>
              <Input className="h-12 text-base" value={form.numero_lote_fazenda} onChange={(e) => setForm({ ...form, numero_lote_fazenda: e.target.value })} placeholder="Ex.: 12" />
            </div>
            <div className="grid gap-2">
              <Label>Lote colheita (lotinho)</Label>
              <Input className="h-12 text-base" value={form.lote_colheita} onChange={(e) => setForm({ ...form, lote_colheita: e.target.value })} placeholder="Ex.: 12-A" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tipo de café</Label>
              <Select value={form.tipo_cafe} onValueChange={(v) => setForm({ ...form, tipo_cafe: v })}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATURAL">Natural</SelectItem>
                  <SelectItem value="VARREÇÃO">Varreção</SelectItem>
                  <SelectItem value="CEREJA DESCASCADO">Cereja descascado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Colheita</Label>
              <Select value={form.colheita_tipo} onValueChange={(v: "MANUAL" | "MECANICA") => setForm({ ...form, colheita_tipo: v })}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
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
              <Input type="date" className="h-12 text-base" value={form.data_colheita_inicio} onChange={(e) => setForm({ ...form, data_colheita_inicio: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Data fim</Label>
              <Input type="date" className="h-12 text-base" value={form.data_colheita_fim} onChange={(e) => setForm({ ...form, data_colheita_fim: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Nº de sacas (60kg)</Label>
              <Input type="number" step="0.1" className="h-12 text-base" value={form.numero_sacas} onChange={(e) => setForm({ ...form, numero_sacas: e.target.value })} placeholder="Pode preencher depois" />
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
                        <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary">
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
                            {t.nome}{t.variedade ? ` — ${t.variedade}` : ""}
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
              <Input type="date" className="h-12 text-base" value={form.data_entrada_terreiro} onChange={(e) => setForm({ ...form, data_entrada_terreiro: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Data saída</Label>
              <Input type="date" className="h-12 text-base" value={form.data_saida_terreiro} onChange={(e) => setForm({ ...form, data_saida_terreiro: e.target.value })} />
            </div>
          </div>

          <SectionHeader label="Secador" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Data entrada</Label>
              <Input type="date" className="h-12 text-base" value={form.data_entrada_secador} onChange={(e) => setForm({ ...form, data_entrada_secador: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Data saída</Label>
              <Input type="date" className="h-12 text-base" value={form.data_saida_secador} onChange={(e) => setForm({ ...form, data_saida_secador: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Umidade (%)</Label>
              <Input type="number" step="0.1" className="h-12 text-base" value={form.umidade} onChange={(e) => setForm({ ...form, umidade: e.target.value })} placeholder="Ideal 10,5 – 12" />
            </div>
          </div>

          <SectionHeader label="Benefício" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nº Tulha</Label>
              <Input className="h-12 text-base" value={form.numero_tulha} onChange={(e) => setForm({ ...form, numero_tulha: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Data benefício</Label>
              <Input type="date" className="h-12 text-base" value={form.data_beneficio} onChange={(e) => setForm({ ...form, data_beneficio: e.target.value })} />
            </div>
          </div>

          <SectionHeader label="Depósito Cooperativa" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Data envio cooperativa</Label>
              <Input type="date" className="h-12 text-base" value={form.data_envio_cooperativa} onChange={(e) => setForm({ ...form, data_envio_cooperativa: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Nº Lote Cooperativa</Label>
              <Input className="h-12 text-base" value={form.numero_lote_cooperativa} onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>NF Remessa Cooperativa</Label>
              <Input className="h-12 text-base" value={form.nf_remessa_cooperativa} onChange={(e) => setForm({ ...form, nf_remessa_cooperativa: e.target.value })} />
            </div>
          </div>

          <SectionHeader label="Observações" />
          <div className="grid gap-2">
            <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar lote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mt-2 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
  );
}

function EditarLoteDialog({ lote, onClose }: { lote: Lote; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    status: lote.status as LoteStatus,
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
      const { error } = await supabase
        .from("lotes")
        .update({
          status: form.status,
          data_entrada_terreiro: form.data_entrada_terreiro || null,
          data_saida_terreiro: form.data_saida_terreiro || null,
          data_entrada_secador: form.data_entrada_secador || null,
          data_saida_secador: form.data_saida_secador || null,
          umidade: form.umidade ? Number(form.umidade) : null,
          numero_tulha: form.numero_tulha || null,
          data_beneficio: form.data_beneficio || null,
          data_envio_cooperativa: form.data_envio_cooperativa || null,
          numero_sacas: form.numero_sacas ? Number(form.numero_sacas) : null,
          numero_lote_cooperativa: form.numero_lote_cooperativa || null,
          nf_remessa_cooperativa: form.nf_remessa_cooperativa || null,
          observacoes: form.observacoes || null,
        })
        .eq("id", lote.id);
      if (error) throw error;
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
      const { error } = await supabase.from("lotes").delete().eq("id", lote.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lote excluído");
      qc.invalidateQueries({ queryKey: ["lotes"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lote #{lote.numero_lote_fazenda}</DialogTitle>
          <DialogDescription>Atualize as etapas conforme o café avança.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label>Etapa atual</Label>
            <Select value={form.status} onValueChange={(v: LoteStatus) => setForm({ ...form, status: v })}>
              <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Fieldset legend="Terreiro">
            <DateField label="Entrada" value={form.data_entrada_terreiro} onChange={(v) => setForm({ ...form, data_entrada_terreiro: v })} />
            <DateField label="Saída" value={form.data_saida_terreiro} onChange={(v) => setForm({ ...form, data_saida_terreiro: v })} />
          </Fieldset>

          <Fieldset legend="Secador">
            <DateField label="Entrada" value={form.data_entrada_secador} onChange={(v) => setForm({ ...form, data_entrada_secador: v })} />
            <DateField label="Saída" value={form.data_saida_secador} onChange={(v) => setForm({ ...form, data_saida_secador: v })} />
            <div className="grid gap-2">
              <Label>Umidade (%)</Label>
              <Input type="number" step="0.1" className="h-12 text-base" value={form.umidade} onChange={(e) => setForm({ ...form, umidade: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Tulha</Label>
              <Input className="h-12 text-base" value={form.numero_tulha} onChange={(e) => setForm({ ...form, numero_tulha: e.target.value })} />
            </div>
          </Fieldset>

          <Fieldset legend="Benefício & Cooperativa">
            <DateField label="Data de benefício" value={form.data_beneficio} onChange={(v) => setForm({ ...form, data_beneficio: v })} />
            <DateField label="Envio à cooperativa" value={form.data_envio_cooperativa} onChange={(v) => setForm({ ...form, data_envio_cooperativa: v })} />
            <div className="grid gap-2">
              <Label>Nº sacas do lote</Label>
              <Input type="number" step="0.1" className="h-12 text-base" value={form.numero_sacas} onChange={(e) => setForm({ ...form, numero_sacas: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Nº lote cooperativa</Label>
              <Input className="h-12 text-base" value={form.numero_lote_cooperativa} onChange={(e) => setForm({ ...form, numero_lote_cooperativa: e.target.value })} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>NF remessa cooperativa</Label>
              <Input className="h-12 text-base" value={form.nf_remessa_cooperativa} onChange={(e) => setForm({ ...form, nf_remessa_cooperativa: e.target.value })} />
            </div>
          </Fieldset>

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => { if (confirm(`Excluir lote #${lote.numero_lote_fazenda}?`)) delMut.mutate(); }}
            disabled={delMut.isPending}
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={onClose}>Fechar</Button>
            <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending}>Salvar</Button>
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

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type="date" className="h-12 text-base" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LotesPlanilha({ rows, fazendaId }: { rows: Lote[]; fazendaId: string }) {
  const qc = useQueryClient();

  const talhoesQ = useQuery({
    queryKey: ["talhoes", fazendaId],
    queryFn: async (): Promise<Talhao[]> => {
      const { data, error } = await supabase
        .from("talhoes")
        .select("*")
        .eq("fazenda_id", fazendaId)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Talhao[];
    },
  });
  const talhoes = talhoesQ.data ?? [];

  const tipoCafeOptions = [
    { value: "NATURAL", label: "Natural" },
    { value: "VARREÇÃO", label: "Varreção" },
    { value: "CEREJA DESCASCADO", label: "Cereja descascado" },
  ];
  const colheitaOptions = [
    { value: "MANUAL", label: "Manual" },
    { value: "MECANICA", label: "Mecânica" },
  ];
  const statusOptions = STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const talhaoOptions = talhoes.map((t) => ({ value: t.id, label: t.nome }));

  function deriveStatus(l: Partial<Lote>): LoteStatus {
    if (l.data_envio_cooperativa) return "ENVIADO_COOPERATIVA";
    if (l.data_beneficio) return "BENEFICIADO";
    if (l.numero_tulha || l.data_saida_secador) return "NA_TULHA";
    if (l.data_entrada_secador) return "NO_SECADOR";
    if (l.data_entrada_terreiro) return "NO_TERREIRO";
    return "EM_COLHEITA";
  }

  const columns: GridColumn<Lote>[] = [
    // COLHEITA (6) — ordem da planilha original
    { key: "numero_lote_fazenda", label: "Nº Lote Fazenda (lotão)", type: "text", required: true, width: 140, accessor: (r) => r.numero_lote_fazenda, placeholder: "Nº" },
    { key: "talhao_ids", label: "Talhão(ões)", type: "multiselect", options: talhaoOptions, width: 200, accessor: (r) => r.talhao_ids ?? [] },
    { key: "lote_colheita", label: "Compõe lote colheita (lotinho)", type: "text", width: 180, accessor: (r) => r.lote_colheita ?? "" },
    { key: "data_colheita_inicio", label: "Data início", type: "date", width: 150, accessor: (r) => r.data_colheita_inicio ?? "" },
    { key: "data_colheita_fim", label: "Data fim", type: "date", width: 150, accessor: (r) => r.data_colheita_fim ?? "" },
    { key: "colheita_tipo", label: "Man/Mec", type: "select", options: colheitaOptions, width: 110, accessor: (r) => r.colheita_tipo ?? "" },
    { key: "tipo_cafe", label: "Tipo de café", type: "select", options: tipoCafeOptions, width: 180, accessor: (r) => r.tipo_cafe ?? "" },

    // TERREIRO (2)
    { key: "data_entrada_terreiro", label: "Data entrada", type: "date", width: 150, accessor: (r) => r.data_entrada_terreiro ?? "" },
    { key: "data_saida_terreiro", label: "Data saída", type: "date", width: 150, accessor: (r) => r.data_saida_terreiro ?? "" },

    // SECADOR (3)
    { key: "data_entrada_secador", label: "Data entrada", type: "date", width: 150, accessor: (r) => r.data_entrada_secador ?? "" },
    { key: "data_saida_secador", label: "Data saída", type: "date", width: 150, accessor: (r) => r.data_saida_secador ?? "" },
    {
      key: "umidade",
      label: "Umidade %",
      type: "number",
      width: 110,
      accessor: (r) => r.umidade,
      warn: (r) => r.umidade != null && (Number(r.umidade) < 10.5 || Number(r.umidade) > 12),
    },

    // BENEFÍCIO (2)
    { key: "numero_tulha", label: "Nº tulha", type: "text", width: 100, accessor: (r) => r.numero_tulha ?? "" },
    { key: "data_beneficio", label: "Data benefício", type: "date", width: 150, accessor: (r) => r.data_beneficio ?? "" },

    // DEPÓSITO / COOPERATIVA (4)
    { key: "data_envio_cooperativa", label: "Data envio cooperativa", type: "date", width: 170, accessor: (r) => r.data_envio_cooperativa ?? "" },
    { key: "numero_sacas", label: "Nº sacas do lote", type: "number", width: 140, accessor: (r) => r.numero_sacas },
    { key: "numero_lote_cooperativa", label: "Nº lote cooperativa", type: "text", width: 160, accessor: (r) => r.numero_lote_cooperativa ?? "" },
    { key: "nf_remessa_cooperativa", label: "NF remessa cooperativa", type: "text", width: 180, accessor: (r) => r.nf_remessa_cooperativa ?? "" },

    // OBSERVAÇÕES / STATUS (2)
    { key: "observacoes", label: "Observações", type: "text", width: 240, accessor: (r) => r.observacoes ?? "" },
    { key: "status", label: "Etapa (auto)", type: "select", options: statusOptions, width: 160, accessor: (r) => r.status },
  ];

  const groups: GridGroup[] = [
    { label: "Colheita", span: 7, className: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "Terreiro", span: 2, className: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Secador", span: 3, className: "bg-sky-50 dark:bg-sky-950/30" },
    { label: "Benefício", span: 2, className: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Depósito", span: 4, className: "bg-stone-100 dark:bg-stone-900/40" },
    { label: "Observações", span: 2, className: "bg-secondary/60" },
  ];

  async function saveCell(rowId: string, key: string, value: string | number | string[] | null) {
    const patch: Record<string, unknown> = { [key]: value };
    if (key === "talhao_ids") {
      const arr = Array.isArray(value) ? value : [];
      patch.talhao_id = arr[0] ?? null;
    }
    // Auto-derive status when stage dates change
    if (["data_entrada_terreiro", "data_saida_terreiro", "data_entrada_secador", "data_saida_secador", "numero_tulha", "data_beneficio", "data_envio_cooperativa"].includes(key)) {
      const current = rows.find((r) => r.id === rowId);
      if (current) {
        const next = deriveStatus({ ...current, [key]: value });
        patch.status = next;
      }
    }
    const { error } = await supabase.from("lotes").update(patch as never).eq("id", rowId);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["lotes"] });
  }

  async function createRow(initial: Record<string, string | number | string[] | null>): Promise<string> {
    const payload: Record<string, unknown> = { fazenda_id: fazendaId, ...initial };
    payload.status = deriveStatus(initial as Partial<Lote>);
    const { data, error } = await supabase.from("lotes").insert(payload as never).select("id").single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["lotes"] });
    toast.success("Lote criado");
    return data!.id as string;
  }

  async function duplicateRow(rowId: string) {
    const src = rows.find((r) => r.id === rowId);
    if (!src) return;
    const { id: _id, ...rest } = src as any;
    const { error } = await supabase.from("lotes").insert({ ...rest, numero_lote_fazenda: `${src.numero_lote_fazenda} (cópia)` });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["lotes"] });
    toast.success("Lote duplicado");
  }

  async function deleteRow(rowId: string) {
    const { error } = await supabase.from("lotes").delete().eq("id", rowId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["lotes"] });
    toast.success("Lote excluído");
  }

  return (
    <EditableGrid<Lote>
      rows={rows}
      columns={columns}
      groups={groups}
      onSaveCell={saveCell}
      onCreateRow={createRow}
      onDuplicateRow={duplicateRow}
      onDeleteRow={deleteRow}
      newRowDraftKeys={["numero_lote_fazenda"]}
      emptyDraftLabel="Digite o nº do lote para criar"
    />
  );
}