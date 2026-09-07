import { Router } from "express";
import {
  getMovimientos,
  updateMovimiento,
  getMeses,
} from "../sheets.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get(
  "/meses",
  asyncHandler(async (req, res) => {
    const meses = await getMeses();
    res.json({ meses });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const mes = req.query.mes || undefined;
    const movimientos = await getMovimientos(mes);
    res.json({ movimientos });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const patch = {};
    if (req.body.categoria !== undefined) patch.categoria = req.body.categoria;
    if (req.body.subcategoria !== undefined)
      patch.subcategoria = req.body.subcategoria;
    if (req.body.revisado !== undefined) patch.revisado = req.body.revisado;
    const updated = await updateMovimiento(req.params.id, patch);
    res.json(updated);
  })
);

export default router;
