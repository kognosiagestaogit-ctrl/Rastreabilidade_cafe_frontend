import { Fazenda, Lote, Talhao, Venda } from "./db-types";

// In-memory mock database
let fazendas: Fazenda[] = [
  {
    id: "mock-fazenda-1",
    nome: "Fazenda Pedra Negra (Demonstração)",
    proprietario: "Usuário",
    cooperado_iniciais: "FPN",
    localizacao: "Minas Gerais",
    observacoes: "Fazenda pré-cadastrada para visualização do sistema.",
  },
];

let lotes: Lote[] = [
  {
    id: "mock-lote-1",
    fazenda_id: "mock-fazenda-1",
    numero_lote_fazenda: "100",
    lote_colheita: "100-A",
    tipo_cafe: "NATURAL",
    status: "NO_TERREIRO",
    data_colheita_inicio: "2026-08-01",
    data_entrada_terreiro: "2026-08-03",
    numero_sacas: 20,
    talhao_id: null,
    talhao_ids: [],
    safra: 2026,
    colheita_tipo: "MANUAL",
    data_colheita_fim: null,
    data_saida_terreiro: null,
    data_entrada_secador: null,
    data_saida_secador: null,
    umidade: null,
    numero_tulha: null,
    data_beneficio: null,
    data_envio_cooperativa: null,
    numero_lote_cooperativa: null,
    nf_remessa_cooperativa: null,
    observacoes: null,
  },
  {
    id: "mock-lote-2",
    fazenda_id: "mock-fazenda-1",
    numero_lote_fazenda: "101",
    status: "NO_SECADOR",
    tipo_cafe: "CEREJA DESCASCADO",
    data_entrada_secador: "2026-08-04",
    umidade: 11,
    talhao_id: null,
    talhao_ids: [],
    safra: 2026,
    lote_colheita: null,
    colheita_tipo: null,
    data_colheita_inicio: null,
    data_colheita_fim: null,
    data_entrada_terreiro: null,
    data_saida_terreiro: null,
    data_saida_secador: null,
    numero_tulha: null,
    data_beneficio: null,
    data_envio_cooperativa: null,
    numero_sacas: null,
    numero_lote_cooperativa: null,
    nf_remessa_cooperativa: null,
    observacoes: null,
  },
];

let talhoes: Talhao[] = [];
let vendas: Venda[] = [];

// Simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const mockDb = {
  // Fazendas
  async getFazendas() {
    await delay();
    return [...fazendas];
  },
  async createFazenda(data: Partial<Fazenda>) {
    await delay();
    const nova = { ...data, id: `f_${Date.now()}` } as Fazenda;
    fazendas.push(nova);
    return nova;
  },
  async updateFazenda(id: string, data: Partial<Fazenda>) {
    await delay();
    const idx = fazendas.findIndex((f) => f.id === id);
    if (idx > -1) {
      fazendas[idx] = { ...fazendas[idx], ...data };
    }
  },
  async deleteFazenda(id: string) {
    await delay();
    fazendas = fazendas.filter((f) => f.id !== id);
    lotes = lotes.filter((l) => l.fazenda_id !== id);
    vendas = vendas.filter((v) => v.fazenda_id !== id);
  },

  // Lotes
  async getLotes(fazendaId: string) {
    await delay();
    return lotes.filter(l => l.fazenda_id === fazendaId).sort((a, b) => b.id.localeCompare(a.id));
  },
  async createLote(data: Partial<Lote>) {
    await delay();
    const novo = { ...data, id: `l_${Date.now()}` } as Lote;
    lotes.push(novo);
    return novo;
  },
  async updateLote(id: string, data: Partial<Lote>) {
    await delay();
    const idx = lotes.findIndex((l) => l.id === id);
    if (idx > -1) {
      lotes[idx] = { ...lotes[idx], ...data };
    }
  },
  async deleteLote(id: string) {
    await delay();
    lotes = lotes.filter((l) => l.id !== id);
  },

  // Talhoes
  async getTalhoes(fazendaId: string) {
    await delay();
    return talhoes.filter(t => t.fazenda_id === fazendaId);
  },
  async createTalhao(data: Partial<Talhao>) {
    await delay();
    const novo = { ...data, id: `t_${Date.now()}` } as Talhao;
    talhoes.push(novo);
    return novo;
  },
  async deleteTalhao(id: string) {
    await delay();
    talhoes = talhoes.filter((t) => t.id !== id);
  },

  // Vendas
  async getVendas(fazendaId: string) {
    await delay();
    return vendas.filter(v => v.fazenda_id === fazendaId).sort((a, b) => b.id.localeCompare(a.id));
  },
  async createVenda(data: Partial<Venda>) {
    await delay();
    const nova = { ...data, id: `v_${Date.now()}` } as Venda;
    vendas.push(nova);
    return nova;
  },
  async updateVenda(id: string, data: Partial<Venda>) {
    await delay();
    const idx = vendas.findIndex((v) => v.id === id);
    if (idx > -1) {
      vendas[idx] = { ...vendas[idx], ...data };
    }
  },
  async deleteVenda(id: string) {
    await delay();
    vendas = vendas.filter((v) => v.id !== id);
  },
};
