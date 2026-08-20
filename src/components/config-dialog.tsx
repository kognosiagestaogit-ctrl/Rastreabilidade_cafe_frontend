import { useState, useEffect } from "react";
import { Settings, Save, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Search, ShoppingBag, FlaskConical, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useFazendas } from "@/lib/fazenda-context";

// ── Types ──────────────────────────────────────────────────────────────────────

interface IntegracaoCredencial {
  id: string;
  provider: string;
  username: string;
  has_credentials: boolean;
  status: string;
  error_message: string | null;
  last_sync_at: string | null;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { fazendaAtual } = useFazendas();
  const [existing, setExisting] = useState<IntegracaoCredencial | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [saving, setSaving] = useState(false);

  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const [buscarLoading, setBuscarLoading] = useState(false);
  const [buscarResult, setBuscarResult] = useState<{ vendas: number; amostras: number } | null>(null);
  const [buscarMes, setBuscarMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [buscarAno, setBuscarAno] = useState(new Date().getFullYear().toString());

  const handleBuscar = async () => {
    if (!buscarMes || !buscarAno) {
      toast.error("Informe mês e ano.");
      return;
    }
    if (!existing) {
      toast.error("Integração não encontrada.");
      return;
    }

    setBuscarLoading(true);
    setBuscarResult(null);
    try {
      const data = await apiClient.get<{ vendas: number; amostras: number }>(
        `/api/integracoes/${existing.id}/buscar-registros?mes=${buscarMes}&ano=${buscarAno}`
      );
      setBuscarResult(data);
      toast.success("Busca concluída com sucesso!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao buscar registros na Minasul.");
    } finally {
      setBuscarLoading(false);
    }
  };

  // Busca integração existente ao abrir o modal
  useEffect(() => {
    if (!open || !fazendaAtual?.id) return;
    setLoadingFetch(true);
    apiClient
      .get<IntegracaoCredencial[]>(`/api/fazendas/${fazendaAtual.id}/integracoes`)
      .then((list) => {
        const minasul = list.find((i) => i.provider === "minasul") ?? null;
        setExisting(minasul);
        if (minasul) {
          setLogin(minasul.username);
          // Senha nunca vem da API — mostramos placeholder mascarado
          setSenha("");
          setShowLogin(false);
        } else {
          setLogin("");
          setSenha("");
          setShowLogin(true);
        }
      })
      .catch(() => {
        toast.error("Não foi possível carregar as configurações.");
      })
      .finally(() => setLoadingFetch(false));
  }, [open, fazendaAtual?.id]);

  const handleSave = async () => {
    if (!login.trim()) {
      toast.error("Informe o login da Minasul.");
      return;
    }
    if (!existing && !senha.trim()) {
      toast.error("Informe a senha da Minasul.");
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        // Atualizar: só envia senha se foi alterada
        const body: Record<string, string> = {
          provider: "minasul",
          username: login.trim(),
        };
        if (senha.trim()) body.password = senha.trim();

        await apiClient.put(`/api/integracoes/${existing.id}`, body);
        toast.success("Credenciais da Minasul atualizadas!");
      } else {
        if (!fazendaAtual?.id) {
          toast.error("Nenhuma fazenda selecionada.");
          return;
        }
        // Criar nova
        await apiClient.post(`/api/fazendas/${fazendaAtual.id}/integracoes`, {
          provider: "minasul",
          username: login.trim(),
          password: senha.trim(),
        });
        toast.success("Credenciais da Minasul salvas!");
      }

      // Recarrega para refletir o estado novo
      if (fazendaAtual?.id) {
        const list = await apiClient.get<IntegracaoCredencial[]>(`/api/fazendas/${fazendaAtual.id}/integracoes`);
        const minasul = list.find((i) => i.provider === "minasul") ?? null;
        setExisting(minasul);
      }
      setSenha(""); // limpa campo de senha após salvar
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar credenciais.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    
    setSaving(true);
    try {
      await apiClient.delete(`/api/integracoes/${existing.id}`);
      toast.success("Credenciais removidas!");
      setExisting(null);
      setLogin("");
      setSenha("");
      setShowLogin(true);
      setBuscarResult(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao remover credenciais.");
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!existing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Configurações
          </DialogTitle>
          <DialogDescription>
            Gerencie as configurações e integrações da plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          {/* ── Seção Minasul ─────────────────────────────────────────── */}
          <div className="rounded-lg border bg-secondary/30 p-4">
            <div
              className="mb-4 flex items-start justify-between gap-2 cursor-pointer select-none"
              onClick={() => setShowLogin((v) => !v)}
            >
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Minasul credenciais
                  {showLogin ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Será usado para buscar dados automaticamente em minasul.
                </p>
              </div>

              {/* Badge de status */}
              {!loadingFetch && (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isEditing
                      ? existing?.status === "ERRO"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isEditing ? (
                    existing?.status === "ERRO" ? (
                      <>
                        <AlertCircle className="h-3 w-3" /> Erro
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Configurado
                      </>
                    )
                  ) : (
                    "Não configurado"
                  )}
                </span>
              )}
            </div>

            {showLogin && (
              <>
                {loadingFetch ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="minasul-login">Login</Label>
                      <Input
                        id="minasul-login"
                        placeholder="Digite o login"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="minasul-senha">
                        Senha{isEditing && " (deixe em branco para não alterar)"}
                      </Label>
                      <div className="relative">
                        <Input
                          id="minasul-senha"
                          type={showSenha ? "text" : "password"}
                          placeholder={isEditing ? "••••••••" : "Digite a senha"}
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSenha((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showSenha ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mensagem de erro da integração */}
                    {existing?.status === "ERRO" && existing.error_message && (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {existing.error_message}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  {isEditing && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={saving || loadingFetch} className="gap-2">
                          <Trash2 className="h-4 w-4" /> Limpar registro
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá permanentemente as credenciais da Minasul. Essa ação não pode ser desfeita e a sincronização automática parará de funcionar até que novas credenciais sejam configuradas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sim, limpar credenciais
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button onClick={handleSave} disabled={saving || loadingFetch} className="gap-2">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isEditing ? "Atualizar credenciais" : "Salvar credenciais"}
                  </Button>
                </div>
              </>
            )}
          </div>

          {isEditing && (
            <div className="rounded-lg border bg-secondary/30 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Buscar registros por período (Minasul)
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Busque vendas e amostras geradas em um mês e ano específicos.
                </p>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="grid gap-1.5 flex-1">
                  <Label htmlFor="buscar-mes" className="text-xs">Mês</Label>
                  <Input
                    id="buscar-mes"
                    placeholder="Ex: 05"
                    type="number"
                    min="1"
                    max="12"
                    value={buscarMes}
                    onChange={(e) => setBuscarMes(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5 flex-1">
                  <Label htmlFor="buscar-ano" className="text-xs">Ano</Label>
                  <Input
                    id="buscar-ano"
                    placeholder="Ex: 2024"
                    type="number"
                    min="2000"
                    value={buscarAno}
                    onChange={(e) => setBuscarAno(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5 self-end">
                  <Button onClick={handleBuscar} disabled={buscarLoading} className="gap-2 shrink-0">
                    {buscarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Buscar
                  </Button>
                </div>
              </div>

              {buscarResult && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
                  <div className="flex flex-col items-center justify-center p-3 rounded-md bg-background border shadow-sm">
                    <ShoppingBag className="h-5 w-5 text-emerald-500 mb-1" />
                    <span className="text-2xl font-bold">{buscarResult.vendas}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Vendas</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-md bg-background border shadow-sm">
                    <FlaskConical className="h-5 w-5 text-blue-500 mb-1" />
                    <span className="text-2xl font-bold">{buscarResult.amostras}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Amostras</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
