/**
 * Consulta nome/marca de um produto industrializado pelo código de barras
 * na base pública Open Food Facts (gratuita, sem chave). Usado pelo
 * cadastro rápido no celular para pré-preencher o formulário.
 *
 * Só o código de barras sai do sistema. Qualquer falha externa (timeout,
 * fora do ar, produto inexistente) vira `{ found: false }` — o usuário
 * digita o nome manualmente e o cadastro segue normalmente.
 */

const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";
const LOOKUP_TIMEOUT_MS = 4000;

/** EAN-8, UPC-A (12), EAN-13 e GTIN-14 — só dígitos */
export const LOOKUP_BARCODE_PATTERN = /^\d{8,14}$/;

export interface BarcodeLookupResult {
  found: boolean;
  name?: string;
  brand?: string;
}

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    product_name_pt?: string;
    product_name?: string;
    brands?: string;
    quantity?: string;
  };
}

export async function lookupBarcodeInfo(
  barcode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BarcodeLookupResult> {
  if (!LOOKUP_BARCODE_PATTERN.test(barcode)) {
    return { found: false };
  }

  try {
    const url = `${OPEN_FOOD_FACTS_URL}/${barcode}.json?fields=product_name_pt,product_name,brands,quantity`;
    const response = await fetchImpl(url, {
      headers: { "User-Agent": "MeuMercadinho/1.0 (sistema de gestao)" },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) return { found: false };

    const body = (await response.json()) as OpenFoodFactsResponse;
    const product = body.status === 1 ? body.product : undefined;
    const baseName = (product?.product_name_pt || product?.product_name || "").trim();
    if (!baseName) return { found: false };

    const brand = product?.brands?.split(",")[0]?.trim() || undefined;
    const quantity = product?.quantity?.trim();

    // A base costuma trazer só a variante ("Tradicional"); com a marca o nome fica reconhecível no PDV
    let name = baseName;
    if (brand && !name.toLowerCase().includes(brand.toLowerCase())) name = `${brand} ${name}`;
    if (quantity && !name.toLowerCase().includes(quantity.toLowerCase())) name = `${name} ${quantity}`;

    return { found: true, name, brand };
  } catch {
    return { found: false };
  }
}
