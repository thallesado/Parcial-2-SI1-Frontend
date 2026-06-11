"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiGet, Bitacora, PaginatedResponse } from "@/lib/api";
import { Table } from "../_components/AdminTable";
import { PaginationControls } from "../_components/PaginationControls";

const emptyPage: PaginatedResponse<Bitacora> = {
  data: [],
  current_page: 1,
  per_page: 20,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

// MODULO BITACORA - pagina de 20 en 20 y busca en backend sin traer todo el historial.
export function BitacoraModule() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<PaginatedResponse<Bitacora>>(emptyPage);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (debouncedQuery) params.set("search", debouncedQuery);

    async function loadBitacora() {
      setLoading(true);
      try {
        const data = await apiGet<PaginatedResponse<Bitacora> | Bitacora[]>(`/admin/bitacora?${params.toString()}`);
        if (cancelled) return;
        const normalized = Array.isArray(data)
          ? { ...emptyPage, data, total: data.length, from: data.length ? 1 : null, to: data.length }
          : data;
        setPageData(normalized);
        setMessage("");
      } catch (error) {
        if (cancelled) return;
        setPageData(emptyPage);
        setMessage(error instanceof Error ? error.message : "No se pudo cargar la bitacora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBitacora();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery]);

  return (
    <>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-extrabold">Bitacora de movimientos</h2>
        <p className="mt-2 text-slate-600">Carga inicial de 20 registros. Si buscas algo, la busqueda se realiza en toda la bitacora.</p>
        <div className="mt-5 flex items-center gap-3">
          <Search className="text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 flex-1 rounded-lg border border-slate-300 px-3" placeholder="Buscar por accion, ruta, descripcion o IP" />
        </div>
      </div>
      {message && <div className="mt-4 rounded-lg bg-red-50 p-4 font-bold text-red-700">{message}</div>}
      {loading && <div className="mt-4 rounded-lg bg-blue-50 p-4 font-bold text-blue-900">Cargando bitacora...</div>}
      <Table
        columns={["accion_id", "fecha_hora", "accion", "tabla_afectada", "registro_id", "descripcion", "ip"]}
        rows={pageData.data as unknown as Array<Record<string, unknown>>}
        paginated={false}
      />
      <PaginationControls page={pageData.current_page} lastPage={pageData.last_page} total={pageData.total} from={pageData.from} to={pageData.to} onPageChange={setPage} />
    </>
  );
}
