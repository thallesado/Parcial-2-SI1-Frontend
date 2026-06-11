"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PaginationControls } from "./PaginationControls";

// TABLA ADMIN - tabla reusable del panel: ordena columnas, pagina de 20 en 20 y conserva acciones por fila.
export function Table({ columns, rows, actions, compact = false, paginated = true, pageSize = 20 }: { columns: string[]; rows: Array<Record<string, unknown>>; actions?: (row: Record<string, unknown>) => ReactNode; compact?: boolean; paginated?: boolean; pageSize?: number }) {
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const sortedRows = useMemo(() => {
    if (!sort) return rows;

    return [...rows].sort((a, b) => {
      const left = a[sort.column];
      const right = b[sort.column];
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      const result = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)
        ? leftNumber - rightNumber
        : String(left ?? "").localeCompare(String(right ?? ""));

      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort]);
  const lastPage = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const visibleRows = paginated ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sortedRows;
  const from = sortedRows.length === 0 ? null : ((currentPage - 1) * pageSize) + 1;
  const to = sortedRows.length === 0 ? null : Math.min(currentPage * pageSize, sortedRows.length);

  function toggleSort(column: string) {
    setSort((current) => current?.column === column
      ? { column, direction: current.direction === "asc" ? "desc" : "asc" }
      : { column, direction: "asc" });
  }

  return (
    <div className="mt-6 rounded-lg bg-white shadow-sm">
      <div className="overflow-auto rounded-lg">
        <table className={`${compact ? "min-w-[980px]" : "min-w-[760px]"} w-full text-left text-sm`}>
          <thead className="bg-blue-700 text-white">
            <tr>
              {columns.map((column) => (
                <th key={column} className={`${column.endsWith("_id") ? "w-16 px-2" : "px-3"} py-3`}>
                  <button className="font-bold" onClick={() => toggleSort(column)}>
                    {prettyColumn(column)}{sort?.column === column ? (sort.direction === "asc" ? " ASC" : " DESC") : ""}
                  </button>
                </th>
              ))}
              {actions && <th className="w-24 px-3 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${currentPage}-${index}`} className="border-b border-slate-100">
                {columns.map((column) => (
                  <td key={column} className={`${column.endsWith("_id") ? "px-2" : "px-3"} py-3 text-slate-700`}>
                    {column === "grupo_asignado" && !row[column]
                      ? <span className="font-bold text-red-700">Sin grupo asignado</span>
                      : String(row[column] ?? "")}
                  </td>
                ))}
                {actions && <td className="px-3 py-3">{actions(row)}</td>}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center font-semibold text-slate-500">No hay registros para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {paginated && sortedRows.length > pageSize && (
        <div className="px-4 pb-4">
          <PaginationControls page={currentPage} lastPage={lastPage} total={sortedRows.length} from={from} to={to} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

// COLUMNAS ADMIN - transforma nombres tecnicos de base de datos a etiquetas legibles para usuario.
export function prettyColumn(column: string): string {
  const labels: Record<string, string> = {
    postulante_id: "ID Postulante",
    grupo_id: "ID Grupo",
    materia_id: "ID Materia",
    carrera_id: "ID Carrera",
    aula_id: "ID Aula",
    docente_id: "ID Docente",
    accion_id: "ID Accion",
    ci: "CI",
    nombres: "Nombres",
    apellidos: "Apellidos",
    fecha_nacimiento: "Fecha de nacimiento",
    sexo: "Sexo",
    direccion: "Direccion",
    telefono: "Telefono",
    correo: "Correo",
    colegio_procedencia: "Colegio de procedencia",
    ciudad: "Ciudad",
    titulo_bachiller_codigo: "Codigo titulo bachiller",
    carrera_opcion_1: "Carrera opcion 1",
    carrera_opcion_2: "Carrera opcion 2",
    grupo_asignado: "Grupo asignado",
    promedio_final: "Promedio final",
    promedio_desempate: "Promedio desempate",
    estado_academico_calculado: "Estado academico",
    estado_admision: "Estado de admision",
    carrera_admitida: "Carrera admitida",
    cupos_ocupados: "Cupos ocupados",
    cupos_disponibles: "Cupos disponibles",
    capacidad_maxima: "Capacidad maxima",
    total_estudiantes: "Total estudiantes",
    fecha_registro: "Fecha de registro",
    turno: "Turno",
  };

  return labels[column] ?? column.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
