"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, UsuariosResponse, UsuarioSistema } from "@/lib/api";
import { Table } from "../_components/AdminTable";

// MODULO USUARIOS - administra credenciales, rol principal y vinculacion con docentes.
export function UsuariosModule() {
  const [data, setData] = useState<UsuariosResponse>({ usuarios: [], roles: [], docentes: [] });
  const [editing, setEditing] = useState<UsuarioSistema | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setData(await apiGet<UsuariosResponse>("/admin/usuarios"));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch(() => setMessage("No se pudieron cargar los usuarios."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, unknown>;

    try {
      if (editing) {
        await apiPut(`/admin/usuarios/${editing.usuario_id}`, payload);
      } else {
        await apiPost("/admin/usuarios", payload);
      }
      event.currentTarget.reset();
      setEditing(null);
      setMessage("Usuario guardado correctamente.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el usuario.");
    }
  }

  return (
    <div className="space-y-6">
      <form key={editing?.usuario_id ?? "nuevo"} onSubmit={save} className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">{editing ? "Editar usuario" : "Crear usuario"}</h2>
            <p className="mt-1 text-slate-600">La prioridad y los modulos visibles se determinan por el rol asignado.</p>
          </div>
          {editing && <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-bold">Cancelar edicion</button>}
        </div>
        {message && <div className="mt-4 rounded-lg bg-blue-50 p-3 font-semibold text-blue-900">{message}</div>}
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input name="nombre_usuario" label="Usuario" defaultValue={editing?.nombre_usuario} />
          <Input name="nombres" label="Nombres" defaultValue={editing?.nombres} />
          <Input name="apellidos" label="Apellidos" defaultValue={editing?.apellidos} />
          <Input name="correo" label="Correo" type="email" defaultValue={editing?.correo} />
          <Input name="contrasena" label={editing ? "Nueva contrasena (opcional)" : "Contrasena"} type="password" required={!editing} />
          <label className="text-sm font-bold text-slate-700">
            Rol
            <select name="rol" defaultValue={editing?.roles?.split(",")[0]?.trim() ?? "SECRETARIA"} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
              {data.roles.map((rol) => <option key={rol.rol_id} value={rol.nombre}>{rol.nombre} - prioridad {rol.prioridad}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Docente vinculado
            <select name="docente_id" defaultValue={editing?.docente_id ?? ""} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
              <option value="">No corresponde</option>
              {editing?.docente_id && <option value={editing.docente_id}>{editing.docente || `Docente ${editing.docente_id}`}</option>}
              {data.docentes.map((docente) => <option key={docente.docente_id} value={docente.docente_id}>{docente.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Estado
            <select name="estado" defaultValue={editing?.estado ?? "ACTIVO"} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
              <option>ACTIVO</option>
              <option>INACTIVO</option>
            </select>
          </label>
        </div>
        <button className="mt-5 rounded-lg bg-blue-700 px-6 py-3 font-bold text-white">{editing ? "Guardar cambios" : "Crear usuario"}</button>
      </form>

      <Table
        columns={["usuario_id", "nombre_usuario", "nombres", "apellidos", "correo", "roles", "docente", "estado"]}
        rows={data.usuarios as unknown as Array<Record<string, unknown>>}
        actions={(row) => <button onClick={() => setEditing(row as unknown as UsuarioSistema)} className="rounded-lg bg-blue-700 px-3 py-2 font-bold text-white">Editar</button>}
      />
    </div>
  );
}

function Input({ name, label, type = "text", defaultValue, required = true }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required={required} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3" />
    </label>
  );
}
