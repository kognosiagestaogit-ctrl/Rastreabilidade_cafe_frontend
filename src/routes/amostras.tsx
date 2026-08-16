
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import {
  FileSpreadsheet,
  Plus,
  Filter,
  RotateCcw,
  Search,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  Pencil,
  Layers,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFazendas } from "@/lib/fazenda-context";
import { brl, num } from "@/lib/format";
import type { Amostra, Venda } from "@/lib/db-types";
import { apiClient } from "@/lib/api-client";
import { getVendaEffectiveStatus, VENDA_STATUS_ICONS, EditarVendaDialog } from "./vendas";

export const Route = createFileRoute("/amostras")({
  head: () => ({ meta: [{ title: "Amostras — Gestão Pedra Negra" }] }),
  component: AmostrasPage,
});

const amostraSchema = z.object({
  codigo_amostra: z.string().min(1, "Obrigatório"),
  total_sacas: z.string().optional(),
  descontos: z.string().optional(),
  a_receber_previsto: z.string().optional(),
  valor_recebido: z.string().optional(),
  data_recebimento: z.string().optional(),
  conta_corrente: z.string().optional(),
  is_ds: z.string().optional(),
  premio_rainforest: z.string().optional(),
  anuncio_venda: z.string().optional(),
  v_funrural: z.string().optional(),
  observacoes: z.string().optional(),
});

