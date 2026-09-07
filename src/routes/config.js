import { Router } from "express";
import { getConfiguracion } from "../sheets.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const configuracion = await getConfiguracion();
    res.json(configuracion);
  })
);

export default router;
