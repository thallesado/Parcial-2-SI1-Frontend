"use client";

import { Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  apiGet,
  apiPost,
  Gestion,
  NotasMateria,
  PaginatedResponse,
  Postulante,
  PromedioPostulante,
} from "@/lib/api";
import { PaginationControls } from "../_components/PaginationControls";

type NotaResponse = {
  postulante: Postulante;
  resultado?: PromedioPostulante;
  materias: NotasMateria[];
};

// MODULO EXAMENES - carga/guarda tres notas por materia y lista postulantes paginados desde backend.
export function ExamenesModule({ gestiones }: { gestiones: Gestion[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [data, setData] = useState<NotaResponse | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [sexoFilter, setSexoFilter] = useState("");
  const [gestionFilter, setGestionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [listLoading, setListLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [pageData, setPageData] = useState<PaginatedResponse<PromedioPostulante>>({
    data: [],
    current_page: 1,
    per_page: 50,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadPostulantes() {
      setListLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
      if (gestionFilter) params.set("gestion_id", gestionFilter);
      if (sexoFilter) params.set("sexo", sexoFilter);
      if (estadoFilter) params.set("estado", estadoFilter);

      try {
        const response = await apiGet<PaginatedResponse<PromedioPostulante>>(`/admin/examenes/postulantes?${params.toString()}`);
        if (!cancelled) {
          setPageData(response);
          setMessage("");
        }
      } catch {
        if (!cancelled) setMessage("No se pudo cargar la lista de postulantes.");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    loadPostulantes();

    return () => {
      cancelled = true;
    };
  }, [page, perPage, debouncedQuery, gestionFilter, sexoFilter, estadoFilter, refreshVersion]);

  useEffect(() => {
    if (selected) {
      apiGet<NotaResponse>(`/admin/examenes/notas/${selected}`).then(setData).catch(() => setMessage("No se pudieron cargar las notas."));
    }
  }, [selected]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !data) return;

    const form = new FormData(event.currentTarget);
    const notas = data.materias.map((materia) => ({
      materia_id: materia.materia_id,
      examen_1: form.get(`${materia.materia_id}_1`) || null,
      examen_2: form.get(`${materia.materia_id}_2`) || null,
      examen_3: form.get(`${materia.materia_id}_3`) || null,
    }));

    const updated = await apiPost<NotaResponse>(`/admin/examenes/notas/${selected}`, { notas });
    setData(updated);
    setMessage("Notas guardadas. Promedio y estado recalculados.");
    setRefreshVersion((value) => value + 1);
  }

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-xl font-extrabold">Postulantes</h2>
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-300 px-3">
          <Search className="text-slate-500" size={18} />
          <input value={query} onChange={(event) => { setQuery(event.target.value); resetToFirstPage(); }} className="h-11 flex-1 outline-none" placeholder="Buscar por nombre o CI" />
        </div>
        <div className="mt-4 grid gap-3">
          <select value={estadoFilter} onChange={(event) => { setEstadoFilter(event.target.value); resetToFirstPage(); }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700">
            <option value="">Todos los estados</option>
            <option value="ADMITIDO">Aprobados admitidos</option>
            <option value="SIN_CUPO">Aprobados sin cupo</option>
            <option value="REPROBADO">Reprobados</option>
          </select>
          <select value={sexoFilter} onChange={(event) => { setSexoFilter(event.target.value); resetToFirstPage(); }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700">
            <option value="">Todos los sexos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="OTRO">Otro</option>
          </select>
          <select value={gestionFilter} onChange={(event) => { setGestionFilter(event.target.value); resetToFirstPage(); }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700">
            <option value="">Todas las gestiones</option>
            {gestiones.map((gestion) => <option key={gestion.gestion_id} value={gestion.gestion_id}>{gestion.gestion_id}</option>)}
          </select>
          <select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }} className="h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700">
            <option value={10}>10 / pag.</option>
            <option value={25}>25 / pag.</option>
            <option value={50}>50 / pag.</option>
            <option value={100}>100 / pag.</option>
          </select>
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
            Total {pageData.total} resultados
          </div>
        </div>
        <div className="mt-4 max-h-[620px] space-y-2 overflow-auto">
          {listLoading && <p className="rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-900">Cargando postulantes...</p>}
          {!listLoading && pageData.data.map((postulante) => (
            <button key={postulante.postulante_id} onClick={() => { setData(null); setMessage(""); setSelected(postulante.postulante_id); }} className={`w-full rounded-lg p-3 text-left ${selected === postulante.postulante_id ? "bg-blue-700 text-white" : "bg-slate-100"}`}>
              <strong>{postulante.apellidos} {postulante.nombres}</strong>
              <p className="text-sm">CI: {postulante.ci}</p>
              <p className="text-sm">Gestion: {postulante.gestion_id} | Sexo: {postulante.sexo ?? "N/D"}</p>
              <p className="text-sm font-bold">{postulante.estado_admision ?? postulante.estado_academico_calculado}</p>
            </button>
          ))}
          {!listLoading && pageData.data.length === 0 && <p className="rounded-lg bg-slate-100 p-4 text-sm font-semibold text-slate-500">No hay postulantes con esos filtros.</p>}
        </div>
        <PaginationControls page={pageData.current_page} lastPage={pageData.last_page} total={pageData.total} from={pageData.from} to={pageData.to} onPageChange={setPage} />
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-extrabold">Registro de examenes</h2>
        {message && <div className="mt-4 rounded-lg bg-blue-50 p-3 font-semibold text-blue-900">{message}</div>}
        {selected && !data && <div className="mt-6 rounded-lg bg-slate-100 p-8 font-semibold text-slate-600">Cargando notas del postulante...</div>}
        {data ? (
          <form onSubmit={save} className="mt-6">
            <div className="grid gap-4">
              {data.materias.map((materia) => (
                <div key={materia.materia_id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1fr_120px_120px_120px]">
                  <h3 className="text-lg font-extrabold">{materia.nombre}</h3>
                  <ExamField name={`${materia.materia_id}_1`} label="Examen 1" defaultValue={materia.examen_1 ?? ""} />
                  <ExamField name={`${materia.materia_id}_2`} label="Examen 2" defaultValue={materia.examen_2 ?? ""} />
                  <ExamField name={`${materia.materia_id}_3`} label="Examen 3" defaultValue={materia.examen_3 ?? ""} />
                </div>
              ))}
            </div>
            <ResultadoAdmisionCard resultado={data.resultado} />
            <button className="mt-6 rounded-lg bg-red-700 px-6 py-3 font-bold text-white">Guardar notas</button>
          </form>
        ) : <p className="mt-6 text-slate-600">Selecciona un postulante.</p>}
      </div>
    </div>
  );
}

function ExamField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | number }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input name={name} type="number" defaultValue={defaultValue} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3" />
    </label>
  );
}

function ResultadoAdmisionCard({ resultado }: { resultado?: PromedioPostulante }) {
  const estadoAcademico = resultado?.estado_academico ?? resultado?.estado_academico_calculado ?? "PENDIENTE";
  const estadoAdmision = resultado?.estado_admision ?? "NO_EVALUADO";
  const aprobado = estadoAcademico === "APROBADO";
  const admitido = estadoAdmision === "ADMITIDO";
  const sinCupo = estadoAdmision === "SIN_CUPO";
  const color = admitido ? "border-green-200 bg-green-50 text-green-800" : aprobado ? "border-yellow-200 bg-yellow-50 text-yellow-800" : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`mt-6 rounded-lg border p-5 ${color}`}>
      <p className="text-lg font-extrabold">Promedio final: {resultado?.promedio_final ?? "0.00"}</p>
      <p className="mt-2 text-lg font-extrabold">Estado academico: {estadoAcademico}</p>
      <p className="mt-2 font-bold">Estado de admision: {estadoAdmision}</p>
      {admitido && <p className="mt-2 font-bold">Admitido en: {resultado?.carrera_admitida ?? "Carrera asignada"}</p>}
      {sinCupo && <p className="mt-2 font-bold">Aprobo academicamente, pero no alcanzo cupo en ninguna de sus dos opciones de carrera.</p>}
      {!aprobado && <p className="mt-2 font-bold">No alcanzo el promedio minimo de 60 puntos.</p>}
    </div>
  );
}
