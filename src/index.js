import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { asyncHandler, errorMiddleware, notFound } from "./utils/errors.js";
import uploadRouter from "./routes/upload.js";
import movimientosRouter from "./routes/movimientos.js";
import resumenRouter from "./routes/resumen.js";
import inversionRouter from "./routes/inversion.js";
import configRouter from "./routes/config.js";

const app = express();
app.use(
  cors({
    origin: config.frontendOrigin
      ? [config.frontendOrigin, "http://localhost:5173"]
      : true,
  })
);
app.use(express.json());

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    res.json({ ok: true });
  })
);

app.use("/api/upload-pdf", uploadRouter);
app.use("/api/movimientos", movimientosRouter);
app.use("/api/resumen-mensual", resumenRouter);
app.use("/api/inversion", inversionRouter);
app.use("/api/config", configRouter);

app.use(notFound);
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`AhorraPiero backend escuchando en http://localhost:${config.port}`);
});
