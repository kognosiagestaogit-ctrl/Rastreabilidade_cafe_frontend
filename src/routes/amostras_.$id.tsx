import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { apiClient } from "@/lib/api-client";
import { brl, num } from "@/lib/format";
import { FileSpreadsheet, ShoppingCart, ArrowLeft } from "lucide-react";
import type { Amostra } from "@/lib/db-types";
import { getVendaEffectiveStatus, VENDA_STATUS_ICONS } from "./vendas";

export const Route = createFileRoute("/amostras_/$id")({
  component: AmostraDetailsPage,
});

function AmostraDetailsPage() {
  const { id } = Route.useParams();

  const { data: amostra, isLoading } = useQuery<Amostra>({
    queryKey: ["amostras", "detail", id],
    queryFn: async () => {
      // We might not have a single amostra endpoint. Let's see if we do.
      return apiClient.get(`/api/amostras/${id}`);
    },
  });

  if (isLoading) {
    return <div className="p-8">Carregando detalhes...</div>;
  }

  if (!amostra) {
    return <div className="p-8">Amostra não encontrada.</div>;
  }

  return (
    <>
      <PageHeader
        title={`Amostra ${amostra.codigo_amostra}`}
        actions={
          <Link
            to="/amostras"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        }
      />

      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Detalhes da Amostra
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 bg-card p-6 rounded-xl border shadow-sm">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Data Recebimento
              </p>
              <p className="font-medium text-base">
                {amostra.data_recebimento
                  ? new Date(amostra.data_recebimento).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Conta Corrente
              </p>
              <p className="font-medium text-base">{amostra.conta_corrente || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Prêmio Rainforest
              </p>
              <p className="font-medium text-base text-primary">
                {brl(Number(amostra.premio_rainforest || 0))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                IS/DS
              </p>
              <p className="font-medium text-base">{brl(Number(amostra.is_ds || 0))}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Descontos
              </p>
              <p className="font-medium text-base text-destructive">
                {brl(Number(amostra.descontos || 0))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Funrural
              </p>
              <p className="font-medium text-base text-destructive">
                {brl(Number(amostra.v_funrural || 0))}
              </p>
            </div>
            {amostra.observacoes && (
              <div className="col-span-2 sm:col-span-4 pt-2 border-t mt-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Observações
                </p>
                <p className="text-base bg-secondary/30 p-4 rounded-lg border-l-2 border-primary/50 text-foreground whitespace-pre-wrap">
                  {amostra.observacoes}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Vendas que compõem a amostra
          </h4>
          {amostra.vendas && amostra.vendas.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {amostra.vendas.map((v) => {
                const status = getVendaEffectiveStatus(v);
                const StatusIcon = VENDA_STATUS_ICONS[status];
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {v.cliente ?? "Sem cliente"}
                        </p>
                        <p className="truncate text-[11px] font-medium text-muted-foreground mt-0.5">
                          NF: <span className="text-foreground">{v.nf_venda || "-"}</span> • Coop:{" "}
                          <span className="text-foreground">
                            {v.numero_lote_cooperativa || "-"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {brl(Number(v.vl_liquido ?? v.a_receber_previsto ?? 0))}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                        {num(v.sacas_vendidas, 1)} sc
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Nenhuma venda registrada para esta amostra.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
