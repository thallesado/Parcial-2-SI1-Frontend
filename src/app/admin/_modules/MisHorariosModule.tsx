"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, HorarioClase } from "@/lib/api";

const days = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const colors = [
  "border-blue-200 bg-blue-50 text-blue-900",
  "border-emerald-200 bg-emerald-50 text-emerald-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-rose-200 bg-rose-50 text-rose-900",
];

// PORTAL DOCENTE - calendario de solo lectura con los bloques del docente autenticado.
export function MisHorariosModule() {
  const [rows, setRows] = useState<HorarioClase[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiGet<{ horarios: HorarioClase[] }>("/admin/docente/horarios")
      .then((data) => setRows(data.horarios))
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo cargar el horario."));
  }, []);

  const hours = useMemo(() => [...new Set(rows.map((row) => row.hora_inicio))].sort(), [rows]);

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-extrabold">Mis horarios asignados</h2>
      <p className="mt-2 text-slate-600">Materias, grupos y aulas vinculados a tu cuenta docente.</p>
      {message && <div className="mt-5 rounded-lg bg-red-50 p-4 font-bold text-red-700">{message}</div>}
      <div className="mt-6 overflow-auto rounded-lg border border-slate-200">
        <div className="grid min-w-[980px] grid-cols-[90px_repeat(6,minmax(145px,1fr))]">
          <div className="border-b border-r bg-slate-50 p-3 font-bold">Hora</div>
          {days.map((day) => <div key={day} className="border-b border-r bg-slate-50 p-3 text-center font-bold">{day}</div>)}
          {hours.map((hour) => (
            <HorarioRow key={hour} hour={hour} rows={rows} />
          ))}
          {hours.length === 0 && <div className="col-span-7 p-8 text-center font-semibold text-slate-500">Todavia no tienes bloques asignados.</div>}
        </div>
      </div>
    </div>
  );
}

function HorarioRow({ hour, rows }: { hour: string; rows: HorarioClase[] }) {
  return (
    <>
      <div className="border-b border-r p-3 text-sm font-bold">{hour}</div>
      {days.map((day, index) => {
        const blocks = rows.filter((row) => row.dia === day && row.hora_inicio === hour);
        return (
          <div key={`${hour}-${day}`} className="min-h-28 border-b border-r p-2">
            {blocks.map((block) => (
              <div key={block.horario_id} className={`rounded-md border p-2 text-xs ${colors[index % colors.length]}`}>
                <strong className="block text-sm">{block.materia}</strong>
                <span>Grupo {block.grupo}</span>
                <span className="block">Aula {block.aula}</span>
                <span className="block">{block.hora_inicio} - {block.hora_fin}</span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
