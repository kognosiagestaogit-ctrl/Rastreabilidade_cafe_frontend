import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Tractor, Coffee, ShoppingCart, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { FazendaSwitcher } from "./fazenda-switcher";

const items = [
  { title: "Painel", url: "/", icon: LayoutDashboard },
  { title: "Fazendas", url: "/fazendas", icon: Tractor },
  { title: "Rastreabilidade", url: "/lotes", icon: Coffee },
  { title: "Vendas", url: "/vendas", icon: ShoppingCart },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

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
            <p className="truncate text-xs text-sidebar-foreground/70">
              Rastreabilidade & Vendas
            </p>
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
                const active =
                  item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}