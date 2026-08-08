import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { mockDb } from "./mock-db";
import type { Fazenda } from "./db-types";
import { applyFazendaPalette } from "./theme-palettes";

const STORAGE_KEY = "fazenda_atual_id";

type Ctx = {
  fazendas: Fazenda[];
  isLoading: boolean;
  fazendaAtual: Fazenda | null;
  setFazendaAtualId: (id: string) => void;
};

const FazendaContext = createContext<Ctx | null>(null);

export function FazendaProvider({ children }: { children: ReactNode }) {
  const [fazendaAtualId, setIdState] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["fazendas"],
    queryFn: async (): Promise<Fazenda[]> => {
      return await mockDb.getFazendas();
    },
  });

  const fazendas = data ?? [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && fazendas.some((f) => f.id === stored)) setIdState(stored);
    else if (fazendas.length > 0) setIdState(fazendas[0].id);
    else setIdState(null);
  }, [fazendas]);

  const setFazendaAtualId = (id: string) => {
    setIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const fazendaAtual = fazendas.find((f) => f.id === fazendaAtualId) ?? null;

  useEffect(() => {
    applyFazendaPalette(fazendaAtual?.cor);
  }, [fazendaAtual?.cor, fazendaAtual?.id]);

  return (
    <FazendaContext.Provider value={{ fazendas, isLoading, fazendaAtual, setFazendaAtualId }}>
      {children}
    </FazendaContext.Provider>
  );
}

export function useFazendas() {
  const ctx = useContext(FazendaContext);
  if (!ctx) throw new Error("useFazendas precisa estar dentro de FazendaProvider");
  return ctx;
}
