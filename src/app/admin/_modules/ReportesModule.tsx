"use client";

import { useEffect, useState } from "react";
import { apiGet, Gestion, PaginatedResponse } from "@/lib/api";
import { Table } from "../_components/AdminTable";
import { PaginationControls } from "../_components/PaginationControls";

const reportes = [
  ["postulantes", "Lista general de postulantes"],
  ["aprobados", "Postulantes aprobados"],
  ["reprobados", "Postulantes reprobados"],
  ["promedios", "Promedios generales"],
  ["grupos", "Cantidad de grupos habilitados"],
  ["estadisticas-materia", "Estadisticas por materia"],
  ["docentes-grupos", "Docentes por grupos"],
  ["grupos-aprobados", "Grupos con mayor cantidad de aprobados"],
] as const;

// MODULO REPORTES - selector de reportes obligatorios; Laravel prioriza resultado_admision cuando aplica.
export function ReportesModule({ gestiones }: { gestiones: Gestion[] }) {
  const [tipo, setTipo] = useState("postulantes");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [pageData, setPageData] = useState<PaginatedResponse<Record<string, unknown>> | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [gestion, setGestion] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (gestion) params.set("gestion_id", gestion);

    apiGet<PaginatedResponse<Record<string, unknown>>>(`/admin/reportes/${tipo}?${params.toString()}`)
      .then((data) => {
        setRows(data.data);
        setPageData(data);
        setMessage("");
      })
      .catch(() => setMessage("No se pudo cargar el reporte."));
  }, [tipo, page, perPage, gestion]);

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-extrabold">Reportes</h2>
        <p className="mt-2 text-slate-600">Consulta reportes obligatorios del proceso de admision y nivelacion.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <select value={tipo} onChange={(event) => { setTipo(event.target.value); setPage(1); }} className="h-11 w-full max-w-md rounded-lg border border-slate-300 px-3">
            {reportes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className="h-11 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700">
            <option value={20}>20 / pag.</option>
            <option value={50}>50 / pag.</option>
            <option value={100}>100 / pag.</option>
          </select>
          <select value={gestion} onChange={(event) => { setGestion(event.target.value); setPage(1); }} className="h-11 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700">
            <option value="">Todas las gestiones</option>
            {gestiones.map((item) => <option key={item.gestion_id} value={item.gestion_id}>{item.gestion_id}</option>)}
          </select>
        </div>
      </div>
      {message && <div className="mt-6 rounded-lg bg-red-50 p-4 font-bold text-red-700">{message}</div>}
      {columns.length > 0 ? (
        <>
          <Table columns={columns} rows={rows} paginated={false} />
          {pageData && <PaginationControls page={pageData.current_page} lastPage={pageData.last_page} total={pageData.total} from={pageData.from} to={pageData.to} onPageChange={setPage} />}
        </>
      ) : <div className="mt-6 rounded-lg bg-white p-8 text-slate-600">Sin datos para mostrar.</div>}
    </>
  );
}
