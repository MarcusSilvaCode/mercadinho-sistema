import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Home,
  Package,
  Receipt,
  ScanBarcode,
  ScanLine,
  Settings,
  ShieldCheck,
  Tags,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { TileBand } from "../ui/Layout";
import { useStoreSettings } from "../../store/storeSettings";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Agrupado por tarefa: o dia a dia do balcão primeiro, administração por último
const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: "/", label: "Início", icon: Home, end: true }] },
  {
    title: "Vender",
    items: [
      { to: "/pdv", label: "PDV", icon: ScanBarcode },
      { to: "/vendas", label: "Vendas", icon: Receipt },
      { to: "/caixa", label: "Caixa", icon: Wallet },
    ],
  },
  {
    title: "Produtos",
    items: [
      { to: "/produtos", label: "Produtos", icon: Package, end: true },
      { to: "/produtos/cadastro-rapido", label: "Cadastro rápido", icon: ScanLine },
      { to: "/categorias", label: "Categorias", icon: Tags },
      { to: "/estoque", label: "Estoque", icon: Boxes, end: true },
      { to: "/entradas", label: "Entradas", icon: Truck },
      { to: "/estoque/inventario", label: "Inventário", icon: ClipboardList },
    ],
  },
  { title: "Gestão", items: [{ to: "/relatorios", label: "Relatórios", icon: BarChart3 }] },
  {
    title: "Sistema",
    items: [
      { to: "/usuarios", label: "Usuários", icon: Users },
      { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const storeName = useStoreSettings((s) => s.storeName);

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 z-40 bg-ink-900/40 md:hidden" aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[264px] flex-col bg-brand-500 text-white transition-transform duration-200 md:static md:z-auto md:w-[248px] md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <TileBand columns={8} rows={1} />

        <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-5">
          <span className="font-display text-xl font-extrabold leading-tight tracking-tight">{storeName}</span>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="mt-4 first:mt-1">
              {group.title && (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        isActive ? "bg-white text-brand-600" : "text-white/85 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={2} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
