import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanBarcode,
  ScanLine,
  Receipt,
  Package,
  Tags,
  Boxes,
  ClipboardList,
  Truck,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  Users,
  Store,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pdv", label: "PDV", icon: ScanBarcode },
  { to: "/vendas", label: "Vendas", icon: Receipt },
  { to: "/produtos", label: "Produtos", icon: Package, end: true },
  { to: "/produtos/cadastro-rapido", label: "Cadastro rápido", icon: ScanLine },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/estoque", label: "Estoque", icon: Boxes, end: true },
  { to: "/estoque/inventario", label: "Inventário", icon: ClipboardList },
  { to: "/entradas", label: "Entrada de mercadorias", icon: Truck },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay escuro atrás da gaveta — só existe no mobile, quando aberta */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink-900/50 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-surface-border bg-surface transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Store size={16} strokeWidth={2.25} />
            </div>
            <span className="text-sm font-semibold text-ink-900">Meu Mercadinho</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-muted md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
