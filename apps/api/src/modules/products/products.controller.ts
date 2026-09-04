import type { Request, Response } from "express";
import { createProductSchema, listProductsQuerySchema, updateProductSchema } from "./products.schema.js";
import * as productsService from "./products.service.js";
import { suggestSalePrice } from "../../shared/pricing.js";

export async function createProductHandler(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await productsService.createProduct(input, req.user!.id);
  res.status(201).json({ product });
}

export async function listProductsHandler(req: Request, res: Response) {
  const query = listProductsQuerySchema.parse(req.query);
  const result = await productsService.listProducts(query);
  res.status(200).json(result);
}

export async function getProductByBarcodeHandler(req: Request, res: Response) {
  const product = await productsService.getProductByBarcode(req.params.barcode);
  if (!product) {
    return res.status(404).json({ error: "Produto não cadastrado." });
  }
  res.status(200).json({ product });
}

export async function updateProductHandler(req: Request, res: Response) {
  const input = updateProductSchema.parse(req.body);
  const product = await productsService.updateProduct(req.params.id, input, req.user!.id);
  res.status(200).json({ product });
}

export async function getPriceHistoryHandler(req: Request, res: Response) {
  const history = await productsService.getPriceHistory(req.params.id);
  res.status(200).json({ history });
}

export async function suggestPriceHandler(req: Request, res: Response) {
  const cost = Number(req.query.cost);
  const margin = Number(req.query.margin);
  if (Number.isNaN(cost) || Number.isNaN(margin)) {
    return res.status(422).json({ error: "Informe 'cost' e 'margin' como números." });
  }
  res.status(200).json({ suggestedPrice: suggestSalePrice(cost, margin) });
}
