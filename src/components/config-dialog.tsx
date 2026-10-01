import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ShoppingBag,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Plus,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ──────────────────────────────────────────────────────────────────────

interface IntegracaoCredencial {
  id: string;
  provider: string;
  nome: string | null;
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
  const [integracoes, setIntegracoes] = useState<IntegracaoCredencial[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const [buscarLoading, setBuscarLoading] = useState(false);
  const [vendasFetched, setVendasFetched] = useState<any[] | null>(null);
  const [importando, setImportando] = useState(false);
  const [buscarResult, setBuscarResult] = useState<{ vendas: number; amostras: number } | null>(
    null,
  );

  const [buscarMes, setBuscarMes] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [buscarAno, setBuscarAno] = useState(new Date().getFullYear().toString());
  const [selectedIntegracaoId, setSelectedIntegracaoId] = useState<string>("");

  const handleBuscar = async () => {
    if (!buscarMes || !buscarAno) {
      toast.error("Informe mês e ano.");
      return;
    }
    if (!selectedIntegracaoId) {
      toast.error("Selecione uma conta Minasul para buscar.");
      return;
    }

    const integracao = integracoes.find((i) => i.id === selectedIntegracaoId);
    if (!integracao) {
      toast.error("Integração não encontrada.");
      return;
    }

    setBuscarLoading(true);
    setBuscarResult(null);
    setVendasFetched(null);
    try {
      // 1. Pegar credenciais puras do back-end
      const creds = await apiClient.get<{ username: string; password: string }>(
        `/api/integracoes/${integracao.id}/credenciais-puras`
      );

      const MINASUL_BASE = "https://apiportaldocooperado.minasul.com.br";
      const headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json",
        "access": "rtxiH3c6WSpQgQYpVN1AURcKbkxojXBT",
      };

      // 2. Fazer login direto do front-end para evitar bloqueio do Cloudflare
      const loginRes = await fetch(`${MINASUL_BASE}/login`, {
        method: "POST",
        headers,
        body: JSON.stringify({ username: creds.username, password: creds.password })
      });

      if (!loginRes.ok) {
        throw new Error(`Usuário ou senha inválidos na Minasul (${integracao.username}).`);
      }

      const loginData = await loginRes.json();
      const token = loginData?.user?.token?.token;
      if (!token) throw new Error("Falha ao obter token da Minasul.");

      // 3. Calcular data inicial e final sem problema de fuso horário
      const m = buscarMes.padStart(2, "0");
      const dateIni = `${buscarAno}-${m}-01`;
      const diasNoMes = new Date(Number(buscarAno), Number(m), 0).getDate();
      const dateEnd = `${buscarAno}-${m}-${diasNoMes}`;

      // 4. Buscar demonstrativos de vendas
      const vendasRes = await fetch(`${MINASUL_BASE}/coffee/portal-sales-demonstrative-ax`, {
        method: "POST",
        headers: {
          ...headers,
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dateIni, dateEnd, typeSales: "0", coffeePremiation: false })
      });

      if (!vendasRes.ok) {
        throw new Error("Erro ao buscar demonstrativos na Minasul.");
      }

      const vendasData = await vendasRes.json();

      if (vendasData && vendasData.length > 0) {
        console.log(`[Minasul] Buscando detalhes para ${vendasData.length} vendas...`);
        const enrichedVendas = await Promise.all(
          vendasData.map(async (venda: any) => {
            try {
              console.log(`[Minasul] Detalhes para salesId=${venda.COOPBATCHFORSALESID}, coopBatchId=${venda.COOPBATCHID}`);
              const detailRes = await fetch(`${MINASUL_BASE}/coffee/portal-demonstrative-details-ax`, {
                method: "POST",
                headers: {
                  ...headers,
                  authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  salesId: venda.COOPBATCHFORSALESID,
                  coopBatchId: venda.COOPBATCHID,
                  origin: "portal",
                }),
              });

              console.log(`[Minasul] Detail response status: ${detailRes.status}`);

              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                console.log(`[Minasul] Detail JSON keys:`, Object.keys(detailJson));
                console.log(`[Minasul] SalesStatement exists:`, !!detailJson?.SalesStatement);
                console.log(`[Minasul] response type:`, typeof detailJson?.SalesStatement?.response);

                if (detailJson?.SalesStatement?.response) {
                  const detailsObj = JSON.parse(detailJson.SalesStatement.response);
                  console.log(`[Minasul] Parsed details:`, {
                    DuplicateFinancing: detailsObj.DuplicateFinancing,
                    AdditionAmount: detailsObj.AdditionAmount,
                    SecondDiscountAmount: detailsObj.SecondDiscountAmount,
                    Discount: detailsObj.Discount,
                    NetAmountToPay: detailsObj.NetAmountToPay,
                  });
                  return { ...venda, DETAILS_EXTRA: detailsObj };
                } else {
                  console.warn(`[Minasul] SalesStatement.response não encontrado no JSON`);
                }
              } else {
                const errText = await detailRes.text().catch(() => "");
                console.error(`[Minasul] Detail request failed: ${detailRes.status}`, errText.substring(0, 200));
              }
            } catch (err) {
              console.error("[Minasul] Erro detalhes venda:", venda.COOPBATCHFORSALESID, err);
            }
            return venda;
          }),
        );