export function AmostrasPage() {
  const { fazendaAtual, fazendas } = useFazendas();
  const qc = useQueryClient();
  const [buscaDraft, setBuscaDraft] = useState("");
  const [buscaApplied, setBuscaApplied] = useState("");

  const [novaAmostraOpen, setNovaAmostraOpen] = useState(false);
  const [editAmostra, setEditAmostra] = useState<Amostra | null>(null);
  const [editVenda, setEditVenda] = useState<Venda | null>(null);

  const amostrasQ = useQuery({
    queryKey: ["amostras", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Amostra[]> => {
      return apiClient.get(`/api/fazendas/${fazendaAtual!.id}/amostras`);
    },
  });

  const amostras = amostrasQ.data ?? [];

  const amostrasVisao = useMemo(() => {
    return amostras.filter((a) => {
      const termo = buscaApplied.trim().toLowerCase();
      if (!termo) return true;
      return [a.codigo_amostra, a.observacoes].some((c) =>
        (c ?? "").toLowerCase().includes(termo),
      );
    });
  }, [amostras, buscaApplied]);

  if (fazendas.length === 0) {
    return (
      <>
        <PageHeader title="Amostras" />
        <div className="p-8">
          <EmptyState icon={FileSpreadsheet} title="Cadastre uma fazenda primeiro" />
        </div>
      </>
    );
  }

  if (!fazendaAtual) {
    return (
      <>
        <PageHeader title="Amostras" />
        <div className="p-8">
          <EmptyState
            icon={FileSpreadsheet}
            title="Selecione uma fazenda"
            description="Escolha uma fazenda no seletor acima para ver as amostras."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Amostras — ${fazendaAtual?.nome ?? ""}`}
        description="Agrupamentos de vendas por amostra / lote."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" onClick={() => setNovaAmostraOpen(true)}>
              <Plus className="h-5 w-5" /> Criar amostra
            </Button>
            <NovaAmostraDialog
              open={novaAmostraOpen}
              onOpenChange={setNovaAmostraOpen}
              fazendaId={fazendaAtual.id}
            />
          </div>
        }
      />
      <div className="p-4 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou observação..."
              value={buscaDraft}
              onChange={(e) => setBuscaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setBuscaApplied(buscaDraft);
                  toast.success("Filtros aplicados");
                }
              }}
              className="h-10 pl-9"
            />
          </div>
          <Button onClick={() => { setBuscaApplied(buscaDraft); toast.success("Filtros aplicados"); }} className="h-10 gap-2">
            <Filter className="h-4 w-4" /> Aplicar filtros
          </Button>
          <Button variant="outline" onClick={() => { setBuscaDraft(""); setBuscaApplied(""); toast.info("Filtros limpos"); }} className="h-10 gap-2">
            <RotateCcw className="h-4 w-4" /> Limpar filtros
          </Button>
        </div>

        <AmostraListView amostras={amostrasVisao} onEditVenda={setEditVenda} onEditAmostra={setEditAmostra} />
      </div>

      {editAmostra && fazendaAtual && (
        <EditarAmostraDialog
          open={!!editAmostra}
          onOpenChange={(v) => !v && setEditAmostra(null)}
          amostra={editAmostra}
          fazendaId={fazendaAtual.id}
        />
      )}

      {editVenda && <EditarVendaDialog venda={editVenda} onClose={() => setEditVenda(null)} />}
    </>
  );
}

function NovaAmostraDialog({
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
    codigo_amostra: "",
    total_sacas: "",
    descontos: "",
    a_receber_previsto: "",
    valor_recebido: "",
    data_recebimento: "",
    conta_corrente: "",
    is_ds: "",
    premio_rainforest: "",
    anuncio_venda: "",
    v_funrural: "",
    observacoes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = amostraSchema.parse(form);
      await apiClient.post("/api/amostras", {
        fazenda_id: fazendaId,
        codigo_amostra: parsed.codigo_amostra,
        total_sacas: parsed.total_sacas ? Number(parsed.total_sacas) : 0,
        descontos: parsed.descontos ? Number(parsed.descontos) : 0,
        a_receber_previsto: parsed.a_receber_previsto ? Number(parsed.a_receber_previsto) : null,
        valor_recebido: parsed.valor_recebido ? Number(parsed.valor_recebido) : null,
        data_recebimento: parsed.data_recebimento || null,
        conta_corrente: parsed.conta_corrente || null,
        is_ds: parsed.is_ds ? Number(parsed.is_ds) : 0,
        premio_rainforest: parsed.premio_rainforest ? Number(parsed.premio_rainforest) : 0,
        anuncio_venda: parsed.anuncio_venda || null,
        v_funrural: parsed.v_funrural ? Number(parsed.v_funrural) : 0,
        observacoes: parsed.observacoes || null,
      });
    },
    onSuccess: () => {
      toast.success("Amostra registrada");
      qc.invalidateQueries({ queryKey: ["amostras"] });
      onOpenChange(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar amostra"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Amostra</DialogTitle>
          <DialogDescription>Cadastre uma amostra para consolidar vendas.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1 col-span-2">
            <Label>Código da Amostra *</Label>
            <Input
              placeholder="Ex: AM-001"
              value={form.codigo_amostra}
              onChange={(e) => setForm({ ...form, codigo_amostra: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Sacas (Total)</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.total_sacas}
              onChange={(e) => setForm({ ...form, total_sacas: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>A Receber Previsto (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.a_receber_previsto}
              onChange={(e) => setForm({ ...form, a_receber_previsto: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Valor Recebido (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.valor_recebido}
              onChange={(e) => setForm({ ...form, valor_recebido: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Data Recebimento</Label>
            <Input
              type="date"
              value={form.data_recebimento}
              onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Prêmio Rainforest (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.premio_rainforest}
              onChange={(e) => setForm({ ...form, premio_rainforest: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>IS/DS</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.is_ds}
              onChange={(e) => setForm({ ...form, is_ds: e.target.value })}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Informações extras da amostra"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.codigo_amostra}
          >
            {mut.isPending ? "Salvando..." : "Salvar amostra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditarAmostraDialog({
  open,
  onOpenChange,
  amostra,
  fazendaId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amostra: Amostra;
  fazendaId: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    codigo_amostra: amostra.codigo_amostra || "",
    total_sacas: amostra.total_sacas?.toString() || "",
    descontos: amostra.descontos?.toString() || "",
    a_receber_previsto: amostra.a_receber_previsto?.toString() || "",
    valor_recebido: amostra.valor_recebido?.toString() || "",
    data_recebimento: amostra.data_recebimento || "",
    conta_corrente: amostra.conta_corrente || "",
    is_ds: amostra.is_ds?.toString() || "",
    premio_rainforest: amostra.premio_rainforest?.toString() || "",
    anuncio_venda: amostra.anuncio_venda || "",
    v_funrural: amostra.v_funrural?.toString() || "",
    observacoes: amostra.observacoes || "",
  });

  const [selectedVendas, setSelectedVendas] = useState<string[]>([]);

  // Buscar vendas disponíveis
  const { data: vendasDisponiveis = [] } = useQuery<Venda[]>({
    queryKey: ["vendas", "disponiveis", fazendaId],
    queryFn: async () => apiClient.get(`/api/fazendas/${fazendaId}/vendas/disponiveis`),
    enabled: !!fazendaId && open,
  });

  // Os valores são adicionados no onChange do checkbox para não limpar a seleção

  const mut = useMutation({
    mutationFn: async () => {
      const parsed = amostraSchema.parse(form);
      
      // 1. Atualizar dados da Amostra
      await apiClient.put(`/api/amostras/${amostra.id}`, {
        codigo_amostra: parsed.codigo_amostra,
        total_sacas: parsed.total_sacas ? Number(parsed.total_sacas) : 0,
        descontos: parsed.descontos ? Number(parsed.descontos) : 0,
        a_receber_previsto: parsed.a_receber_previsto ? Number(parsed.a_receber_previsto) : null,
        valor_recebido: parsed.valor_recebido ? Number(parsed.valor_recebido) : null,
        data_recebimento: parsed.data_recebimento || null,
        conta_corrente: parsed.conta_corrente || null,
        is_ds: parsed.is_ds ? Number(parsed.is_ds) : 0,
        premio_rainforest: parsed.premio_rainforest ? Number(parsed.premio_rainforest) : 0,
        anuncio_venda: parsed.anuncio_venda || null,
        v_funrural: parsed.v_funrural ? Number(parsed.v_funrural) : 0,
        observacoes: parsed.observacoes || null,
      });

      // 2. Vincular Vendas (se houver alguma selecionada no momento do save)
      if (selectedVendas.length > 0) {
        await apiClient.post(`/api/amostras/${amostra.id}/vincular-vendas`, {
          vendasIds: selectedVendas
        });
      }
    },
    onSuccess: () => {
      toast.success("Amostra atualizada");
      qc.invalidateQueries({ queryKey: ["amostras"] });
      qc.invalidateQueries({ queryKey: ["vendas", "disponiveis"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar amostra"),
  });

  const delMut = useMutation({
    mutationFn: async () => apiClient.delete(`/api/amostras/${amostra.id}`),
    onSuccess: () => {
      toast.success("Amostra excluída com sucesso");
      qc.invalidateQueries({ queryKey: ["amostras"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir amostra"),
  });

  const [showAvailableVendas, setShowAvailableVendas] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Amostra</DialogTitle>
          <DialogDescription>Edite a amostra e gerencie as vendas vinculadas.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-8 py-4">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Dados da Amostra
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-3">
                <Label>Código da Amostra *</Label>
                <Input
                  className="h-11 text-lg"
                  placeholder="Ex: AM-001"
                  value={form.codigo_amostra}
                  onChange={(e) => setForm({ ...form, codigo_amostra: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Sacas (Total)</Label>
                <Input
                  className="h-10"
                  type="number"
                  placeholder="0"
                  value={form.total_sacas}
                  onChange={(e) => setForm({ ...form, total_sacas: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>A Receber Previsto (R$)</Label>
                <Input
                  className="h-10"
                  type="number"
                  placeholder="0.00"
                  value={form.a_receber_previsto}
                  onChange={(e) => setForm({ ...form, a_receber_previsto: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor Recebido (R$)</Label>
                <Input
                  className="h-10"
                  type="number"
                  placeholder="0.00"
                  value={form.valor_recebido}
                  onChange={(e) => setForm({ ...form, valor_recebido: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Data Recebimento</Label>
                <Input
                  className="h-10"
                  type="date"
                  value={form.data_recebimento}
                  onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Prêmio Rainforest (R$)</Label>
                <Input
                  className="h-10"
                  type="number"
                  placeholder="0.00"
                  value={form.premio_rainforest}
                  onChange={(e) => setForm({ ...form, premio_rainforest: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>IS/DS</Label>
                <Input
                  className="h-10"
                  type="number"
                  placeholder="0.00"
                  value={form.is_ds}
                  onChange={(e) => setForm({ ...form, is_ds: e.target.value })}
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <Label>Observações</Label>
                <Textarea
                  className="min-h-[80px]"
                  placeholder="Informações extras da amostra"
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
              Vendas Vinculadas
            </h3>
            
            {amostra.vendas && amostra.vendas.length > 0 ? (
              <div className="flex flex-col gap-2">
                {amostra.vendas.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{v.cliente ?? "Sem Cliente"}</p>
                      <p className="text-xs text-muted-foreground">NF: {v.nf_venda || "Sem NF"} • Tipo: {v.tipo_venda || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">{brl(Number(v.vl_liquido ?? 0))}</p>
                      <p className="font-semibold text-sm">{v.sacas_vendidas} sc</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border rounded-lg text-center text-muted-foreground border-dashed bg-card/40">
                Nenhuma venda vinculada a esta amostra.
              </div>
            )}

            {!showAvailableVendas ? (
              <Button 
                variant="outline" 
                className="mt-2 w-fit gap-2"
                onClick={() => setShowAvailableVendas(true)}
              >
                <Plus className="h-4 w-4" /> Vincular nova venda
              </Button>
            ) : (
              <div className="mt-4 p-4 border rounded-xl bg-card shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Vendas Disponíveis</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowAvailableVendas(false)} className="h-8 text-xs">
                    Ocultar
                  </Button>
                </div>

                {vendasDisponiveis.length === 0 ? (
                  <div className="p-4 border rounded-md text-center text-sm text-muted-foreground border-dashed">
                    Não há vendas disponíveis (sem amostra) para vincular.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2">
                    {vendasDisponiveis.map(v => (
                      <label key={v.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:border-primary/50 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={selectedVendas.includes(v.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedVendas(prev => [...prev, v.id]);
                              setForm(prev => ({
                                ...prev,
                                total_sacas: (Number(prev.total_sacas || 0) + Number(v.sacas_vendidas || 0)).toString(),
                                a_receber_previsto: (Number(prev.a_receber_previsto || 0) + Number(v.vl_liquido || 0)).toString(),
                              }));
                            } else {
                              setSelectedVendas(prev => prev.filter(id => id !== v.id));
                              setForm(prev => ({
                                ...prev,
                                total_sacas: Math.max(0, Number(prev.total_sacas || 0) - Number(v.sacas_vendidas || 0)).toString(),
                                a_receber_previsto: Math.max(0, Number(prev.a_receber_previsto || 0) - Number(v.vl_liquido || 0)).toString(),
                              }));
                            }
                          }}
                        />
                        <div className="flex flex-col flex-1">
                          <span className="font-semibold text-sm">{v.tipo_venda} - {v.cliente ?? "Sem Cliente"}</span>
                          <span className="text-xs text-muted-foreground">Lote: {v.numero_lote_cooperativa || "N/A"}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="font-medium text-sm text-emerald-600 dark:text-emerald-400">{brl(Number(v.vl_liquido ?? 0))}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{v.sacas_vendidas} sc</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                {selectedVendas.length > 0 && (
                  <div className="text-sm text-primary border-l-2 border-primary pl-3 py-2 bg-primary/10 rounded-r-lg mt-2 font-medium">
                    {selectedVendas.length} venda(s) selecionada(s). Os valores foram somados aos campos da amostra automaticamente. Clique em "Salvar alterações" para efetivar.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between w-full">
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm(`Tem certeza que deseja excluir a amostra ${amostra.codigo_amostra}?`)) {
                delMut.mutate();
              }
            }}
            disabled={delMut.isPending || mut.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Excluir
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending || delMut.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || delMut.isPending || !form.codigo_amostra}
            >
              {mut.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AmostraListView({ amostras, onEditVenda, onEditAmostra }: { amostras: Amostra[]; onEditVenda: (v: Venda) => void; onEditAmostra: (a: Amostra) => void; }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (amostras.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/60 p-8 text-center text-muted-foreground">
        Nenhuma amostra encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {amostras.map((a) => {
        const isExpanded = expandedGroups[a.id];
        const vCount = a.vendas?.length ?? 0;
        
        // Sum properties for display if needed, but Amostra has native props
        const liquido = Number(a.a_receber_previsto ?? 0);
        const recebido = Number(a.valor_recebido ?? 0);
        const sacas = Number(a.total_sacas ?? 0);

        return (
          <div key={a.id} className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all duration-200 hover:border-primary/30">
            <button
              onClick={() => setExpandedGroups((p) => ({ ...p, [a.id]: !p[a.id] }))}
              className="flex w-full flex-col sm:flex-row items-start sm:items-center justify-between bg-secondary/20 px-5 py-4 hover:bg-secondary/40 transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="mt-1 sm:mt-0">
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="text-left flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-foreground text-lg tracking-tight">
                      {a.codigo_amostra}
                    </h3>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-7 px-2.5 gap-1.5 text-xs font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAmostra(a);
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 bg-background w-fit px-2 py-0.5 rounded-full border">
                    <Layers className="h-3 w-3" />
                    {vCount} {vCount === 1 ? "venda vinculada" : "vendas vinculadas"}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-sm text-right pl-9 sm:pl-0 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">Sacas (Total)</p>
                  <p className="font-semibold text-foreground">{num(sacas, 1)} <span className="text-muted-foreground font-normal text-xs">sc</span></p>
                </div>
                <div className="flex-1 sm:flex-none">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">A Receber / Líquido</p>
                  <p className="font-semibold text-foreground">{brl(liquido)}</p>
                </div>
                <div className="flex-1 sm:flex-none">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold mb-0.5">Valor Recebido</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{brl(recebido)}</p>
                </div>
              </div>
            </button>
            
            {isExpanded && (
              <div className="border-t bg-background/50 p-5 sm:p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                
                {/* Resumo da Amostra */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Detalhes da Amostra
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-y-4 gap-x-6 text-sm bg-card p-4 rounded-xl border shadow-sm">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data Recebimento</p>
                      <p className="font-medium">{a.data_recebimento ? new Date(a.data_recebimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Conta Corrente</p>
                      <p className="font-medium">{a.conta_corrente || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Prêmio Rainforest</p>
                      <p className="font-medium text-primary">{brl(Number(a.premio_rainforest || 0))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">IS/DS</p>
                      <p className="font-medium">{brl(Number(a.is_ds || 0))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descontos</p>
                      <p className="font-medium text-destructive">{brl(Number(a.descontos || 0))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Funrural</p>
                      <p className="font-medium text-destructive">{brl(Number(a.v_funrural || 0))}</p>
                    </div>
                    {a.observacoes && (
                      <div className="col-span-2 sm:col-span-4 lg:col-span-5 pt-2 border-t mt-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                        <p className="text-sm bg-secondary/30 p-3 rounded-lg border-l-2 border-primary/50 text-foreground whitespace-pre-wrap">{a.observacoes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendas Vinculadas */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                    <ShoppingCart className="h-3.5 w-3.5" /> Vendas que compõem a amostra
                  </h4>
                  {a.vendas && a.vendas.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {a.vendas.map(v => {
                        const status = getVendaEffectiveStatus(v);
                        const StatusIcon = VENDA_STATUS_ICONS[status];
                        return (
                          <div key={v.id} onClick={() => onEditVenda(v)} className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary group-hover:bg-primary/10 transition-colors">
                                <StatusIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">{v.cliente ?? "Sem cliente"}</p>
                                <p className="truncate text-[11px] font-medium text-muted-foreground mt-0.5">
                                  NF: <span className="text-foreground">{v.nf_venda || "-"}</span> • Coop: <span className="text-foreground">{v.numero_lote_cooperativa || "-"}</span>
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{brl(Number(v.vl_liquido ?? v.a_receber_previsto ?? 0))}</p>
                              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{num(v.sacas_vendidas, 1)} sc</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
                      Nenhuma venda registrada para esta amostra.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
