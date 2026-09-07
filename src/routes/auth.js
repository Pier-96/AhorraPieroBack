import { Router } from "express";
import { createSession, requireAuth, verifyPassword } from "../auth.js";
import { HttpError } from "../utils/errors.js";

const router = Router();
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, startedAt: now };
  if (now - entry.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 0, startedAt: now });
    return next();
  }
  if (entry.count >= MAX_ATTEMPTS) return next(new HttpError(429, "Demasiados intentos. Espera unos minutos."));
  return next();
}

router.post("/login", loginRateLimit, (req, res, next) => {
  const password = String(req.body?.password || "");
  if (!verifyPassword(password)) {
    const entry = attempts.get(req.ip) || { count: 0, startedAt: Date.now() };
    attempts.set(req.ip, { ...entry, count: entry.count + 1 });
    return next(new HttpError(401, "La contraseña no es correcta."));
  }
  attempts.delete(req.ip);
  return res.json({ token: createSession(), expiresIn: 12 * 60 * 60 });
});

router.get("/session", requireAuth, (req, res) => res.json({ authenticated: true }));

export default router;
