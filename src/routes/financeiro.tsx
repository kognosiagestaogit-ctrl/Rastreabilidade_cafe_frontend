import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/financeiro")({
  beforeLoad: () => {
    throw redirect({ to: "/vendas", search: { visao: "receber" } });
  },
  component: () => null,
});