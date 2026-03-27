import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/app-shell"
import { ROUTES } from "@/constants/routes"
import { CategoriasPage } from "@/pages/categorias-page"
import { ContasPage } from "@/pages/contas-page"
import { CartoesPage } from "@/pages/cartoes-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { MovimentacoesPage } from "@/pages/movimentacoes-page"
import { ParceladasPage } from "@/pages/parceladas-page"
import { RecorrenciasPage } from "@/pages/recorrencias-page"

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<AppShell />}>
        <Route index element={<Navigate to={ROUTES.dashboard} replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="categorias" element={<CategoriasPage />} />
        <Route path="contas" element={<ContasPage />} />
        <Route path="cartoes" element={<CartoesPage />} />
        <Route path="parcelamentos" element={<ParceladasPage />} />
        <Route path="movimentacoes" element={<MovimentacoesPage />} />
        <Route path="recorrencias" element={<RecorrenciasPage />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  )
}
