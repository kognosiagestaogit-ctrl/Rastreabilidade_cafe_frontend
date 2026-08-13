import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Tractor, Coffee, ShoppingCart, LogOut, User, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { FazendaSwitcher } from "./fazenda-switcher";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ConfigDialog } from "./config-dialog";
import { useState } from "react";

const items = [
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Fazendas", url: "/fazendas", icon: Tractor },
  { title: "Rastreabilidade", url: "/lotes", icon: Coffee },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight text-sidebar-foreground">
              Gestão Pedra Negra
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">Rastreabilidade & Vendas</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Fazenda</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <FazendaSwitcher />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} size="lg">
                      <Link to={item.url} className="gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="text-[15px]">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" onClick={() => setConfigOpen(true)}>
                  <Settings className="h-5 w-5" />
                  <span className="text-[15px]">Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-primary/20 text-sidebar-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user.nome}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/70">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Sair da conta"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      )}
      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </Sidebar>
  );
}
