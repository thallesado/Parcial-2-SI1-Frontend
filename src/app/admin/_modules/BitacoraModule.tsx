"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import type { Bitacora } from "@/lib/api";
import { Table } from "../_components/AdminTable";

// MODULO BITACORA - muestra solo movimientos importantes; las consultas GET ya no se registran.
export function BitacoraModule({ rows }: { rows: Bitacora[] }) {
  const [query, setQuery] = useState("");
  const safeRows = Array.isArray(rows) ? rows : [];
  const filtered = safeRows.filter((row) => `${row.accion} ${row.tabla_afectada ?? ""} ${row.descripcion} ${row.ip ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-extrabold">Bitacora de movimientos</h2>
        <p className="mt-2 text-slate-600">Registra inicios y cierres de sesion y cambios realizados desde el panel administrativo.</p>
        <div className="mt-5 flex items-center gap-3">
          <Search className="text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 flex-1 rounded-lg border border-slate-300 px-3" placeholder="Buscar por accion, ruta, descripcion o IP" />
        </div>
      </div>
      <Table
        columns={["accion_id", "fecha_hora", "accion", "tabla_afectada", "registro_id", "descripcion", "ip"]}
        rows={filtered as unknown as Array<Record<string, unknown>>}
      />
    </>
  );
}
