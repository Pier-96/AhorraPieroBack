import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { config } from "./config.js";

const SHEETS = {
  movimientos: "Movimientos",
  resumen: "Resumen_Mensual",
  inversion: "Inversion",
  configuracion: "Configuracion",
};

let _doc = null;

function getAuth() {
  if (!config.googleCredentials) {
    throw new Error(
      "Faltan las credenciales de Google Sheets. Configura GOOGLE_CREDENTIALS_JSON (o GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY) y GOOGLE_SHEET_ID."
    );
  }
  return new JWT({
    email: config.googleCredentials.client_email,
    key: config.googleCredentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function getDoc() {
  if (_doc) return _doc;
  if (!config.googleSheetId) {
    throw new Error("Falta GOOGLE_SHEET_ID.");
  }
  const doc = new GoogleSpreadsheet(config.googleSheetId, getAuth());
  await doc.loadInfo();
  _doc = doc;
  return doc;
}

export async function getSheet(title = SHEETS.movimientos) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    throw new Error(`La pestaña "${title}" no existe en el Google Sheet.`);
  }
  return sheet;
}

export function sheetTitles() {
  return SHEETS;
}

function toNumber(v) {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function toBool(v) {
  return v === "sí" || v === "SI" || v === "true" || v === true;
}

export async function addMovimientos(rows) {
  const sheet = await getSheet(SHEETS.movimientos);
  const toAdd = rows.map((r) => ({
    fecha: r.fecha,
    concepto: r.concepto,
    importe: r.importe,
    categoria: r.categoria,
    subcategoria: r.subcategoria ?? "",
    tipo: r.tipo,
    revisado: "no",
  }));
  await sheet.addRows(toAdd);
  return toAdd.length;
}

export async function getMovimientos(mes) {
  const sheet = await getSheet(SHEETS.movimientos);
  const rows = await sheet.getRows();
  return rows
    .filter((r) => !mes || String(r.get("fecha") || "").startsWith(mes))
    .map((r) => ({
      id: r.rowNumber,
      fecha: r.get("fecha"),
      concepto: r.get("concepto"),
      importe: toNumber(r.get("importe")),
      categoria: r.get("categoria"),
      subcategoria: r.get("subcategoria") || null,
      tipo: r.get("tipo"),
      revisado: toBool(r.get("revisado")),
    }));
}

export async function updateMovimiento(id, patch) {
  const sheet = await getSheet(SHEETS.movimientos);
  const rows = await sheet.getRows();
  const row = rows.find((r) => r.rowNumber === Number(id));
  if (!row) throw new Error("Movimiento no encontrado");
  if (patch.categoria !== undefined) row.set("categoria", patch.categoria);
  if (patch.subcategoria !== undefined)
    row.set("subcategoria", patch.subcategoria ?? "");
  if (patch.revisado !== undefined)
    row.set("revisado", patch.revisado ? "sí" : "no");
  await row.save();
  return {
    id: row.rowNumber,
    fecha: row.get("fecha"),
    concepto: row.get("concepto"),
    importe: toNumber(row.get("importe")),
    categoria: row.get("categoria"),
    subcategoria: row.get("subcategoria") || null,
    tipo: row.get("tipo"),
    revisado: toBool(row.get("revisado")),
  };
}

export async function getConfiguracion() {
  const sheet = await getSheet(SHEETS.configuracion);
  const rows = await sheet.getRows();

  let salario = null;
  let aportacion = null;
  let alquilerMiParte = null;

  if (rows.length) {
    const r = rows[0];
    if (r.get("salario_neto_mensual") !== undefined)
      salario = toNumber(r.get("salario_neto_mensual"));
    if (r.get("aportacion_fija_inversion") !== undefined)
      aportacion = toNumber(r.get("aportacion_fija_inversion"));
    if (r.get("alquiler_mi_parte") !== undefined)
      alquilerMiParte = toNumber(r.get("alquiler_mi_parte"));
  }

  for (const r of rows) {
    const clave = r.get("clave") || r.get("key");
    const valor = r.get("valor") ?? r.get("value");
    if (clave === "salario_neto_mensual" && salario === null)
      salario = toNumber(valor);
    if (clave === "aportacion_fija_inversion" && aportacion === null)
      aportacion = toNumber(valor);
    if (clave === "alquiler_mi_parte" && alquilerMiParte === null)
      alquilerMiParte = toNumber(valor);
  }

  if (salario === null) salario = 0;
  if (aportacion === null) aportacion = config.fixedInversion;
  if (alquilerMiParte === null) alquilerMiParte = 0;

  return {
    salario_neto_mensual: salario,
    aportacion_fija_inversion: aportacion,
    alquiler_mi_parte: alquilerMiParte,
  };
}

export async function getResumenMensual() {
  const sheet = await getSheet(SHEETS.resumen);
  const rows = await sheet.getRows();
  return rows.map((r) => ({
    mes: r.get("mes"),
    ingresos: toNumber(r.get("ingresos")),
    gastos_totales: toNumber(r.get("gastos_totales")),
    gastos_extraordinarios: toNumber(r.get("gastos_extraordinarios")),
    ahorro_liquido: toNumber(r.get("ahorro_liquido")),
    aportacion_inversion: toNumber(r.get("aportacion_inversion")),
    transferencias_ahorro: toNumber(r.get("transferencias_ahorro")),
  }));
}

export async function upsertResumenMensual(mes, valores) {
  const sheet = await getSheet(SHEETS.resumen);
  const rows = await sheet.getRows();
  const existing = rows.find((r) => r.get("mes") === mes);
  if (existing) {
    existing.set("ingresos", valores.ingresos);
    existing.set("gastos_totales", valores.gastos_totales);
    existing.set("gastos_extraordinarios", valores.gastos_extraordinarios);
    existing.set("ahorro_liquido", valores.ahorro_liquido);
    existing.set("aportacion_inversion", valores.aportacion_inversion);
    existing.set("transferencias_ahorro", valores.transferencias_ahorro);
    await existing.save();
    return existing.rowNumber;
  }
  await sheet.addRow({ mes, ...valores });
  return null;
}

export async function getInversion() {
  const sheet = await getSheet(SHEETS.inversion);
  const rows = await sheet.getRows();
  return rows.map((r) => ({
    mes: r.get("mes"),
    importe_aportado: toNumber(r.get("importe_aportado")),
    precio_participacion: toNumber(r.get("precio_participacion")),
    participaciones_compradas: toNumber(r.get("participaciones_compradas")),
    participaciones_totales: toNumber(r.get("participaciones_totales")),
    valor_actual: toNumber(r.get("valor_actual")),
    rentabilidad_acumulada: toNumber(r.get("rentabilidad_acumulada")),
  }));
}

export async function addInversion(row) {
  const sheet = await getSheet(SHEETS.inversion);
  await sheet.addRow(row);
  return row;
}

export async function getMeses() {
  const sheet = await getSheet(SHEETS.movimientos);
  const rows = await sheet.getRows();
  const set = new Set();
  for (const r of rows) {
    const f = r.get("fecha");
    if (f && String(f).length >= 7) set.add(String(f).slice(0, 7));
  }
  return [...set].sort();
}
