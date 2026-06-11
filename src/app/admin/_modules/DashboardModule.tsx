"use client";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  School,
  Users,
  XCircle,
} from "lucide-react";
import type { Gestion } from "@/lib/api";

export type Dashboard = {
  gestion_activa?: Gestion;
  resumen?: {
    total_inscritos?: number;
    total_aprobados?: number;
    total_reprobados?: number;
    total_grupos_habilitados?: number;
  };
  estado_postulantes?: {
    admitidos?: number;
    aprobados_sin_cupo?: number;
    reprobados?: number;
  };
  inscripciones_mes?: Array<{ mes: string; total: number }>;
  carreras_inscritos?: Array<{ nombre: string; total: number }>;
  actividad_reciente?: Array<{ accion: string; descripcion: string; fecha_hora: string }>;
  carreras: number;
  materias: number;
  docentes: number;
  aulas: number;
};

// MODULO DASHBOARD - tablero visual del proceso de postulantes.
// Este archivo concentra graficos y tarjetas para que page.tsx solo decida que modulo renderizar.
export function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  const totalInscritos = dashboard.resumen?.total_inscritos ?? 0;
  const admitidos = dashboard.estado_postulantes?.admitidos ?? 0;
  const sinCupo = dashboard.estado_postulantes?.aprobados_sin_cupo ?? 0;
  const reprobados = dashboard.estado_postulantes?.reprobados ?? 0;
  const totalEvaluados = admitidos + sinCupo + reprobados;
  const months = dashboard.inscripciones_mes?.length ? dashboard.inscripciones_mes : [{ mes: "Sin datos", total: 0 }];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Inscritos" value={totalInscritos} icon={Users} color="blue" />
        <Metric label="Admitidos" value={admitidos} icon={CheckCircle2} color="green" />
        <Metric label="Sin cupo" value={sinCupo} icon={CircleAlert} color="amber" />
        <Metric label="Reprobados" value={reprobados} icon={XCircle} color="red" />
        <Metric label="Grupos" value={dashboard.resumen?.total_grupos_habilitados ?? 0} icon={Building2} color="violet" />
        <Metric label="Docentes" value={dashboard.docentes} icon={School} color="cyan" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.8fr_1fr]">
        <Panel title="Inscripciones por mes">
          <LineChart data={months} />
        </Panel>

        <Panel title="Estado de postulantes">
          <DonutChart total={totalEvaluados} admitidos={admitidos} sinCupo={sinCupo} reprobados={reprobados} />
        </Panel>

        <Panel title="Carreras con mas postulantes">
          <BarList rows={dashboard.carreras_inscritos ?? []} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr_0.75fr]">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-blue-700 text-white"><CalendarDays size={26} /></div>
            <div className="min-w-0">
              <p className="font-bold text-blue-900">Gestion activa</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">{dashboard.gestion_activa?.gestion_id ?? "Sin gestion"}</h2>
              <p className="mt-3 text-slate-600">{dashboard.gestion_activa?.nombre ?? "No hay gestion academica registrada."}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 border-t border-blue-100 pt-5 text-sm font-semibold text-slate-600 sm:grid-cols-2">
            <span>Carreras activas: <b className="text-slate-950">{dashboard.carreras}</b></span>
            <span>Materias activas: <b className="text-slate-950">{dashboard.materias}</b></span>
            <span>Aulas activas: <b className="text-slate-950">{dashboard.aulas}</b></span>
            <span>Estado: <b className="text-green-700">{dashboard.gestion_activa?.estado ?? "N/D"}</b></span>
          </div>
        </div>

        <Panel title="Actividad reciente">
          <div className="space-y-4">
            {(dashboard.actividad_reciente ?? []).slice(0, 5).map((item, index) => (
              <div key={`${item.fecha_hora}-${index}`} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-800">{item.accion}</p>
                  <p className="line-clamp-2 text-sm text-slate-500">{item.descripcion}</p>
                </div>
              </div>
            ))}
            {!dashboard.actividad_reciente?.length && <p className="text-sm text-slate-500">Sin movimientos registrados.</p>}
          </div>
        </Panel>

        <Panel title="Resumen rapido">
          <div className="space-y-3 text-sm">
            <QuickRow label="Postulantes evaluados" value={totalEvaluados} />
            <QuickRow label="Admitidos a carrera" value={admitidos} />
            <QuickRow label="Aprobados sin cupo" value={sinCupo} />
            <QuickRow label="Pendientes de evaluar" value={Math.max(totalInscritos - totalEvaluados, 0)} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color = "blue" }: { label: string; value: number; icon: typeof Users; color?: "blue" | "green" | "amber" | "red" | "violet" | "cyan" }) {
  const colors = {
    blue: "bg-blue-700",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    violet: "bg-violet-600",
    cyan: "bg-cyan-600",
  };
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-600">{label}</p>
        <div className={`grid h-11 w-11 place-items-center rounded-lg text-white ${colors[color]}`}><Icon size={22} /></div>
      </div>
      <p className="mt-5 text-3xl font-extrabold">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-400">Gestion actual</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm"><h2 className="mb-5 font-extrabold text-slate-800">{title}</h2>{children}</section>;
}

