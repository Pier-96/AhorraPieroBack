import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const SYSTEM_PROMPT = `Eres un asistente que extrae movimientos bancarios de un extracto de Imagin (España).

A partir del texto del extracto que te paso, devuelve ÚNICAMENTE un objeto JSON (sin texto
adicional, sin backticks) con la forma {"movimientos": [...]}. Cada movimiento debe tener:

{
  "fecha": "YYYY-MM-DD",
  "concepto": "texto original del movimiento",
  "importe": numero (negativo si es gasto, positivo si es ingreso),
  "categoria": "una de: Alquiler, Suministros, Alimentacion, Ocio, Transporte, Compras, Ropa, Salud, Viajes, Regalos, Varios, Ingreso, Transferencia",
  "subcategoria": "si la categoria es Suministros, indicar Luz, Agua, Gas o Internet. En cualquier otro caso, null."

Reglas:
- Si un mismo recibo de suministros incluye luz, agua y gas juntos, sepáralos en movimientos individuales con su importe correspondiente si el extracto lo detalla; si no se puede separar, usa subcategoria "Mixto".
- No calcules saldos ni totales, solo lista movimientos.
- Categoria "Transferencia": usa SOLO para movimientos entre las CUENTAS PROPIAS del usuario (p. ej. traspaso de saldo desde esta cuenta a otra cuenta de ahorro). NO son gasto ni ingreso. No esperes aqui ingresos de familiares, porque esos no aparecen en este extracto.
- El alquiler aparece cargado por el total (p. ej. 810). Categorialo siempre como "Alquiler"; NO intentes separar la parte que paga otro. La parte que realmente paga el usuario se ajusta automaticamente con la configuracion (alquiler_mi_parte), asi que no modifiques el importe.
- Si aparece un ingreso que no reconoces como salario ni como Transferencia propia, categorialo como "Ingreso".
- Si no puedes determinar la categoría con confianza, usa "Varios".`;

const CATEGORIAS_VALIDAS = new Set([
  "Alquiler",
  "Suministros",
  "Alimentacion",
  "Ocio",
  "Transporte",
  "Compras",
  "Ropa",
  "Salud",
  "Viajes",
  "Regalos",
  "Varios",
  "Ingreso",
  "Transferencia",
]);

function parseJson(texto) {
  let text = texto.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

export async function extraerMovimientos(texto) {
  if (!config.geminiApiKey) {
    throw new Error("Falta GEMINI_API_KEY en la configuración del servidor.");
  }

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(texto);
  const content = result.response.text();
  if (!content) throw new Error("Gemini no devolvió contenido.");

  const parsed = parseJson(content);
  const movimientos = parsed.movimientos;
  if (!Array.isArray(movimientos)) {
    throw new Error("La respuesta de Gemini no contiene un array 'movimientos'.");
  }

  return movimientos.map(normalizar).filter(Boolean);
}

function normalizar(m) {
  if (!m || !m.fecha || m.importe === undefined || m.importe === null) return null;
  const importe = Number(m.importe);
  if (Number.isNaN(importe)) return null;
  const categoria = CATEGORIAS_VALIDAS.has(m.categoria)
    ? m.categoria
    : "Varios";
  const subcategoria =
    categoria === "Suministros" ? m.subcategoria || null : null;
  return {
    fecha: String(m.fecha).slice(0, 10),
    concepto: String(m.concepto || "").slice(0, 500),
    importe,
    categoria,
    subcategoria: subcategoria || null,
    tipo: importe < 0 ? "gasto" : "ingreso",
  };
}