        // Log final para confirmar enrichment
        const withDetails = enrichedVendas.filter((v: any) => !!v.DETAILS_EXTRA);
        console.log(`[Minasul] Enriquecidos: ${withDetails.length}/${enrichedVendas.length}`);
        if (withDetails.length > 0) {
          console.log(`[Minasul] Exemplo DETAILS_EXTRA:`, {
            DuplicateFinancing: withDetails[0].DETAILS_EXTRA?.DuplicateFinancing,
            AdditionAmount: withDetails[0].DETAILS_EXTRA?.AdditionAmount,
            SecondDiscountAmount: withDetails[0].DETAILS_EXTRA?.SecondDiscountAmount,
          });
        }

        setVendasFetched(enrichedVendas);
        toast.success(`${enrichedVendas.length} registros encontrados!`);
      } else {
        setVendasFetched([]);
        toast.info("Nenhum registro encontrado neste período para esta conta.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao buscar registros na Minasul.");
    } finally {
      setBuscarLoading(false);
    }
  };

  const handleImportar = async () => {
    if (!vendasFetched || !selectedIntegracaoId) return;
    setImportando(true);
    try {
      const res = await apiClient.post<{ resultados: { vendas: number; amostras: number } }>(
        `/api/integracoes/${selectedIntegracaoId}/salvar-registros`,
        { vendasResumo: vendasFetched },
      );
      setBuscarResult(res.resultados);
      setVendasFetched(null);
      toast.success("Registros importados com sucesso!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao importar registros.");
    } finally {
      setImportando(false);
    }
  };

  const loadIntegracoes = () => {
    if (!fazendaAtual?.id) return;
    setLoadingFetch(true);
    apiClient
      .get<IntegracaoCredencial[]>(`/api/fazendas/${fazendaAtual.id}/integracoes`)
      .then((list) => {
        const minasulList = list.filter((i) => i.provider === "minasul");
        setIntegracoes(minasulList);
        if (minasulList.length > 0 && !selectedIntegracaoId) {
          setSelectedIntegracaoId(minasulList[0].id);
        }
      })
      .catch(() => {
        toast.error("Não foi possível carregar as configurações.");
      })
      .finally(() => setLoadingFetch(false));
  };

  // Busca integrações ao abrir o modal
  useEffect(() => {
    if (open) {
      loadIntegracoes();
    }
  }, [open, fazendaAtual?.id]);

  const handleAddAccount = async () => {
    if (!login.trim() || !senha.trim()) {
      toast.error("Informe o login e a senha da Minasul.");
      return;
    }
    if (!fazendaAtual?.id) {
      toast.error("Nenhuma fazenda selecionada.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(`/api/fazendas/${fazendaAtual.id}/integracoes`, {
        provider: "minasul",
        nome: nome.trim() || undefined,
        username: login.trim(),
        password: senha.trim(),
      });
      toast.success("Credenciais da Minasul salvas!");
      setNome("");
      setLogin("");
      setSenha("");
      loadIntegracoes();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar credenciais.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    setSaving(true);
    try {
      await apiClient.delete(`/api/integracoes/${id}`);
      toast.success("Conta removida!");
      if (selectedIntegracaoId === id) {
        setSelectedIntegracaoId("");
        setBuscarResult(null);
        setVendasFetched(null);
      }
      loadIntegracoes();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao remover credenciais.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Configurações
          </DialogTitle>
          <DialogDescription>
            Gerencie as configurações e contas vinculadas da fazenda.
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
                  Contas Minasul
                  {showLogin ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Adicione um ou mais cooperados para importar os registros.
                </p>
              </div>

              {/* Badge de status */}
              {!loadingFetch && (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    integracoes.length > 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {integracoes.length > 0 ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> {integracoes.length} Ativa(s)
                    </>
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
                  <div className="grid gap-6">
                    
                    {/* Lista de contas existentes */}
                    {integracoes.length > 0 && (
                      <div className="grid gap-2">
                        <Label>Contas Cadastradas</Label>
                        <div className="flex flex-col gap-2">
                          {integracoes.map((integ) => (
                            <div key={integ.id} className="flex items-center justify-between p-2 rounded-md border bg-background text-sm">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="font-medium">
                                  {integ.nome ? `${integ.nome} (${integ.username})` : integ.username}
                                </span>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover conta {integ.username}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Essa ação removerá as credenciais permanentemente, e não será mais possível importar registros para este usuário.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAccount(integ.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Sim, remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formulário para adicionar nova conta */}
                    <div className="grid gap-3 pt-4 border-t">
                      <Label className="text-muted-foreground">Adicionar Nova Conta</Label>
                      
                      <div className="grid gap-1.5">
                        <Label htmlFor="minasul-nome">Nome / Descrição (Opcional)</Label>
                        <Input
                          id="minasul-nome"
                          placeholder="Ex: João, Sócio 1"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="minasul-login">Login / Matrícula</Label>
                        <Input
                          id="minasul-login"
                          placeholder="Digite o login"
                          value={login}
                          onChange={(e) => setLogin(e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="minasul-senha">Senha</Label>
                        <div className="relative">
                          <Input
                            id="minasul-senha"
                            type={showSenha ? "text" : "password"}
                            placeholder="Digite a senha"
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
                            {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <Button onClick={handleAddAccount} disabled={saving || !login || !senha} className="gap-2 w-full sm:w-auto">
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Vincular Conta
                        </Button>
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>

          {integracoes.length > 0 && (
            <div className="rounded-lg border bg-secondary/30 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Buscar registros por período (Minasul)
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Busque vendas e amostras na Minasul de um cooperado específico.
                </p>
              </div>

              <div className="flex flex-col gap-4 mb-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="selecionar-conta" className="text-xs">
                    Cooperado / Conta
                  </Label>
                  <Select value={selectedIntegracaoId} onValueChange={setSelectedIntegracaoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {integracoes.map((integ) => (
                        <SelectItem key={integ.id} value={integ.id}>
                          {integ.nome ? `${integ.nome} (${integ.username})` : integ.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <div className="grid gap-1.5 flex-1">
                    <Label htmlFor="buscar-mes" className="text-xs">
                      Mês
                    </Label>
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
                    <Label htmlFor="buscar-ano" className="text-xs">
                      Ano
                    </Label>
                    <Input
                      id="buscar-ano"
                      placeholder="Ex: 2024"
                      type="number"
                      min="2000"
                      value={buscarAno}
                      onChange={(e) => setBuscarAno(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleBuscar}
                    disabled={buscarLoading || !selectedIntegracaoId}
                    className="gap-2 shrink-0"
                  >
                    {buscarLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Buscar
                  </Button>
                </div>
              </div>

              {vendasFetched !== null && vendasFetched.length > 0 && !buscarResult && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4 bg-primary/10 p-3 rounded-md">
                    <div>
                      <h4 className="font-medium text-sm text-primary">Registros encontrados</h4>
                      <p className="text-xs text-muted-foreground">
                        Foram encontrados {vendasFetched.length} registro(s) neste período.
                      </p>
                    </div>
                    <Button
                      onClick={handleImportar}
                      disabled={importando}
                      className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {importando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Importar Todos
                    </Button>
                  </div>
                </div>
              )}

              {vendasFetched !== null && vendasFetched.length === 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm text-center text-muted-foreground py-2">
                    Nenhum registro encontrado no período para esta conta.
                  </p>
                </div>
              )}

              {buscarResult && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium text-sm mb-3">Resumo da Importação</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center p-3 rounded-md bg-background border shadow-sm">
                      <ShoppingBag className="h-5 w-5 text-emerald-500 mb-1" />
                      <span className="text-2xl font-bold">{buscarResult.vendas}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Vendas Salvas
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-md bg-background border shadow-sm">
                      <FlaskConical className="h-5 w-5 text-blue-500 mb-1" />
                      <span className="text-2xl font-bold">{buscarResult.amostras}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Amostras Salvas
                      </span>
                    </div>
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
