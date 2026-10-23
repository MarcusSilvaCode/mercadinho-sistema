import { formatCurrency } from "./format";
import type { AuditLogEntry } from "./types";

// Mesma lista fixa do enum AuditAction do schema — não muda em runtime.
export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Entrou no sistema",
  LOGOUT: "Saiu do sistema",
  LOGIN_FALHOU: "Tentativa de login falhou",
  VENDA_CRIADA: "Venda",
  VENDA_CANCELADA: "Venda cancelada",
  VENDA_DEVOLVIDA: "Devolução",
  DESCONTO_APLICADO: "Desconto",
  PRECO_ALTERADO: "Preço alterado",
  PRODUTO_CRIADO: "Produto criado",
  PRODUTO_ALTERADO: "Produto alterado",
  PRODUTO_INATIVADO: "Produto inativado",
  CATEGORIA_CRIADA: "Categoria criada",
  CATEGORIA_ALTERADA: "Categoria alterada",
  CATEGORIA_INATIVADA: "Categoria inativada",
  ENTRADA_ESTOQUE: "Entrada de mercadoria",
  AJUSTE_ESTOQUE: "Ajuste de estoque",
  INVENTARIO_REALIZADO: "Inventário",
  VENDA_SEM_ESTOQUE_AUTORIZADA: "Venda sem estoque autorizada",
  CAIXA_ABERTO: "Caixa aberto",
  CAIXA_FECHADO: "Caixa fechado",
  SANGRIA_REGISTRADA: "Sangria",
  SUPRIMENTO_REGISTRADO: "Suprimento",
  CONFIGURACAO_ALTERADA: "Configuração",
  SENHA_REDEFINIDA: "Senha alterada",
  IMPORTACAO_PRODUTOS: "Importação de produtos",
  BACKUP_EXECUTADO: "Backup",
};

export const ENTITY_LABELS: Record<string, string> = {
  Product: "Produtos",
  Category: "Categorias",
  Sale: "Vendas",
  User: "Usuários",
  CashierSession: "Caixa",
  Inventory: "Inventário",
  Purchase: "Entradas",
};

export type AuditTone = "neutral" | "brand" | "success" | "warning" | "danger";

export function auditTone(action: string): AuditTone {
  if (["LOGIN_FALHOU", "VENDA_CANCELADA"].includes(action)) return "danger";
  if (["AJUSTE_ESTOQUE", "VENDA_SEM_ESTOQUE_AUTORIZADA", "DESCONTO_APLICADO", "VENDA_DEVOLVIDA", "SANGRIA_REGISTRADA"].includes(action))
    return "warning";
  if (["VENDA_CRIADA", "CAIXA_ABERTO", "ENTRADA_ESTOQUE"].includes(action)) return "success";
  if (["LOGIN", "LOGOUT"].includes(action)) return "neutral";
  return "brand";
}

type Details = Record<string, unknown>;

const money = (v: unknown) => (typeof v === "number" || typeof v === "string" ? formatCurrency(Number(v)) : "");
const plural = (n: unknown, one: string, many: string) => `${n} ${Number(n) === 1 ? one : many}`;

/** Transforma o registro técnico numa frase que o dono da loja entende. */
export function describeAudit(log: AuditLogEntry): string {
  const d = (log.details ?? {}) as Details;
  switch (log.action) {
    case "LOGIN_FALHOU":
      return d.motivo === "usuario_inativo" ? "Usuário desativado tentou entrar" : "Senha incorreta";
    case "VENDA_CRIADA":
      return `${plural(d.itens, "item", "itens")} · ${money(d.total)}`;
    case "VENDA_CANCELADA":
      return `Motivo: ${d.reason ?? "não informado"}`;
    case "VENDA_DEVOLVIDA":
      return `Motivo: ${d.reason ?? "não informado"}`;
    case "DESCONTO_APLICADO":
      return d.discountPercent ? `${d.discountPercent}% na venda` : `${money(d.discountValue)} na venda`;
    case "PRODUTO_CRIADO":
      return String(d.name ?? "");
    case "PRECO_ALTERADO": {
      const precos = (d.precos as { field: string; oldValue: number; newValue: number }[] | undefined) ?? [];
      return precos
        .map((p) => `${p.field === "salePrice" ? "Venda" : "Custo"}: ${money(p.oldValue)} → ${money(p.newValue)}`)
        .join(" · ");
    }
    case "PRODUTO_ALTERADO":
    case "CATEGORIA_ALTERADA":
      return "Dados atualizados";
    case "CATEGORIA_CRIADA":
      return String(d.name ?? "");
    case "ENTRADA_ESTOQUE":
      return `${plural(d.itens, "produto", "produtos")} · ${money(d.total)}`;
    case "AJUSTE_ESTOQUE":
      return `${d.previousStock} → ${d.newStock} · ${d.reason ?? ""}`;
    case "INVENTARIO_REALIZADO":
      return plural(d.itensContados, "produto contado", "produtos contados");
    case "VENDA_SEM_ESTOQUE_AUTORIZADA":
      return `Estoque ficou em ${d.newStock}`;
    case "CAIXA_ABERTO":
      return `Troco inicial ${money(d.openingAmount)}`;
    case "CAIXA_FECHADO": {
      const diff = Number(d.difference ?? 0);
      const diffText = diff === 0 ? "sem diferença" : `diferença de ${money(diff)}`;
      return `Contado ${money(d.countedCash)} · ${diffText}`;
    }
    case "SANGRIA_REGISTRADA":
    case "SUPRIMENTO_REGISTRADO":
      return `${money(d.amount)}${d.reason ? ` · ${d.reason}` : ""}`;
    case "SENHA_REDEFINIDA":
      return d.operacao === "troca_propria_senha" ? "Trocou a própria senha" : "Senha redefinida por um administrador";
    case "CONFIGURACAO_ALTERADA":
      if (d.operacao === "criacao_usuario") return `Novo usuário: @${d.username}`;
      if (d.operacao === "atualizacao_usuario") {
        const alt = (d.alteracoes ?? {}) as Details;
        if (alt.active === false) return "Usuário desativado";
        if (alt.active === true) return "Usuário reativado";
        return "Usuário atualizado";
      }
      return "Configurações da loja atualizadas";
    case "IMPORTACAO_PRODUTOS":
      return `${plural(d.created, "produto criado", "produtos criados")} de ${d.total}`;
    case "BACKUP_EXECUTADO":
      return d.sucesso === false ? "Falhou" : "Concluído";
    default:
      return "";
  }
}
