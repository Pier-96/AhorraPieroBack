import { config } from "../config.js";

export function calcularResumenMensual(movimientos, configuracion) {
  const salario = configuracion.salario_neto_mensual || 0;
  const aportacionFija = configuracion.aportacion_fija_inversion || config.fixedInversion;
  const alquilerMiParte = configuracion.alquiler_mi_parte || 0;

  let gastosTotales = 0;
  let gastosExtra = 0;
  let ingresos = 0;
  let alquilerExtraido = 0;
  let transferenciasSalida = 0;

  for (const m of movimientos) {
    const cat = m.categoria;
    const importe = m.importe;

    if (cat === "Transferencia") {
      if (importe < 0) transferenciasSalida += Math.abs(importe);
      continue;
    }

    const esExtra = cat === "Viajes" || cat === "Regalos";
    const esIngreso = m.tipo === "ingreso" || cat === "Ingreso";

    if (esIngreso) {
      if (cat === "Ingreso" || importe > 0) ingresos += importe;
      continue;
    }
    if (cat === "Alquiler") {
      alquilerExtraido += Math.abs(importe);
      continue;
    }
    if (esExtra) {
      gastosExtra += Math.abs(importe);
    } else {
      gastosTotales += Math.abs(importe);
    }
  }

  const alquilerAjustado = alquilerMiParte > 0 ? alquilerMiParte : alquilerExtraido;
  gastosTotales += alquilerAjustado;

  const disponible = salario - gastosTotales;
  const aportacion = Math.min(aportacionFija, disponible);
  const ahorroLiquido = disponible - aportacion - transferenciasSalida;

  return {
    ingresos: round2(ingresos),
    gastos_totales: round2(gastosTotales),
    gastos_extraordinarios: round2(gastosExtra),
    ahorro_liquido: round2(ahorroLiquido),
    aportacion_inversion: round2(aportacion),
    transferencias_ahorro: round2(transferenciasSalida),
    salario_neto: round2(salario),
  };
}

export function calcularFilaInversion(historial, payload) {
  const importe = Number(payload.importe_aportado);
  const precio = Number(payload.precio_participacion);
  if (!(precio > 0)) throw new Error("El precio de participación debe ser > 0.");

  const prev = historial
    .filter((r) => r.mes < payload.mes)
    .sort((a, b) => (a.mes < b.mes ? 1 : -1))[0];

  const compradas = importe / precio;
  const totales = (prev?.participaciones_totales || 0) + compradas;
  const valorActual = totales * precio;

  const aportadoAcumulado =
    historial
      .filter((r) => r.mes <= payload.mes)
      .reduce((acc, r) => acc + r.importe_aportado, 0) + importe;

  const rentabilidad = valorActual - aportadoAcumulado;

  return {
    mes: payload.mes,
    importe_aportado: round2(importe),
    precio_participacion: round2(precio),
    participaciones_compradas: round2(compradas),
    participaciones_totales: round2(totales),
    valor_actual: round2(valorActual),
    rentabilidad_acumulada: round2(rentabilidad),
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
