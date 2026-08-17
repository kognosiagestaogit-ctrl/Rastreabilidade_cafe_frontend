import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Coffee, Eye, EyeOff, Lock, Mail, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Gestão Pedra Negra" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!email.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    if (!password.trim()) {
      toast.error("Informe sua senha.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Login realizado com sucesso! Bem-vindo.");
      navigate({ to: "/" });
    } catch (err: any) {
      let errorMsg = "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
      
      // Tratamento para API offline/indisponível
      if (
        err.message && 
        (err.message.includes("Failed to fetch") || 
         err.message.includes("NetworkError") || 
         err.message.includes("Network request failed") ||
         err.message.includes("Servidor indisponível"))
      ) {
        errorMsg = "Servidor indisponível no momento. Verifique sua conexão ou tente novamente mais tarde.";
      }
      
      setLoginError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    const demoEmail = "admin@fazendapedranegra.com.br";
    const demoPassword = "admin123";
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
      toast.success("Acesso de demonstração ativado!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Erro no login demo. Verifique se o backend está rodando.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo & Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Coffee className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Fazenda Pedra Negra
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistema Integrado de Gestão Agrícola, Rastreabilidade & Vendas
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div className="rounded-2xl border bg-card/80 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginError && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20">
                {loginError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail de acesso
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@pedranegra.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-9"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9 pr-10"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(c) => setRememberMe(!!c)}
                />
                <label
                  htmlFor="remember"
                  className="text-xs font-medium text-muted-foreground cursor-pointer"
                >
                  Manter-me conectado
                </label>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full gap-2 text-base font-semibold shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Entrando..."
              ) : (
                <>
                  Entrar no sistema <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Fazenda Pedra Negra. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
