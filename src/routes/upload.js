import { Router } from "express";
import multer from "multer";
import { extractPdfText } from "../services/pdf.js";
import { extraerMovimientos } from "../services/ia.js";
import { addMovimientos } from "../sheets.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("El archivo debe ser un PDF."));
  },
});

router.post(
  "/",
  upload.single("pdf"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new Error("No se recibió ningún PDF.");
    if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
      throw new Error("El archivo no contiene un PDF válido.");
    }
    const texto = await extractPdfText(req.file.buffer);
    const movimientos = await extraerMovimientos(texto);
    const guardados = await addMovimientos(movimientos);
    res.json({
      message: `PDF procesado: ${guardados} movimientos guardados como no revisados.`,
      total: guardados,
    });
  })
);

export default router;
