export interface Category {
  id: string;
  name: string;
  active: boolean;
  _count?: { products: number };
}

export type UnitOfMeasure = "UN" | "CX" | "FD" | "PCT" | "L" | "ML" | "G" | "KG";

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  category: { id: string; name: string };
  brand?: string | null;
  unit: UnitOfMeasure;
  costPrice: string;
  salePrice: string;
  profitMargin: string;
  stockQuantity: number;
  minStockQuantity: number;
  expirationDate?: string | null;
  batch?: string | null;
  barcode: string;
  sku: string;
  active: boolean;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export type StockMovementType =
  | "ENTRADA"
  | "VENDA"
  | "CANCELAMENTO"
  | "DEVOLUCAO"
  | "AJUSTE"
  | "INVENTARIO";

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string; barcode: string };
  user: { id: string; fullName: string };
}

export interface InventoryItem {
  id: string;
  productId: string;
  expectedQty: number;
  countedQty: number;
  difference: number;
  product: { id: string; name: string; sku: string; barcode: string };
}

export interface Inventory {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  items: InventoryItem[];
}

export interface PurchaseLineResult {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  previousCost: number;
  newStock: number;
  suggestedSalePrice: number;
}

export interface Purchase {
  id: string;
  totalValue: string;
  createdAt: string;
  user: { fullName: string };
  items: {
    id: string;
    quantity: number;
    unitCost: string;
    batch?: string | null;
    expirationDate?: string | null;
    total: string;
    product: { name: string; sku: string };
  }[];
}

export type CashierSessionStatus = "ABERTO" | "FECHADO";
export type CashMovementType = "SANGRIA" | "SUPRIMENTO";

export interface CashierSession {
  id: string;
  status: CashierSessionStatus;
  openingAmount: string;
  openedAt: string;
  closingCountedCash?: string | null;
  closingExpectedCash?: string | null;
  closingDifference?: string | null;
  closedAt?: string | null;
  user: { fullName: string };
}

export interface CashierTotals {
  totalSold: number;
  paymentTotals: { DINHEIRO: number; PIX: number; DEBITO: number; CREDITO: number };
  sangrias: number;
  suprimentos: number;
  expectedCash: number;
}

export type PaymentMethod = "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO";

export interface SalePaymentInput {
  method: PaymentMethod;
  amount: number;
}

export interface SaleResult {
  sale: { id: string; number: number };
  total: number;
  subtotal: number;
  discountValue: number;
  changeAmount: number | null;
  receivedAmount: number | null;
}

export type SaleStatus = "CONCLUIDA" | "CANCELADA" | "DEVOLVIDA_PARCIAL" | "DEVOLVIDA_TOTAL";

export interface SaleItemDetail {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  returned: boolean;
  returnedQuantity: number;
  soldWithoutStock: boolean;
  product: { name: string; sku: string; barcode: string };
}

export interface SaleDetail {
  id: string;
  number: number;
  status: SaleStatus;
  subtotal: string;
  discountValue: string;
  total: string;
  receivedAmount: string | null;
  changeAmount: string | null;
  cancelReason: string | null;
  createdAt: string;
  user: { fullName: string };
  items: SaleItemDetail[];
  payments: { method: PaymentMethod; amount: string }[];
}

export interface DashboardSummary {
  today: {
    faturamento: number;
    quantidadeVendas: number;
    lucroEstimado: number;
    ticketMedio: number;
  };
  estoque: {
    totalProdutos: number;
    estoqueBaixo: number;
    semEstoque: number;
    estoqueNegativo: number;
    vencendoEmBreve: number;
    vencidos: number;
  };
  caixa:
    | { status: "FECHADO" }
    | ({ status: "ABERTO"; openingAmount: number } & CashierTotals);
  alertas: {
    estoqueBaixo: boolean;
    semEstoque: boolean;
    estoqueNegativo: boolean;
    produtosVencidos: boolean;
    produtosVencendo: boolean;
    backup: boolean;
  };
}

export type ReportPreset = "hoje" | "ontem" | "ultimos_7_dias" | "este_mes" | "mes_anterior";

export interface ReportPeriod {
  preset?: ReportPreset;
  from?: string;
  to?: string;
}

export interface FinancialReport {
  period: { start: string; end: string };
  faturamentoBruto: number;
  descontos: number;
  faturamentoLiquido: number;
  cpv: number;
  lucroEstimado: number;
  quantidadeVendas: number;
  ticketMedio: number;
}

export interface PaymentBreakdownItem {
  method: PaymentMethod;
  total: number;
}

export interface UserSalesItem {
  userId: string;
  fullName: string;
  quantidadeVendas: number;
  faturamento: number;
}

export interface ProductSalesItem {
  productId: string;
  name: string;
  quantidadeVendida: number;
  faturamento: number;
  lucroEstimado: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; fullName: string } | null;
}

export interface ParsedProductRow {
  name: string;
  description?: string;
  categoryName: string;
  brand?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  profitMargin?: number;
  stockQuantity: number;
  minStockQuantity: number;
  expirationDate?: string;
  batch?: string;
  barcode: string;
  sku?: string;
}

export interface ValidatedImportRow {
  rowNumber: number;
  data: ParsedProductRow | null;
  errors: string[];
}

export interface ImportPreviewResult {
  rows: ValidatedImportRow[];
  summary: { total: number; valid: number; invalid: number };
}

export interface ImportCommitResult {
  created: number;
  skipped: number;
  results: { rowIndex: number; name: string; status: "created" | "error"; error?: string }[];
}

export interface StoreSettings {
  id: number;
  storeName: string;
  shortName?: string | null;
  document?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  defaultMargin: string;
  maxDiscountPercent: string;
  sessionTimeoutMin: number;
  backupDayOfWeek: number;
  backupHour: number;
}

export type BackupStatus = "SUCESSO" | "FALHA";

export interface BackupLogEntry {
  id: string;
  status: BackupStatus;
  fileName: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
}
