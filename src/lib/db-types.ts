import type { LoteStatus } from "./format";

export type Lote = {
  id: string;
  fazenda_id: string;
  talhao_id: string | null;
  talhao_ids: string[];
  safra: number | null;
  numero_lote_fazenda: string;
  lote_colheita: string | null;
  tipo_cafe: string | null;
  colheita_tipo: "MANUAL" | "MECANICA" | null;
  data_colheita_inicio: string | null;
  data_colheita_fim: string | null;
  status: LoteStatus;
  data_entrada_terreiro: string | null;
  data_saida_terreiro: string | null;
  data_entrada_secador: string | null;
  data_saida_secador: string | null;
  umidade: number | null;
  numero_tulha: string | null;
  data_beneficio: string | null;
  data_envio_cooperativa: string | null;
  numero_sacas: number | null;
  numero_lote_cooperativa: string | null;
  nf_remessa_cooperativa: string | null;
  amostra: string | null;
  observacoes: string | null;
};

export type Venda = {
  id: string;
  fazenda_id: string;
  lote_id: string | null;
  numero_lote_cooperativa: string | null;
  padrao: string | null;
  quebra: number | null;
  peneira: string | null;
  amostra: string | null;
  cliente: string | null;
  nf_venda: string | null;
  sacas_vendidas: number;
  tipo_venda: "CPR" | "TERMO" | "FISICA" | null;
  data_venda: string | null;
  vl_bruto: number | null;
  vl_liquido: number | null;
  a_receber_previsto: number | null;
  valor_recebido: number | null;
  data_recebimento: string | null;
  premio_rainforest: number | null;
  anuncio_venda: string | null;
  nf_premio_rainforest: string | null;
  premio_liquido_funrural: number | null;
  observacoes: string | null;
  cooperado: string | null;
  data_envio_armazem: string | null;
  sacas_do_lote: number | null;
  nr_remessa_cooperativa: string | null;
  lotes_agrupados: string | null;
  descontos: number | null;
  conta_corrente: string | null;
  is_ds: number | null;
  data_recebimento_premio: string | null;
  status?: string | null;
};

export type Amostra = {
  id: string;
  fazenda_id: string;
  codigo_amostra: string;
  total_sacas: number;
  descontos: number;
  observacoes: string | null;
  a_receber_previsto: number | null;
  valor_recebido: number | null;
  data_recebimento: string | null;
  conta_corrente: string | null;
  is_ds: number;
  premio_rainforest: number;
  anuncio_venda: string | null;
  v_funrural: number;
  vendas?: Venda[];
};

export type Talhao = {
  id: string;
  fazenda_id: string;
  nome: string;
  area_hectares: number | null;
  variedade: string | null;
};

export type Fazenda = {
  id: string;
  nome: string;
  proprietario: string | null;
  cooperado_iniciais: string | null;
  localizacao: string | null;
  observacoes: string | null;
  cor?: string | null;
};

export type OrdemServico = {
  id: string;
  fazenda_id: string;
  talhao_id: string | null;
  safra: number;
  data: string | null;
  operador: string | null;
  maquina: string | null;
  atividade: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  horas_trabalhadas: number | null;
  area_hectares: number | null;
  insumo: string | null;
  dose_por_ha: number | null;
  quantidade_total: number | null;
  observacoes: string | null;
};
