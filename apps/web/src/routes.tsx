import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { StockPage } from "./pages/StockPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { CashierPage } from "./pages/CashierPage";
import { PDVPage } from "./pages/PDVPage";
import { SalesPage } from "./pages/SalesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AuditPage } from "./pages/AuditPage";
import { ProductImportPage } from "./pages/ProductImportPage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/pdv", element: <PDVPage /> },
          { path: "/vendas", element: <SalesPage /> },
          { path: "/produtos", element: <ProductsPage /> },
          { path: "/produtos/importar", element: <ProductImportPage /> },
          { path: "/categorias", element: <CategoriesPage /> },
          { path: "/estoque", element: <StockPage /> },
          { path: "/estoque/inventario", element: <InventoryPage /> },
          {
            path: "/entradas",
            element: <PurchasesPage />,
          },
          { path: "/caixa", element: <CashierPage /> },
          { path: "/relatorios", element: <ReportsPage /> },
          { path: "/auditoria", element: <AuditPage /> },
          {
            path: "/configuracoes",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
]);
