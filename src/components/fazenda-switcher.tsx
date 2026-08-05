import { Check, ChevronsUpDown } from "lucide-react";
import { useFazendas } from "@/lib/fazenda-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FazendaSwitcher() {
  const { fazendas, fazendaAtual, setFazendaAtualId } = useFazendas();
  const [open, setOpen] = useState(false);

  if (fazendas.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-sidebar-foreground/70">
        Cadastre uma fazenda para começar.
      </p>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-12 w-full justify-between border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="truncate text-left">
            {fazendaAtual?.nome ?? "Selecionar fazenda"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {fazendas.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFazendaAtualId(f.id);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
              fazendaAtual?.id === f.id && "bg-accent/50 font-medium",
            )}
          >
            <Check
              className={cn(
                "h-4 w-4",
                fazendaAtual?.id === f.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="truncate">{f.nome}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}