import crypto from "node:crypto";
import { config } from "./config.js";
import { HttpError } from "./utils/errors.js";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  return crypto
    .createHmac("sha256", config.sessionSecret)
    .update(payload)
    .digest("base64url");
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSession() {
  if (!config.sessionSecret) throw new HttpError(503, "Falta SESSION_SECRET en la configuración del servidor.");
  const payload = base64url(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }));
  return `${payload}.${sign(payload)}`;
}

export function requireAuth(req, res, next) {
  if (!config.appPassword || !config.sessionSecret) {
    return next(new HttpError(503, "La protección de acceso no está configurada en el servidor."));
  }
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new HttpError(401, "Inicia sesión para continuar."));

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !secureEqual(signature, sign(payload))) {
    return next(new HttpError(401, "La sesión no es válida."));
  }

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!exp || Date.now() >= exp) throw new Error("expired");
  } catch {
    return next(new HttpError(401, "La sesión ha caducado."));
  }
  return next();
}

export function verifyPassword(password) {
  return Boolean(config.appPassword && secureEqual(password, config.appPassword));
}
