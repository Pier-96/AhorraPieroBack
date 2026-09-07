import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { asyncHandler, errorMiddleware, notFound } from "./utils/errors.js";
import uploadRouter from "./routes/upload.js";
import movimientosRouter from "./routes/movimientos.js";
import resumenRouter from "./routes/resumen.js";
import inversionRouter from "./routes/inversion.js";
import authRouter from "./routes/auth.js";
import { requireAuth } from "./auth.js";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      // Health checks no tienen Origin. En navegador aceptamos producción,
      // desarrollo y previews generados por el proyecto de Vercel.
      if (!origin) return callback(null, true);
      const isLocal = origin === "http://localhost:5173";
      const isProduction = origin === config.frontendOrigin;
      const isVercelPreview = /^https:\/\/ahorra-piero-[a-z0-9-]+\.vercel\.app$/i.test(origin);
      return callback(null, isLocal || isProduction || isVercelPreview);
    },
  })
);
app.use(express.json());

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    res.json({ ok: true });
  })
);

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api/upload-pdf", uploadRouter);
app.use("/api/movimientos", movimientosRouter);
app.use("/api/resumen-mensual", resumenRouter);
app.use("/api/inversion", inversionRouter);

app.use(notFound);
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`AhorraPiero backend escuchando en http://localhost:${config.port}`);
});
