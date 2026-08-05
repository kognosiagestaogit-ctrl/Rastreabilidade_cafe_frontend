import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ordem-servico")({
  beforeLoad: () => {
    throw redirect({ to: "/lotes" });
  },
});
