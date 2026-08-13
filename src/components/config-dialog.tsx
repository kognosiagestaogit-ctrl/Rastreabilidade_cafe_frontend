import { useState } from "react";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");

  const handleSave = () => {
    // Aqui futuramente será chamada a API para salvar
    toast.success("Credenciais da Minasul salvas com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Configurações
          </DialogTitle>
          <DialogDescription>
            Gerencie as configurações e integrações da plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-lg border bg-secondary/30 p-4">
            <h3 className="mb-1 font-semibold text-foreground">Minasul credenciais</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Será usado para buscar dados automaticamente em minasul.
            </p>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="minasul-login">Login</Label>
                <Input
                  id="minasul-login"
                  placeholder="Digite o login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="minasul-senha">Senha</Label>
                <Input
                  id="minasul-senha"
                  type="password"
                  placeholder="Digite a senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" /> Salvar credenciais
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
