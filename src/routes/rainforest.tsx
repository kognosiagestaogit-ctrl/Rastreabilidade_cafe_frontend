import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rainforest")({
  beforeLoad: () => {
    throw redirect({ to: "/vendas", search: { visao: "rainforest" } });
  },
  component: () => null,
});