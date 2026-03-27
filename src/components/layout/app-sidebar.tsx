"use client"

import { Link, NavLink, useMatch } from "react-router-dom"
import {
  ArrowDownUp,
  CreditCard,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Repeat,
  Tags,
} from "lucide-react"

import { ROUTES } from "@/constants/routes"
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
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.categorias, label: "Categorias", icon: Tags },
  { to: ROUTES.contas, label: "Contas", icon: Landmark },
  { to: ROUTES.cartoes, label: "Cartões", icon: CreditCard },
  { to: ROUTES.parcelamentos, label: "Parcelamentos", icon: HandCoins },
  { to: ROUTES.recorrencias, label: "Recorrências", icon: Repeat },
  { to: ROUTES.movimentacoes, label: "Entradas/Saídas", icon: ArrowDownUp },
] as const

function SidebarNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: (typeof NAV)[number]["icon"]
}) {
  const match = useMatch({ path: to, end: true })

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={!!match} tooltip={label}>
        <NavLink to={to}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Controle Financeiro"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to={ROUTES.dashboard}>
                <img
                  src="/favicon.svg"
                  alt=""
                  className="size-5 shrink-0 group-data-[collapsible=icon]:mx-auto"
                />
                <span
                  className="font-heading truncate font-semibold group-data-[collapsible=icon]:hidden"
                >
                  Controle Financeiro
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarNavItem key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
