import { Router } from "express";
import {
  getInversion,
  addInversion,
} from "../sheets.js";
import { calcularFilaInversion } from "../services/calculo.js";
import { asyncHandler, HttpError } from "../utils/errors.js";

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
      throw new HttpError(400,
        "Faltan campos: mes, importe_aportado y precio_participacion son obligatorios."
      );
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new HttpError(400, "El mes no es válido.");
    if (!(Number(importe_aportado) > 0) || !(Number(precio_participacion) > 0)) {
      throw new HttpError(400, "El importe y el precio deben ser mayores que cero.");
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
