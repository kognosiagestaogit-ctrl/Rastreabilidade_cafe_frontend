/**
 * mock-db.ts — LEGADO
 * Este arquivo agora apenas re-exporta a camada real de API.
 * Mantido para compatibilidade retroativa com imports existentes.
 * @deprecated Prefira importar de "@/lib/api" diretamente.
 */
export { api as mockDb } from "./api";
