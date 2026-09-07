import { Router } from "express";
import {
  getMovimientos,
  updateMovimiento,
} from "../sheets.js";
import { asyncHandler, HttpError } from "../utils/errors.js";

const router = Router();

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
    if (!Object.keys(patch).length) throw new HttpError(400, "No hay cambios para guardar.");
    if (patch.revisado !== undefined && typeof patch.revisado !== "boolean") {
      throw new HttpError(400, "El campo revisado debe ser verdadero o falso.");
    }
    const updated = await updateMovimiento(req.params.id, patch);
    res.json(updated);
  })
);

export default router;
