import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coffee, ShoppingCart, Tractor, Droplets, Award, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useFazendas } from "@/lib/fazenda-context";
import { mockDb } from "@/lib/mock-db";
import { brl, num, STATUS_LABEL } from "@/lib/format";
import type { Lote, Venda } from "@/lib/db-types";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Painel — Gestão Pedra Negra" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { fazendaAtual, fazendas } = useFazendas();

  const lotesQuery = useQuery({
    queryKey: ["lotes", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Lote[]> => {
      return await mockDb.getLotes(fazendaAtual!.id);
    },
  });

  const vendasQuery = useQuery({
    queryKey: ["vendas", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<Venda[]> => {
      return await mockDb.getVendas(fazendaAtual!.id);
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", fazendaAtual?.id],
    enabled: !!fazendaAtual,
    queryFn: async (): Promise<any> => {
      return await apiClient.get(`/api/fazendas/${fazendaAtual!.id}/dashboard`);
    },
  });

  if (fazendas.length === 0) {
    return (
      <>
        <PageHeader title="Bem-vindo" description="Comece cadastrando a sua primeira fazenda." />
        <div className="p-4 sm:p-8">
          <EmptyState
            icon={Tractor}
            title="Nenhuma fazenda cadastrada"
            description="Para registrar lotes, vendas e prêmios, primeiro adicione pelo menos uma fazenda."
            action={
              <Button asChild size="lg">
                <Link to="/fazendas">
                  Cadastrar fazenda <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const lotes = lotesQuery.data ?? [];
  const vendas = vendasQuery.data ?? [];
  const dashboard = dashboardQuery.data;

  const totalSacasProduzidas = dashboard?.total_sacas_produzidas ?? 0;
  const totalSacasVendidas = dashboard?.total_sacas_vendidas ?? 0;
  const totalBruto = dashboard?.total_faturado ?? 0;
  const totalRecebido = vendas.reduce((s, v) => s + Number(v.valor_recebido ?? 0), 0);
  const aReceber = dashboard?.total_a_receber ?? 0;
  const lotesUmidadeAlerta = lotes.filter(
    (l) => l.umidade != null && (Number(l.umidade) < 10.5 || Number(l.umidade) > 12),
  );

  const porStatus = Object.fromEntries(
    Object.keys(STATUS_LABEL).map((k) => [k, lotes.filter((l) => l.status === k).length]),
  );

  return (
    <>
      <PageHeader
        title={`Painel — ${fazendaAtual?.nome ?? ""}`}
        description="Visão geral da safra atual."
        actions={
          <Button asChild size="lg">
            <Link to="/lotes">Ver lotes</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sacas produzidas" value={num(totalSacasProduzidas, 1)} icon={Coffee} hint={`${lotes.length} lote(s)`} />
          <StatCard label="Sacas vendidas" value={num(totalSacasVendidas, 1)} icon={ShoppingCart} tone="accent" hint={`${vendas.length} venda(s)`} />
          <StatCard label="Total faturado" value={brl(totalBruto)} icon={Award} tone="success" hint={`Recebido: ${brl(totalRecebido)}`} />
          <StatCard label="A receber" value={brl(aReceber)} icon={Droplets} tone="warning" hint="Saldo das vendas em aberto" />
        </div>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4">Lotes por etapa</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <Link
                key={k}
                to="/lotes"
                className="flex flex-col rounded-lg border bg-secondary/40 p-4 transition hover:border-primary hover:bg-secondary"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                <span className="mt-2 text-2xl font-bold text-foreground">{porStatus[k] ?? 0}</span>
              </Link>
            ))}
          </div>
        </section>

        {lotesUmidadeAlerta.length > 0 && (
          <section className="rounded-xl border border-warning/40 bg-warning/10 p-5">
            <h2 className="flex items-center gap-2 text-warning-foreground">
              <Droplets className="h-5 w-5" />
              Atenção: {lotesUmidadeAlerta.length} lote(s) com umidade fora do ideal (10,5% – 12%)
            </h2>
            <ul className="mt-3 space-y-1 text-sm">
              {lotesUmidadeAlerta.slice(0, 5).map((l) => (
                <li key={l.id}>
                  Lote <strong>{l.numero_lote_fazenda}</strong> — umidade {num(l.umidade, 1)}%
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
