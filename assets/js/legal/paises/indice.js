// =============================================================================
// Países donde vende la tienda (paso 3 del asistente): los de habla hispana de
// América y Brasil. Solo se pueden elegir los "disponibles" (con su módulo,
// ej. co.js). Para sumar uno: escribir su módulo, importarlo aquí, ponerle
// estado "disponible" y cambiar legal_faltantes() (0016) con una migración nueva.
// =============================================================================

import CO from "./co.js";
import { t } from "../../i18n/i18n.js";

// Lo que se muestra en el paso 3 (en el idioma en uso; se traduce al leerlo).
// El nombre de cada país que se muestra es t(`pais.${codigo}`); `nombre` queda
// en español (dato fijo).
export const ESTADOS = {
  get disponible() { return t("legal.estado.disponible"); },
  get proximamente() { return t("legal.estado.proximamente"); },
  get portugues() { return t("legal.estado.portugues"); }
};

export const PAISES = [
  { codigo: "ar", nombre: "Argentina", estado: "proximamente" },
  { codigo: "bo", nombre: "Bolivia", estado: "proximamente" },
  { codigo: "br", nombre: "Brasil", estado: "portugues", get nota() { return t("legal.pais.nota.br"); } },
  { codigo: "cl", nombre: "Chile", estado: "proximamente" },
  { codigo: "co", nombre: "Colombia", estado: "disponible", modulo: CO },
  { codigo: "cr", nombre: "Costa Rica", estado: "proximamente" },
  { codigo: "cu", nombre: "Cuba", estado: "proximamente" },
  { codigo: "ec", nombre: "Ecuador", estado: "proximamente" },
  { codigo: "sv", nombre: "El Salvador", estado: "proximamente" },
  { codigo: "gt", nombre: "Guatemala", estado: "proximamente" },
  { codigo: "hn", nombre: "Honduras", estado: "proximamente" },
  { codigo: "mx", nombre: "México", estado: "proximamente" },
  { codigo: "ni", nombre: "Nicaragua", estado: "proximamente" },
  { codigo: "pa", nombre: "Panamá", estado: "proximamente" },
  { codigo: "py", nombre: "Paraguay", estado: "proximamente" },
  { codigo: "pe", nombre: "Perú", estado: "proximamente" },
  { codigo: "do", nombre: "República Dominicana", estado: "proximamente" },
  { codigo: "uy", nombre: "Uruguay", estado: "proximamente" },
  { codigo: "ve", nombre: "Venezuela", estado: "proximamente" }
];

export const CODIGOS_PAISES = PAISES.map((p) => p.codigo);
export const PAISES_DISPONIBLES = PAISES.filter((p) => p.estado === "disponible").map((p) => p.codigo);

export function modulosDe(codigos) {
  return PAISES.filter((p) => codigos?.includes(p.codigo) && p.modulo).map((p) => p.modulo);
}

// Tipos de documento de los países elegidos (sin repetir clave).
export function documentosDe(codigos) {
  const lista = [];
  for (const m of modulosDe(codigos?.length ? codigos : PAISES_DISPONIBLES)) {
    for (const d of m.documentos) if (!lista.some((x) => x.clave === d.clave)) lista.push(d);
  }
  return lista;
}