function LineChart({ data }: { data: Array<{ mes: string; total: number }> }) {
  const max = Math.max(...data.map((item) => item.total), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : 8 + (index * 84) / (data.length - 1);
    const y = 82 - (item.total / max) * 58;
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return (
    <svg viewBox="0 0 100 92" className="h-56 w-full overflow-visible">
      <path d="M 7 82 H 96" stroke="#e2e8f0" strokeWidth="0.8" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="1.8" />
      {points.map((point) => (
        <g key={point.mes}>
          <circle cx={point.x} cy={point.y} r="2.2" fill="#2563eb" />
          <text x={point.x} y={point.y - 5} textAnchor="middle" className="fill-blue-700 text-[5px] font-bold">{point.total}</text>
          <text x={point.x} y="91" textAnchor="middle" className="fill-slate-500 text-[5px]">{point.mes}</text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ total, admitidos, sinCupo, reprobados }: { total: number; admitidos: number; sinCupo: number; reprobados: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = [
    { label: "Admitidos", value: admitidos, color: "#22c55e" },
    { label: "Aprobados sin cupo", value: sinCupo, color: "#f59e0b" },
    { label: "Reprobados", value: reprobados, color: "#ef4444" },
  ].map((segment) => {
    const length = total ? (segment.value / total) * circumference : 0;
    const current = { ...segment, dash: `${length} ${circumference - length}`, offset };
    offset -= length;
    return current;
  });
  return (
    <div className="flex flex-col items-center gap-5 md:flex-row xl:flex-col">
      <div className="relative h-52 w-52">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="14" />
          {segments.map((segment) => (
            <circle key={segment.label} cx="50" cy="50" r={radius} fill="none" stroke={segment.color} strokeWidth="14" strokeDasharray={segment.dash} strokeDashoffset={segment.offset} />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div><p className="text-xs font-bold text-slate-400">Total</p><p className="text-2xl font-extrabold">{total}</p></div>
        </div>
      </div>
      <div className="w-full space-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-slate-600"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span>
            <b>{segment.value} ({percent(segment.value, total)}%)</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarList({ rows }: { rows: Array<{ nombre: string; total: number }> }) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  if (!rows.length) return <p className="text-sm text-slate-500">Sin postulantes registrados.</p>;
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.nombre} className="grid grid-cols-[minmax(0,1fr)_2.2fr_3rem] items-center gap-3 text-sm">
          <p className="truncate font-semibold text-slate-600">{row.nombre}</p>
          <div className="h-4 rounded bg-slate-100"><div className="h-4 rounded bg-blue-700" style={{ width: `${Math.max((row.total / max) * 100, 4)}%` }} /></div>
          <b className="text-right">{row.total}</b>
        </div>
      ))}
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3"><span className="font-semibold text-slate-600">{label}</span><b className="text-slate-950">{value}</b></div>;
}

function percent(value: number, total: number) {
  return total ? ((value / total) * 100).toFixed(1) : "0.0";
}
