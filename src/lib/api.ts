/**
 * api.ts
 * Camada de dados real — substitui o mock-db.ts.
 * Mantém a mesma interface pública (getFazendas, getLotes, etc.)
 * para que as páginas não precisem ser alteradas.
 */

import { apiClient } from "./api-client";
import type { Fazenda, Lote, Talhao, Venda } from "./db-types";

export const api = {
  // ── Fazendas ─────────────────────────────────────────────────────────────────
  getFazendas(): Promise<Fazenda[]> {
    return apiClient.get<Fazenda[]>("/api/fazendas");
  },

  createFazenda(data: Partial<Fazenda>): Promise<Fazenda> {
    return apiClient.post<Fazenda>("/api/fazendas", data);
  },

  updateFazenda(id: string, data: Partial<Fazenda>): Promise<Fazenda> {
    return apiClient.put<Fazenda>(`/api/fazendas/${id}`, data);
  },

  deleteFazenda(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/fazendas/${id}`);
  },

  // ── Talhões ──────────────────────────────────────────────────────────────────
  getTalhoes(fazendaId: string): Promise<Talhao[]> {
    return apiClient.get<Talhao[]>(`/api/fazendas/${fazendaId}/talhoes`);
  },

  createTalhao(data: Partial<Talhao> & { fazenda_id: string }): Promise<Talhao> {
    const { fazenda_id, ...body } = data;
    return apiClient.post<Talhao>(`/api/fazendas/${fazenda_id}/talhoes`, body);
  },

  deleteTalhao(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/talhoes/${id}`);
  },

  // ── Lotes ─────────────────────────────────────────────────────────────────────
  getLotes(fazendaId: string): Promise<Lote[]> {
    return apiClient.get<Lote[]>(`/api/fazendas/${fazendaId}/lotes`);
  },

  createLote(data: Partial<Lote>): Promise<Lote> {
    return apiClient.post<Lote>("/api/lotes", data);
  },

  updateLote(id: string, data: Partial<Lote>): Promise<Lote> {
    return apiClient.put<Lote>(`/api/lotes/${id}`, data);
  },

  deleteLote(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/lotes/${id}`);
  },

  // ── Vendas ────────────────────────────────────────────────────────────────────
  getVendas(fazendaId: string): Promise<Venda[]> {
    return apiClient.get<Venda[]>(`/api/fazendas/${fazendaId}/vendas`);
  },

  createVenda(data: Partial<Venda>): Promise<Venda> {
    return apiClient.post<Venda>("/api/vendas", data);
  },

  updateVenda(id: string, data: Partial<Venda>): Promise<Venda> {
    return apiClient.put<Venda>(`/api/vendas/${id}`, data);
  },

  deleteVenda(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/vendas/${id}`);
  },
};

// Alias de compatibilidade: o nome mockDb ainda é aceito nos imports existentes
// para evitar ter que alterar todas as páginas de uma só vez.
export { api as mockDb };
