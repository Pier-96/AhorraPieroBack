import { Router } from "express";
import {
  getInversion,
  addInversion,
} from "../sheets.js";
import { calcularFilaInversion } from "../services/calculo.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const inversion = await getInversion();
    res.json({ inversion });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { mes, importe_aportado, precio_participacion } = req.body || {};
    if (!mes || importe_aportado === undefined || precio_participacion === undefined) {
      throw new Error(
        "Faltan campos: mes, importe_aportado y precio_participacion son obligatorios."
      );
    }
    const historial = await getInversion();
    const fila = calcularFilaInversion(historial, {
      mes,
      importe_aportado,
      precio_participacion,
    });
    await addInversion(fila);
    res.status(201).json(fila);
  })
);

export default router;
