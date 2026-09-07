import { Router } from "express";
import {
  getResumenMensual,
  getMovimientos,
  getConfiguracion,
  upsertResumenMensual,
} from "../sheets.js";
import { calcularResumenMensual } from "../services/calculo.js";
import { asyncHandler, HttpError } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const resumen = await getResumenMensual();
    res.json({ resumen });
  })
);

router.get(
  "/:mes",
  asyncHandler(async (req, res) => {
    const mes = req.params.mes;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new HttpError(400, "El mes no es válido.");
    const [movimientos, configuracion] = await Promise.all([
      getMovimientos(mes),
      getConfiguracion(),
    ]);
    const valores = calcularResumenMensual(movimientos, configuracion);
    res.json({ mes, found: movimientos.length > 0, ...valores });
  })
);

router.post(
  "/:mes",
  asyncHandler(async (req, res) => {
    const mes = req.params.mes;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new HttpError(400, "El mes no es válido.");
    const [movimientos, configuracion] = await Promise.all([
      getMovimientos(mes),
      getConfiguracion(),
    ]);
    const valores = calcularResumenMensual(movimientos, configuracion);
    await upsertResumenMensual(mes, valores);
    res.json({ mes, ...valores });
  })
);

export default router;
