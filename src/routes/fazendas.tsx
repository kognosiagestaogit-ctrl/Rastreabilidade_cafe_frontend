import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Plus,
  Tractor,
  MapPin,
  User,
  Trash2,
  Sprout,
  X,
  Pencil,
  Palette,
  Check,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { Fazenda, Talhao } from "@/lib/db-types";
import { num } from "@/lib/format";
import { FAZENDA_PALETTES, type ThemePaletteKey } from "@/lib/theme-palettes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fazendas")({
  head: () => ({ meta: [{ title: "Fazendas — Gestão Pedra Negra" }] }),
  component: FazendasPage,
});

const schema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  proprietario: z.string().trim().max(120).optional().or(z.literal("")),
  cooperado_iniciais: z.string().trim().max(20).optional().or(z.literal("")),
  localizacao: z.string().trim().max(200).optional().or(z.literal("")),
  observacoes: z.string().trim().max(1000).optional().or(z.literal("")),
  cor: z.string().optional().or(z.literal("")),
});

function PaletteSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: ThemePaletteKey) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="flex items-center gap-1.5 font-medium">
        <Palette className="h-4 w-4 text-muted-foreground" /> Paleta de cores do tema
      </Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.values(FAZENDA_PALETTES).map((pal) => {
          const isSelected = value === pal.key;
          return (
            <button
              key={pal.key}
              type="button"
              onClick={() => onChange(pal.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition hover:bg-accent/50",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-accent/40 font-medium"
                  : "border-border",
              )}
            >
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-xs flex items-center justify-center text-white"
                style={{ backgroundColor: pal.badgeHex }}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-none">{pal.nome}</p>
                <p className="truncate text-[10px] text-muted-foreground mt-0.5">{pal.descricao}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FazendasPage() {
  const { fazendas, setFazendaAtualId, fazendaAtual } = useFazendas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    proprietario: "",
    cooperado_iniciais: "",
    localizacao: "",
    observacoes: "",
    cor: "emerald",
  });

  const createMut = useMutation({
    mutationFn: async (values: typeof form) => {
      const parsed = schema.parse(values);
      const data = await mockDb.createFazenda({
        nome: parsed.nome,
        proprietario: parsed.proprietario || null,
        cooperado_iniciais: parsed.cooperado_iniciais || null,
        localizacao: parsed.localizacao || null,
        observacoes: parsed.observacoes || null,
        cor: parsed.cor || "emerald",
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success("Fazenda cadastrada");
      qc.invalidateQueries({ queryKey: ["fazendas"] });
      if (data?.id) setFazendaAtualId(data.id);
      setOpen(false);
      setForm({
        nome: "",
        proprietario: "",
        cooperado_iniciais: "",
        localizacao: "",
        observacoes: "",
        cor: "emerald",
      });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao cadastrar"),
  });

  const [editing, setEditing] = useState<Fazenda | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await mockDb.deleteFazenda(id);
    },
    onSuccess: () => {
      toast.success("Fazenda removida");
      qc.invalidateQueries({ queryKey: ["fazendas"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus className="h-5 w-5" /> Nova fazenda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar fazenda</DialogTitle>
          <DialogDescription>
            Preencha os dados básicos e escolha a cor tema da fazenda.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome da fazenda *</Label>
            <Input
              id="nome"
              className="h-12 text-base"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Fazenda Boa Vista"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="prop">Proprietário</Label>
              <Input
                id="prop"
                className="h-12 text-base"
                value={form.proprietario}
                onChange={(e) => setForm({ ...form, proprietario: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="iniciais">Iniciais (cooperado)</Label>
              <Input
                id="iniciais"
                className="h-12 text-base"
                value={form.cooperado_iniciais}
                onChange={(e) => setForm({ ...form, cooperado_iniciais: e.target.value })}
                placeholder="Ex.: ZN"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="loc">Localização</Label>
            <Input
              id="loc"
              className="h-12 text-base"
              value={form.localizacao}
              onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
              placeholder="Cidade / Região"
            />
          </div>
          <PaletteSelector value={form.cor} onChange={(cor) => setForm({ ...form, cor })} />
          <div className="grid gap-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="lg" onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>
            {createMut.isPending ? "Salvando..." : "Salvar fazenda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <PageHeader
        title="Fazendas"
        description="Cadastre e selecione a fazenda em uso com cores personalizadas."
        actions={dialog}
      />
      <div className="p-4 sm:p-8">
        {fazendas.length === 0 ? (
          <EmptyState
            icon={Tractor}
            title="Nenhuma fazenda ainda"
            description="Cadastre a primeira fazenda para começar a registrar lotes."
            action={dialog}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fazendas.map((f) => {
              const ativa = fazendaAtual?.id === f.id;
              const pal =
                FAZENDA_PALETTES[(f.cor as ThemePaletteKey) || "emerald"] ||
                FAZENDA_PALETTES.emerald;
              return (
                <div
                  key={f.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border bg-card p-5 transition",
                    ativa ? "border-primary ring-2 ring-primary/20" : "hover:border-accent",
                  )}
                >
                  <div
                    className="absolute left-0 top-0 h-1.5 w-full"
                    style={{ backgroundColor: pal.badgeHex }}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: pal.badgeHex }}
                        />
                        <h2 className="truncate">{f.nome}</h2>
                      </div>
                      {ativa && (
                        <span className="mt-1.5 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                          Em uso
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar fazenda"
                        onClick={() => setEditing(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir fazenda"
                        onClick={() => {
                          if (
                            confirm(
                              `Excluir a fazenda "${f.nome}"? Todos os lotes e vendas serão removidos.`,
                            )
                          )
                            deleteMut.mutate(f.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {f.proprietario && (
                      <p className="flex items-center gap-2">
                        <User className="h-4 w-4" /> {f.proprietario}
                      </p>
                    )}
                    {f.localizacao && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {f.localizacao}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-xs">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Tema:{" "}
                      <span className="font-medium text-foreground">{pal.nome}</span>
                    </p>
                  </div>
                  {!ativa && (
                    <Button
                      variant="outline"
                      className="mt-4 w-full"
                      size="lg"
                      onClick={() => setFazendaAtualId(f.id)}
                    >
                      Usar esta fazenda
                    </Button>
                  )}
                  {ativa && <TalhoesSection fazendaId={f.id} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <EditFazendaDialog fazenda={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function EditFazendaDialog({ fazenda, onClose }: { fazenda: Fazenda | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    proprietario: "",
    cooperado_iniciais: "",
    localizacao: "",
    observacoes: "",
    cor: "emerald",
  });

  useEffect(() => {
    if (fazenda) {
      setForm({
        nome: fazenda.nome ?? "",
        proprietario: fazenda.proprietario ?? "",
        cooperado_iniciais: fazenda.cooperado_iniciais ?? "",
        localizacao: fazenda.localizacao ?? "",
        observacoes: fazenda.observacoes ?? "",
        cor: fazenda.cor ?? "emerald",
      });
    }
  }, [fazenda]);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!fazenda) return;
      const parsed = schema.parse(form);
      await mockDb.updateFazenda(fazenda.id, {
        nome: parsed.nome,
        proprietario: parsed.proprietario || null,
        cooperado_iniciais: parsed.cooperado_iniciais || null,
        localizacao: parsed.localizacao || null,
        observacoes: parsed.observacoes || null,
        cor: parsed.cor || "emerald",
      });
    },
    onSuccess: () => {
      toast.success("Fazenda atualizada");
      qc.invalidateQueries({ queryKey: ["fazendas"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  return (
    <Dialog open={!!fazenda} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar fazenda</DialogTitle>
          <DialogDescription>Atualize os dados e a cor tema da fazenda.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-nome">Nome da fazenda *</Label>
            <Input
              id="edit-nome"
              className="h-12 text-base"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-prop">Proprietário</Label>
              <Input
                id="edit-prop"
                className="h-12 text-base"
                value={form.proprietario}
                onChange={(e) => setForm({ ...form, proprietario: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-iniciais">Iniciais (cooperado)</Label>
              <Input
                id="edit-iniciais"
                className="h-12 text-base"
                value={form.cooperado_iniciais}
                onChange={(e) => setForm({ ...form, cooperado_iniciais: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-loc">Localização</Label>
            <Input
              id="edit-loc"
              className="h-12 text-base"
              value={form.localizacao}
              onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
            />
          </div>
          <PaletteSelector value={form.cor} onChange={(cor) => setForm({ ...form, cor })} />
          <div className="grid gap-2">
            <Label htmlFor="edit-obs">Observações</Label>
            <Textarea
              id="edit-obs"
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="lg" onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TalhoesSection({ fazendaId }: { fazendaId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", variedade: "", area_hectares: "" });

  const talhoesQ = useQuery({
    queryKey: ["talhoes", fazendaId],
    queryFn: async (): Promise<Talhao[]> => {
      return await mockDb.getTalhoes(fazendaId);
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome do talhão");
      await mockDb.createTalhao({
        fazenda_id: fazendaId,
        nome: form.nome.trim(),
        variedade: form.variedade.trim() || null,
        area_hectares: form.area_hectares ? Number(form.area_hectares) : null,
      });
    },
    onSuccess: () => {
      toast.success("Talhão adicionado");
      qc.invalidateQueries({ queryKey: ["talhoes", fazendaId] });
      setForm({ nome: "", variedade: "", area_hectares: "" });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await mockDb.deleteTalhao(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["talhoes", fazendaId] }),
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const talhoes = talhoesQ.data ?? [];

  return (
    <div className="mt-5 border-t pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sprout className="h-4 w-4" /> Talhões
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo talhão</DialogTitle>
              <DialogDescription>
                Identifique a área plantada dentro desta fazenda.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label>Nome / identificação *</Label>
                <Input
                  className="h-12 text-base"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex.: Talhão 1 — Pé do morro"
                />
              </div>
              <div className="grid gap-2">
                <Label>Variedade</Label>
                <Input
                  className="h-12 text-base"
                  value={form.variedade}
                  onChange={(e) => setForm({ ...form, variedade: e.target.value })}
                  placeholder="Ex.: Catuaí Vermelho"
                />
              </div>
              <div className="grid gap-2">
                <Label>Área (hectares)</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-12 text-base"
                  value={form.area_hectares}
                  onChange={(e) => setForm({ ...form, area_hectares: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="lg" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button size="lg" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {talhoes.length === 0 ? (
        <p className="rounded-md border border-dashed bg-secondary/30 px-3 py-3 text-xs text-muted-foreground">
          Nenhum talhão cadastrado.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {talhoes.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{t.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[t.variedade, t.area_hectares != null ? `${num(t.area_hectares, 2)} ha` : null]
                    .filter(Boolean)
                    .join(" • ") || "—"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (confirm(`Remover talhão "${t.nome}"?`)) deleteMut.mutate(t.id);
                }}
                aria-label="Remover talhão"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
