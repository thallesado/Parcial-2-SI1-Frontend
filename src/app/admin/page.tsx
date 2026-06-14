"use client";

import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  History,
  GraduationCap,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  School,
  Search,
  Trash2,
  Users,
  UserCog,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  AuthSession,
  Aula,
  Carrera,
  CupoCarrera,
  Docente,
  DocenteAsignacion,
  DocenteAsignacionesResponse,
  DocenteDisponible,
  Gestion,
  GrupoResumen,
  HorarioClase,
  HorariosResponse,
  Materia,
  PaginatedResponse,
  Postulante,
} from "@/lib/api";
import { Table } from "./_components/AdminTable";
import { PaginationControls } from "./_components/PaginationControls";
import { BitacoraModule } from "./_modules/BitacoraModule";
import { DashboardView, type Dashboard } from "./_modules/DashboardModule";
import { ExamenesModule } from "./_modules/ExamenesModule";
import { ReportesModule } from "./_modules/ReportesModule";
import { MisHorariosModule } from "./_modules/MisHorariosModule";
import { UsuariosModule } from "./_modules/UsuariosModule";

// MENU ADMIN - cada id se usa para decidir que modulo renderizar en el panel.
// Para crear un nuevo modulo, agrega aqui una opcion y luego su render en AdminPage.
const sections = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "usuarios", label: "Usuarios y roles", icon: UserCog },
  { id: "postulantes", label: "Postulantes", icon: Users },
  { id: "examenes", label: "Examenes", icon: ClipboardList },
  { id: "bitacora", label: "Bitacora", icon: History },
  { id: "carreras", label: "Carreras", icon: GraduationCap },
  { id: "materias", label: "Materias", icon: BookOpen },
  { id: "docentes", label: "Docentes", icon: School },
  { id: "aulas", label: "Grupos y Aulas", icon: Building2 },
  { id: "reportes", label: "Reportes", icon: FileText },
  { id: "gestiones", label: "Gestiones", icon: CalendarDays },
  { id: "cupos", label: "Cupos", icon: BriefcaseBusiness },
  { id: "mis-horarios", label: "Mis horarios", icon: CalendarClock },
];

const menuGroups = [
  { id: "principal", label: "Principal", items: ["dashboard", "usuarios"] },
  { id: "postulantes", label: "Postulantes", items: ["postulantes"] },
  { id: "academico", label: "Academico", items: ["carreras", "materias", "gestiones", "cupos"] },
  { id: "recursos", label: "Recursos", items: ["docentes", "aulas"] },
  { id: "evaluacion", label: "Evaluacion y control", items: ["examenes", "mis-horarios", "reportes", "bitacora"] },
];

const sectionById = new Map(sections.map((section) => [section.id, section]));

const emptyDashboard: Dashboard = { carreras: 0, materias: 0, docentes: 0, aulas: 0 };

// PANEL ADMINISTRATIVO - componente raiz de toda la administracion.
// Centraliza autenticacion, carga inicial de catalogos, menu lateral y mensajes globales.
export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(() => typeof window !== "undefined" && Boolean(window.localStorage.getItem("admin_token")));
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(window.localStorage.getItem("auth_user") ?? "null");
    } catch {
      return null;
    }
  });
  const [active, setActive] = useState("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [gestiones, setGestiones] = useState<Gestion[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [gruposResumen, setGruposResumen] = useState<GrupoResumen | null>(null);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [cupos, setCupos] = useState<CupoCarrera[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenuGroups, setOpenMenuGroups] = useState<Record<string, boolean>>({
    principal: true,
    postulantes: true,
    academico: false,
    recursos: false,
    evaluacion: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [timeoutNotice, setTimeoutNotice] = useState(false);

  const allowedSections = authSession?.secciones ?? [];
  const activeTitle = useMemo(() => sections.find((item) => item.id === active)?.label ?? "Dashboard", [active]);

  useEffect(() => {
    if (!authenticated) return;

    if (!authSession) {
      apiGet<AuthSession>("/auth/me")
        .then((session) => {
          window.localStorage.setItem("auth_user", JSON.stringify(session));
          setActive(session.secciones[0] ?? "dashboard");
          setAuthSession(session);
        })
        .catch(() => clearSession("Sesion expirada o backend no disponible."));
      return;
    }

    const timer = window.setTimeout(() => {
      const firstAllowed = authSession.secciones[0];
      if (!authSession.secciones.includes(active) && firstAllowed) {
        setActive(firstAllowed);
      }
      loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, authSession?.rol]);

  // SESION INACTIVA - si no hay movimiento por 5 minutos, borra token y vuelve al login.
  useEffect(() => {
    if (!authenticated) return;

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.localStorage.removeItem("admin_token");
        window.localStorage.removeItem("auth_user");
        setAuthSession(null);
        setAuthenticated(false);
        setTimeoutNotice(true);
        setMessage("");
      }, 5 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [authenticated]);

  // LOGIN ADMIN - llama a Laravel, guarda token y carga datos iniciales del panel.
  async function login(payload: Record<string, unknown>) {
    setLoginLoading(true);
    try {
      const result = await apiPost<AuthSession & { token: string }>("/auth/login", payload);
      window.localStorage.setItem("admin_token", result.token);
      window.localStorage.setItem("auth_user", JSON.stringify(result));
      setActive(result.secciones[0] ?? "dashboard");
      setAuthSession(result);
      setAuthenticated(true);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    } finally {
      setLoginLoading(false);
    }
  }

  // LOGOUT ADMIN - avisa al backend, borra token local y vuelve al login.
  async function logout() {
    await apiPost("/auth/logout", {}).catch(() => null);
    window.localStorage.removeItem("admin_token");
    window.localStorage.removeItem("auth_user");
    setAuthSession(null);
    setAuthenticated(false);
    setMessage("");
  }

  // CARGA GLOBAL - trae todos los catalogos usados por los modulos del panel.
  // Si un modulo necesita datos nuevos, agrega aqui su apiGet y su setState.
  async function loadAll() {
    if (!authSession) return;
    setLoading(true);
    try {
      const can = (section: string) => authSession.secciones.includes(section);
      const tasks: Promise<void>[] = [];
      tasks.push(apiGet<Gestion[]>("/admin/gestiones").then(setGestiones));
      if (can("dashboard")) tasks.push(apiGet<Dashboard>("/admin/dashboard").then(setDashboard));
      if (can("postulantes") || can("aulas")) tasks.push(apiGet<Carrera[]>("/admin/carreras").then(setCarreras));
      if (can("aulas")) {
        tasks.push(apiGet<Aula[]>("/admin/aulas").then(setAulas));
        tasks.push(apiGet<GrupoResumen>("/admin/grupos/resumen").then(setGruposResumen));
      }
      if (can("materias")) tasks.push(apiGet<Materia[]>("/admin/materias").then(setMaterias));
      if (can("docentes")) tasks.push(apiGet<Docente[]>("/admin/docentes").then(setDocentes));
      if (can("cupos")) tasks.push(apiGet<CupoCarrera[]>("/admin/cupos").then(setCupos));
      await Promise.all(tasks);
    } catch {
      clearSession("Sesion expirada o backend no disponible.");
    } finally {
      setLoading(false);
    }
  }

  function clearSession(reason = "") {
    window.localStorage.removeItem("admin_token");
    window.localStorage.removeItem("auth_user");
    setAuthSession(null);
    setAuthenticated(false);
    setMessage(reason);
  }

  // CREAR REGISTROS - helper comun para formularios POST.
  async function submit(path: string, payload: Record<string, unknown>) {
    const cleanPayload = sanitizePayload(payload);
    const emptyFields = requiredBlankFields(cleanPayload);
    if (emptyFields.length > 0) {
      setMessage(`No se permiten espacios en blanco o campos vacios:\n${emptyFields.map((field) => `- ${prettyColumn(field)}`).join("\n")}`);
      return;
    }

    try {
      await apiPost(path, cleanPayload);
      setMessage("Registro guardado correctamente.");
      await loadAll();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "No se pudo guardar.";
      setMessage(path.includes("/admin/postulantes") ? `Error al añadir al postulante:\n${detail}` : detail);
    }
  }

  // ACTUALIZAR REGISTROS - helper comun para formularios PUT.
  async function update(path: string, payload: Record<string, unknown>) {
    const cleanPayload = sanitizePayload(payload);
    const emptyFields = requiredBlankFields(cleanPayload);
    if (emptyFields.length > 0) {
      setMessage(`No se permiten espacios en blanco o campos vacios:\n${emptyFields.map((field) => `- ${prettyColumn(field)}`).join("\n")}`);
      return;
    }

    try {
      await apiPut(path, cleanPayload);
      setMessage("Registro actualizado correctamente.");
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  // ELIMINAR REGISTROS - helper comun para botones DELETE.
  async function remove(path: string) {
    try {
      await apiDelete(path);
      setMessage("Registro eliminado correctamente.");
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  if (!authenticated) {
    return <LoginScreen message={message} validating={loginLoading} timeoutNotice={timeoutNotice} onDismissTimeout={() => setTimeoutNotice(false)} onSubmit={login} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      {sidebarOpen && <button aria-label="Cerrar menu" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 overflow-y-auto border-r border-blue-950 bg-blue-950 p-4 text-white transition-all duration-200 lg:translate-x-0 ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} w-72 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-red-700 text-xl font-bold text-white">U</div>
          <div className={sidebarCollapsed ? "hidden" : ""}>
            <p className="text-xl font-extrabold text-white">Universidad</p>
            <p className="text-sm text-blue-100">Administracion</p>
          </div>
          <button className="ml-auto rounded-lg p-2 hover:bg-white hover:text-blue-950 lg:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="mt-10 space-y-2 pb-20">
          {menuGroups.map((group) => {
            const permittedItems = group.items.filter((item) => allowedSections.includes(item));
            if (permittedItems.length === 0) return null;
            const isOpen = openMenuGroups[group.id] ?? false;
            const firstSection = sectionById.get(permittedItems[0]);
            const GroupIcon = firstSection?.icon ?? LayoutDashboard;
            const groupActive = permittedItems.includes(active);

            if (sidebarCollapsed) {
              return permittedItems.map((itemId) => {
                const section = sectionById.get(itemId);
                if (!section) return null;
                const Icon = section.icon;
                const selected = active === section.id;

                return (
                  <button key={section.id} title={section.label} onClick={() => { setActive(section.id); setSidebarOpen(false); }} className={`flex h-12 w-full items-center justify-center rounded-lg font-semibold ${selected ? "bg-white text-blue-950" : "text-blue-50 hover:bg-white hover:text-blue-950"}`}>
                    <Icon size={20} />
                  </button>
                );
              });
            }

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setOpenMenuGroups((current) => ({ ...current, [group.id]: !isOpen }))}
                  className={`flex h-12 w-full items-center gap-3 rounded-lg px-4 text-left font-semibold ${groupActive ? "bg-white text-blue-950" : "text-blue-50 hover:bg-white hover:text-blue-950"}`}
                >
                  <GroupIcon size={20} />
                  <span className="flex-1">{group.label}</span>
                  {isOpen ? <ChevronLeft className="-rotate-90" size={16} /> : <ChevronRight size={16} />}
                </button>
                {isOpen && (
                  <div className="space-y-1 pl-4">
                    {permittedItems.map((itemId) => {
                      const section = sectionById.get(itemId);
                      if (!section) return null;
                      const Icon = section.icon;
                      const selected = active === section.id;

                      return (
                        <button key={section.id} title={section.label} onClick={() => { setActive(section.id); setSidebarOpen(false); }} className={`flex h-10 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-semibold ${selected ? "bg-white text-blue-950" : "text-blue-50 hover:bg-white hover:text-blue-950"}`}>
                          <Icon size={17} />
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={logout} className={`flex h-12 w-full items-center gap-3 rounded-lg px-4 text-left font-semibold text-red-100 hover:bg-white hover:text-blue-950 ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
            <LogOut size={20} />
            {!sidebarCollapsed && "Cerrar sesion"}
          </button>
        </nav>
        <button onClick={() => setSidebarCollapsed((value) => !value)} className="absolute -right-4 top-24 hidden h-9 w-9 place-items-center rounded-full border border-blue-950 bg-white text-blue-950 shadow lg:grid" aria-label="Replegar menu">
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <section className={`transition-all duration-200 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="rounded-lg bg-blue-950 p-3 text-white lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
              <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700">{authSession?.rol === "DOCENTE" ? "Portal docente" : "Panel administrativo"}</p>
              <h1 className="text-3xl font-extrabold">{activeTitle}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">{authSession?.nombre_completo} | {authSession?.rol}</p>
              </div>
            </div>
            <div className="hidden gap-3 sm:flex">
              <button onClick={loadAll} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-bold text-white"><RefreshCw size={18} />Actualizar</button>
              <button onClick={logout} className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white">Cerrar sesion</button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {message && <div className="mb-6 whitespace-pre-line rounded-lg border border-blue-200 bg-blue-50 p-4 font-semibold text-blue-900">{message}</div>}
          {loading && <div className="mb-6 rounded-lg bg-white p-8 text-lg font-semibold">Cargando datos...</div>}

          {active === "dashboard" && allowedSections.includes("dashboard") && <DashboardView dashboard={dashboard} />}
          {active === "usuarios" && allowedSections.includes("usuarios") && <UsuariosModule />}
          {active === "carreras" && <CrudCarrera rows={carreras} onSubmit={(payload) => submit("/admin/carreras", payload)} onUpdate={(id, payload) => update(`/admin/carreras/${id}`, payload)} onDelete={(id) => remove(`/admin/carreras/${id}`)} />}
          {active === "materias" && <CrudMateria rows={materias} onSubmit={(payload) => submit("/admin/materias", payload)} onUpdate={(id, payload) => update(`/admin/materias/${id}`, payload)} onDelete={(id) => remove(`/admin/materias/${id}`)} />}
          {active === "aulas" && <GruposYAulasModule readOnly={authSession?.rol === "SECRETARIA"} rows={aulas} resumen={gruposResumen} gestiones={gestiones} onSubmitAula={(payload) => submit("/admin/aulas", payload)} onDeleteAula={(id) => remove(`/admin/aulas/${id}`)} onSubmitGrupo={(payload) => submit("/admin/grupos", payload)} onUpdateGrupo={(id, payload) => update(`/admin/grupos/${id}`, payload)} onDeleteGrupo={(id) => remove(`/admin/grupos/${id}`)} onAsignar={(gestionId) => submit("/admin/grupos/asignar", { gestion_id: gestionId })} />}
          {active === "docentes" && <CrudDocente rows={docentes} materias={materias} onSaved={loadAll} onDelete={(id) => remove(`/admin/docentes/${id}`)} />}
          {active === "gestiones" && <CrudGestion rows={gestiones} onSubmit={(payload) => submit("/admin/gestiones", payload)} />}
          {active === "cupos" && <CrudCupo rows={cupos} carreras={carreras} gestiones={gestiones} onSubmit={(payload) => submit("/admin/cupos", payload)} />}
          {active === "postulantes" && (
            <CrudPostulante
              readOnly={authSession?.rol === "SECRETARIA"}
              carreras={carreras}
              gestiones={gestiones}
              grupos={gruposResumen?.grupos ?? []}
              onSubmit={(payload) => submit("/admin/postulantes", payload)}
              onUpdate={(id, payload) => update(`/admin/postulantes/${id}`, payload)}
              onDelete={(id) => remove(`/admin/postulantes/${id}`)}
            />
          )}
          {active === "examenes" && <ExamenesModule gestiones={gestiones} />}
          {active === "mis-horarios" && <MisHorariosModule />}
          {active === "bitacora" && <BitacoraModule />}
          {active === "reportes" && <ReportesModule gestiones={gestiones} />}
        </div>
      </section>
    </main>
  );
}

// MODULO LOGIN - pantalla de acceso, modal de validacion y aviso por inactividad.
function LoginScreen({ message, validating, timeoutNotice, onDismissTimeout, onSubmit }: { message: string; validating: boolean; timeoutNotice: boolean; onDismissTimeout: () => void; onSubmit: (data: Record<string, unknown>) => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-blue-700 px-6">
      {timeoutNotice && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-6">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
            <h2 className="text-2xl font-extrabold text-slate-950">Desconectado por inactividad</h2>
            <p className="mt-3 text-slate-600">Tu sesion permanecio inactiva por 5 minutos. Vuelve a ingresar para continuar.</p>
            <button onClick={onDismissTimeout} className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-bold text-white">Volver al inicio de sesion</button>
          </div>
        </div>
      )}
      {validating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40">
          <div className="rounded-lg bg-slate-200 px-8 py-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-400 border-t-blue-700" />
            <p className="text-lg font-extrabold text-slate-800">Validando credenciales...</p>
          </div>
        </div>
      )}
      <form
        onSubmit={(event) => handleForm(event, onSubmit)}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-700 text-xl font-bold text-white">U</div>
          <div>
            <h1 className="text-2xl font-extrabold">Ingreso administrador</h1>
            <p className="text-slate-500">Usuario y contrasena obligatorios</p>
          </div>
        </div>
        {message && <div className="mb-5 rounded-lg bg-red-50 p-3 font-semibold text-red-700">{message}</div>}
        <Field name="usuario" label="Usuario" />
        <div className="mt-4" />
        <Field name="contrasena" label="Contrasena" type="password" />
        <button className="mt-8 h-12 w-full rounded-lg bg-red-700 font-bold text-white">Iniciar sesion</button>
        <p className="mt-5 text-sm text-slate-500">Usuario inicial: admin / Admin1234</p>
      </form>
    </main>
  );
}

// UI METRICA - tarjeta estatica reutilizada en dashboard y grupos.
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

// UI METRICA BOTON - tarjeta clickeable usada para cambiar vistas en asignacion docente.
function MetricButton({ label, value, icon: Icon, active, onClick }: { label: string; value: number; icon: typeof Users; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-lg p-6 text-left shadow-sm transition ${active ? "bg-blue-700 text-white" : "bg-white text-slate-950 hover:bg-blue-50"}`}>
      <div className="flex items-center justify-between">
        <p className={`font-bold ${active ? "text-white" : "text-slate-700"}`}>{label}</p>
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${active ? "bg-white text-blue-700" : "bg-blue-700 text-white"}`}><Icon size={22} /></div>
      </div>
      <p className="mt-6 text-4xl font-extrabold">{value}</p>
    </button>
  );
}

// UI FIELD - input basico usado por formularios del panel.
function Field({ name, label, type = "text", required = true, defaultValue, error = false }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string | number; error?: boolean }) {
  return (
    <label className={`block text-sm font-bold ${error ? "text-red-700" : "text-slate-700"}`}>
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} className={`mt-2 h-11 w-full rounded-lg border bg-white px-3 ${error ? "border-red-500 ring-2 ring-red-100" : "border-slate-300"}`} />
      {error && <span className="mt-1 block text-xs font-bold text-red-700">Campo obligatorio</span>}
    </label>
  );
}

// UI SELECT - selector reutilizable para catalogos como gestion, carrera, estado y materia.
function SelectField({ name, label, children, defaultValue, required = true, error = false }: { name: string; label: string; children: React.ReactNode; defaultValue?: string | number; required?: boolean; error?: boolean }) {
  return (
    <label className={`block text-sm font-bold ${error ? "text-red-700" : "text-slate-700"}`}>
      {label}
      <select name={name} required={required} defaultValue={defaultValue} className={`mt-2 h-11 w-full rounded-lg border bg-white px-3 ${error ? "border-red-500 ring-2 ring-red-100" : "border-slate-300"}`}>{children}</select>
      {error && <span className="mt-1 block text-xs font-bold text-red-700">Campo obligatorio</span>}
    </label>
  );
}

// FORM HELPER - convierte FormData en objeto plano para enviarlo a la API.
function handleForm(event: FormEvent<HTMLFormElement>, onSubmit: (data: Record<string, unknown>) => void) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  onSubmit(data);
  event.currentTarget.reset();
}

// FORM PREVIEW - lee valores vivos del formulario para mostrarlos en pasos de confirmacion.
function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(Array.from(new FormData(form).entries()).map(([key, value]) => [key, String(value)]));
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
}

function requiredBlankFields(payload: Record<string, unknown>): string[] {
  const optional = new Set(["ubicacion", "observacion", "grupo_id"]);
  return Object.entries(payload)
    .filter(([key, value]) => !optional.has(key) && typeof value === "string" && value.trim() === "")
    .map(([key]) => key);
}

function prettyColumn(column: string): string {
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

// UI FORM SHELL - contenedor comun para formularios CRUD simples.
function FormShell({ title, children, onSubmit }: { title: string; children: React.ReactNode; onSubmit: (data: Record<string, unknown>) => void }) {
  return (
    <form onSubmit={(event) => handleForm(event, onSubmit)} className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold"><Plus size={22} /> {title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
      <button className="mt-6 rounded-lg bg-red-700 px-6 py-3 font-bold text-white">Guardar</button>
    </form>
  );
}

// UI STEPS - barra de progreso para formularios por etapas.
function StepHeader({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${index <= current ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-600"}`}>{index + 1}</span>
            <span className={`text-sm font-bold ${index === current ? "text-blue-700" : "text-slate-500"}`}>{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-700 transition-all" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

// UI STEP CARD - tarjeta visual para cada etapa de postulante/docente.
function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white">
      <div className="border-b border-blue-100 bg-blue-50 p-5">
        <h3 className="text-lg font-extrabold text-blue-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

// UI STEP ACTIONS - botones anterior/siguiente/guardar de formularios por etapas.
function StepActions({ current, total, onPrev, onNext }: { current: number; total: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
      <button type="button" onClick={onPrev} disabled={current === 0} className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-slate-700 disabled:opacity-50">Anterior</button>
      {current < total - 1 ? (
        <button type="button" onClick={onNext} className="rounded-lg bg-blue-700 px-6 py-3 font-bold text-white">Siguiente</button>
      ) : (
        <button className="rounded-lg bg-red-700 px-6 py-3 font-bold text-white">Guardar</button>
      )}
    </div>
  );
}

// UI PREVIEW - resumen final antes de guardar postulantes o docentes.
function PreviewPanel({ title, description, items }: { title: string; description: string; items: Array<[string, string | undefined]> }) {
  return (
    <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-5 text-blue-950">
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="mt-2 text-sm font-semibold text-slate-600">{description}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
            <p className="mt-1 min-h-6 break-words font-bold text-slate-900">{value || "Sin dato"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// MODULO CARRERAS - CRUD de carreras usadas en postulacion, cupos y pagina publica.
function CrudCarrera({ rows, onSubmit, onUpdate, onDelete }: { rows: Carrera[]; onSubmit: (data: Record<string, unknown>) => void; onUpdate: (id: number, data: Record<string, unknown>) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<Carrera | null>(null);
  const [deleting, setDeleting] = useState<Carrera | null>(null);

  return (
    <>
      <FormShell title="Registrar carrera" onSubmit={onSubmit}>
        <Field name="codigo" label="Codigo" />
        <Field name="nombre" label="Nombre" />
        <SelectField name="estado" label="Estado"><option>ACTIVO</option><option>INACTIVO</option></SelectField>
      </FormShell>
      <Table columns={["carrera_id", "codigo", "nombre", "estado"]} rows={rows as unknown as Array<Record<string, unknown>>} actions={(row) => <ActionButtons onEdit={() => setEditing(row as unknown as Carrera)} onDelete={() => setDeleting(row as unknown as Carrera)} />} />
      {editing && <EditBasicModal title="Editar carrera" row={editing as unknown as Record<string, unknown>} idKey="carrera_id" fields={["codigo", "nombre"]} onClose={() => setEditing(null)} onConfirm={(data) => { onUpdate(editing.carrera_id, data); setEditing(null); }} />}
      {deleting && <ConfirmModal title="Eliminar carrera" text={`Estas seguro de eliminar ${deleting.nombre}?`} onClose={() => setDeleting(null)} onConfirm={() => { onDelete(deleting.carrera_id); setDeleting(null); }} />}
    </>
  );
}

// MODULO MATERIAS - CRUD de materias evaluadas en admision y asignadas a docentes.
function CrudMateria({ rows, onSubmit, onUpdate, onDelete }: { rows: Materia[]; onSubmit: (data: Record<string, unknown>) => void; onUpdate: (id: number, data: Record<string, unknown>) => void; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<Materia | null>(null);
  const [deleting, setDeleting] = useState<Materia | null>(null);

  return (
    <>
      <FormShell title="Registrar materia" onSubmit={onSubmit}>
        <Field name="codigo" label="Codigo" />
        <Field name="nombre" label="Nombre" />
        <SelectField name="estado" label="Estado"><option>ACTIVO</option><option>INACTIVO</option></SelectField>
      </FormShell>
      <Table columns={["materia_id", "codigo", "nombre", "estado"]} rows={rows as unknown as Array<Record<string, unknown>>} actions={(row) => <ActionButtons onEdit={() => setEditing(row as unknown as Materia)} onDelete={() => setDeleting(row as unknown as Materia)} />} />
      {editing && <EditBasicModal title="Editar materia" row={editing as unknown as Record<string, unknown>} idKey="materia_id" fields={["codigo", "nombre"]} onClose={() => setEditing(null)} onConfirm={(data) => { onUpdate(editing.materia_id, data); setEditing(null); }} />}
      {deleting && <ConfirmModal title="Eliminar materia" text={`Estas seguro de eliminar ${deleting.nombre}?`} onClose={() => setDeleting(null)} onConfirm={() => { onDelete(deleting.materia_id); setDeleting(null); }} />}
    </>
  );
}

// MODULO GRUPOS Y AULAS - crea grupos, administra aulas y muestra estudiantes por grupo.
function GruposYAulasModule({ readOnly = false, rows, resumen, gestiones, onSubmitAula, onDeleteAula, onSubmitGrupo, onUpdateGrupo, onDeleteGrupo, onAsignar }: { readOnly?: boolean; rows: Aula[]; resumen: GrupoResumen | null; gestiones: Gestion[]; onSubmitAula: (data: Record<string, unknown>) => void; onDeleteAula: (id: number) => void; onSubmitGrupo: (data: Record<string, unknown>) => void; onUpdateGrupo: (id: number, data: Record<string, unknown>) => void; onDeleteGrupo: (id: number) => void; onAsignar: (gestionId: string) => void }) {
  const [showAulaForm, setShowAulaForm] = useState(false);
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [studentsGroup, setStudentsGroup] = useState<{ title: string; rows: Array<Record<string, unknown>> } | null>(null);
  const [editingGroup, setEditingGroup] = useState<Record<string, unknown> | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Record<string, unknown> | null>(null);
  const [selectedGestion, setSelectedGestion] = useState(resumen?.gestion?.gestion_id ?? gestiones[0]?.gestion_id ?? "");
  const [fetchedResumen, setFetchedResumen] = useState<GrupoResumen | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const localResumen = fetchedResumen ?? resumen;
  const gestionActual = selectedGestion || localResumen?.gestion?.gestion_id || "";

  async function showStudents(row: Record<string, unknown>) {
    const students = await apiGet<Array<Record<string, unknown>>>(`/admin/grupos/${row.grupo_id}/estudiantes`);
    setStudentsGroup({ title: `Estudiantes del grupo ${row.codigo}`, rows: students });
  }

  async function changeGestion(gestionId: string) {
    setSelectedGestion(gestionId);
    setLoadingResumen(true);
    try {
      setFetchedResumen(await apiGet<GrupoResumen>(`/admin/grupos/resumen?gestion_id=${encodeURIComponent(gestionId)}`));
    } finally {
      setLoadingResumen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Inscritos" value={localResumen?.total_inscritos ?? 0} icon={Users} />
        <Metric label="Necesarios" value={localResumen?.grupos_necesarios ?? 0} icon={Building2} />
        <Metric label="Habilitados" value={localResumen?.grupos_habilitados ?? 0} icon={Building2} />
        <Metric label="Sin grupo" value={localResumen?.pendientes_sin_grupo ?? 0} icon={Users} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        <label className="min-w-52 text-sm font-bold text-slate-700">
          Gestion
          <select value={selectedGestion} onChange={(event) => changeGestion(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3">
            {gestiones.map((g) => <option key={g.gestion_id} value={g.gestion_id}>{g.gestion_id} - {g.nombre}</option>)}
          </select>
        </label>
        {!readOnly && <button onClick={() => setShowGrupoForm((value) => !value)} className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white">Crear grupo</button>}
        {!readOnly && <button onClick={() => { setFetchedResumen(null); if (gestionActual) onAsignar(gestionActual); }} className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white">Asignar pendientes</button>}
        {!readOnly && <button onClick={() => setShowAulaForm((value) => !value)} className="rounded-lg bg-blue-950 px-5 py-3 font-bold text-white">Agregar aula</button>}
        {loadingResumen && <span className="font-semibold text-slate-500">Cargando gestion...</span>}
      </div>

      {showGrupoForm && (
        <FormShell title="Crear grupo" onSubmit={onSubmitGrupo}>
          <SelectField name="gestion_id" label="Gestion" defaultValue={gestionActual}>{gestiones.map((g) => <option key={g.gestion_id} value={g.gestion_id}>{g.gestion_id}</option>)}</SelectField>
          <Field name="codigo" label="Codigo de grupo" />
          <Field name="capacidad_maxima" label="Capacidad maxima" type="number" defaultValue={70} />
          <SelectField name="turno" label="Turno"><option>MANANA</option><option>TARDE</option><option>TARDE_NOCHE</option></SelectField>
        </FormShell>
      )}

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-extrabold">Grupos habilitados</h2>
        <Table columns={["grupo_id", "gestion_id", "codigo", "turno", "capacidad_maxima", "total_estudiantes", "estado"]} rows={(localResumen?.grupos ?? []) as unknown as Array<Record<string, unknown>>} actions={(row) => (
          <div className="flex gap-2">
            <button title="Ver estudiantes" onClick={() => showStudents(row)} className="rounded-lg bg-blue-700 p-2 text-white"><Eye size={18} /></button>
            {!readOnly && <button title="Editar grupo" onClick={() => setEditingGroup(row)} className="rounded-lg bg-slate-700 p-2 text-white"><Pencil size={18} /></button>}
            {!readOnly && <button title="Eliminar grupo" onClick={() => setDeletingGroup(row)} className="rounded-lg bg-red-700 p-2 text-white"><Trash2 size={18} /></button>}
          </div>
        )} />
      </div>

      {showAulaForm && (
        <FormShell title="Agregar aula" onSubmit={onSubmitAula}>
          <Field name="codigo" label="Codigo" />
          <Field name="nombre" label="Nombre" />
          <Field name="capacidad" label="Capacidad" type="number" />
          <Field name="ubicacion" label="Ubicacion" required={false} />
          <SelectField name="estado" label="Estado"><option>ACTIVO</option><option>INACTIVO</option></SelectField>
        </FormShell>
      )}

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-extrabold">Aulas</h2>
        <Table
          columns={["aula_id", "codigo", "nombre", "capacidad", "ubicacion", "estado"]}
          rows={rows as unknown as Array<Record<string, unknown>>}
          actions={readOnly ? undefined : (row) => (
            <button onClick={() => onDeleteAula(Number(row.aula_id))} className="rounded-lg bg-red-700 p-2 text-white"><Trash2 size={18} /></button>
          )}
        />
      </div>
      {studentsGroup && (
        <Modal title={studentsGroup.title} onClose={() => setStudentsGroup(null)}>
          <Table columns={["postulante_id", "ci", "nombres", "apellidos", "correo", "estado"]} rows={studentsGroup.rows} compact />
        </Modal>
      )}
      {editingGroup && (
        <Modal title="Editar grupo" onClose={() => setEditingGroup(null)}>
          <form onSubmit={(event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.currentTarget).entries());
            onUpdateGrupo(Number(editingGroup.grupo_id), data);
            setEditingGroup(null);
          }} className="grid gap-4">
            <Field name="codigo" label="Codigo" defaultValue={String(editingGroup.codigo ?? "")} />
            <Field name="capacidad_maxima" label="Capacidad maxima" type="number" defaultValue={Number(editingGroup.capacidad_maxima ?? 70)} />
            <SelectField name="turno" label="Turno" defaultValue={String(editingGroup.turno ?? "MANANA")}><option>MANANA</option><option>TARDE</option><option>TARDE_NOCHE</option></SelectField>
            <SelectField name="estado" label="Estado" defaultValue={String(editingGroup.estado ?? "ACTIVO")}><option>ACTIVO</option><option>INACTIVO</option></SelectField>
            <button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white">Confirmar cambios</button>
          </form>
        </Modal>
      )}
      {deletingGroup && <ConfirmModal title="Eliminar grupo" text={`Estas seguro de eliminar el grupo ${deletingGroup.codigo}?`} onClose={() => setDeletingGroup(null)} onConfirm={() => { onDeleteGrupo(Number(deletingGroup.grupo_id)); setDeletingGroup(null); }} />}
    </div>
  );
}

// MODULO DOCENTES - contiene registro/edicion de docentes y submodulo de asignacion.
function CrudDocente({ rows, materias, onSaved, onDelete }: { rows: Docente[]; materias: Materia[]; onSaved: () => Promise<void>; onDelete: (id: number) => void }) {
  const [editing, setEditing] = useState<Docente | null>(null);
  const [deleting, setDeleting] = useState<Docente | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState<Docente | null>(null);
  const [tab, setTab] = useState<"registro" | "asignacion">("registro");
  const [message, setMessage] = useState("");

  async function saveDocente(data: FormData, docenteId?: number) {
    try {
      await apiPostForm(docenteId ? `/admin/docentes/${docenteId}/actualizar` : "/admin/docentes", data);
      setMessage(docenteId ? "Docente actualizado correctamente." : "Docente registrado. Sus documentos quedaron pendientes de validacion.");
      setEditing(null);
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el docente.");
      throw error;
    }
  }

  async function updateDocumentStatus(docente: Docente, tipoRequisitoId: number, estado: string) {
    await apiPut(`/admin/docentes/${docente.docente_id}/documentos/${tipoRequisitoId}/estado`, { estado_validacion: estado });
    setMessage("Estado del documento actualizado.");
    await onSaved();
    setViewingDocuments(null);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3 rounded-lg bg-white p-2 shadow-sm">
        <button onClick={() => setTab("registro")} className={`rounded-lg px-5 py-3 font-bold ${tab === "registro" ? "bg-blue-700 text-white" : "text-blue-950 hover:bg-slate-100"}`}>Registro de docentes</button>
        <button onClick={() => setTab("asignacion")} className={`rounded-lg px-5 py-3 font-bold ${tab === "asignacion" ? "bg-blue-700 text-white" : "text-blue-950 hover:bg-slate-100"}`}>Asignacion de docentes</button>
      </div>
      {message && <div className="mb-6 rounded-lg bg-blue-50 p-4 font-semibold text-blue-900">{message}</div>}
      {tab === "registro" && (
        <>
          <DocenteForm title="Registrar docente" materias={materias} onSubmit={(data) => saveDocente(data)} />
          <Table
            columns={["docente_id", "ci", "nombres", "apellidos", "correo", "especialidad", "materias", "documentacion_estado", "estado"]}
            rows={rows as unknown as Array<Record<string, unknown>>}
            actions={(row) => (
              <div className="flex gap-2">
                <button title="Revisar documentos" onClick={() => setViewingDocuments(row as unknown as Docente)} className="rounded-lg bg-emerald-700 p-2 text-white"><FileText size={18} /></button>
                <ActionButtons onEdit={() => setEditing(row as unknown as Docente)} onDelete={() => setDeleting(row as unknown as Docente)} />
              </div>
            )}
            compact
          />
        </>
      )}
      {tab === "asignacion" && <DocenteAsignacionModule />}
      {editing && (
        <Modal title="Editar docente" onClose={() => setEditing(null)}>
          <DocenteForm
            title=""
            docente={editing}
            materias={materias}
            onSubmit={(data) => saveDocente(data, editing.docente_id)}
          />
        </Modal>
      )}
      {viewingDocuments && (
        <Modal title={`Documentos de ${viewingDocuments.nombres} ${viewingDocuments.apellidos}`} onClose={() => setViewingDocuments(null)}>
          <div className="space-y-4">
            {(viewingDocuments.requisitos ?? []).map((requisito) => (
              <div key={requisito.tipo_requisito_id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold">{requisito.nombre}</h3>
                    <p className="text-sm text-slate-600">{requisito.descripcion} | {requisito.institucion}</p>
                    <p className="text-sm text-slate-600">Nro. {requisito.codigo_documento} | {requisito.fecha_obtencion}</p>
                    <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs font-bold">{requisito.estado_validacion}</span>
                  </div>
                  <button
                    onClick={() => apiDownload(`/admin/docentes/${viewingDocuments.docente_id}/documentos/${requisito.tipo_requisito_id}`, requisito.archivo_nombre_original ?? "documento")}
                    className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white"
                  >
                    Ver archivo
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["VALIDADO", "OBSERVADO", "RECHAZADO"].map((estado) => (
                    <button key={estado} onClick={() => updateDocumentStatus(viewingDocuments, requisito.tipo_requisito_id, estado)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">{estado}</button>
                  ))}
                </div>
              </div>
            ))}
            {(viewingDocuments.requisitos ?? []).length === 0 && <p className="rounded-lg bg-red-50 p-4 font-bold text-red-700">Este docente no tiene documentos registrados.</p>}
          </div>
        </Modal>
      )}
      {deleting && <ConfirmModal title="Eliminar docente" text={`Estas seguro de eliminar ${deleting.nombres} ${deleting.apellidos}?`} onClose={() => setDeleting(null)} onConfirm={() => { onDelete(deleting.docente_id); setDeleting(null); }} />}
    </>
  );
}

// MODULO DOCENTES FORMULARIO - asistente por pasos para registrar/editar datos y materias del docente.
function DocenteForm({ title, materias, docente, onSubmit }: { title: string; materias: Materia[]; docente?: Docente; onSubmit: (data: FormData) => Promise<void> | void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialMaterias = docente?.materia_ids?.length ? docente.materia_ids.map(String) : [materias[0]?.materia_id ? String(materias[0].materia_id) : ""];
  const [materiaIds, setMateriaIds] = useState<string[]>(initialMaterias);
  const [step, setStep] = useState(0);
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const requisito = (codigo: string) => docente?.requisitos?.find((item) => item.codigo === codigo);
  const [preview, setPreview] = useState<Record<string, string>>({
    ci: docente?.ci ?? "",
    nombres: docente?.nombres ?? "",
    apellidos: docente?.apellidos ?? "",
    telefono: docente?.telefono ?? "",
    correo: docente?.correo ?? "",
    especialidad: docente?.especialidad ?? "",
    estado: docente?.estado ?? "ACTIVO",
  });
  const steps = ["Identificacion", "Contacto", "Academico", "Documentos", "Materias", "Confirmacion"];
  const next = () => {
    const currentPanel = formRef.current?.querySelector(`[data-docente-step="${step}"]`);
    const invalid = currentPanel?.querySelector<HTMLInputElement | HTMLSelectElement>("input:invalid, select:invalid");
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep((value) => Math.min(value + 1, steps.length - 1));
  };
  const prev = () => setStep((value) => Math.max(value - 1, 0));

  return (
    <form ref={formRef} onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      data.delete("materia_ids[]");
      materiaIds.filter(Boolean).forEach((id) => data.append("materia_ids[]", id));
      setSaving(true);
      try {
        await onSubmit(data);
        if (!docente) {
          event.currentTarget.reset();
          setMateriaIds(initialMaterias);
          setFileNames({});
          setStep(0);
        }
      } finally {
        setSaving(false);
      }
    }} onChange={(event) => setPreview(formValues(event.currentTarget))} noValidate className="rounded-lg bg-white p-6 shadow-sm">
      {title && <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold"><Plus size={22} /> {title}</h2>}
      <StepHeader steps={steps} current={step} />
      <div data-docente-step="0" className={step === 0 ? "" : "hidden"}><StepCard title="Identificacion" description="Datos basicos del docente."><Field name="ci" label="CI" defaultValue={docente?.ci} /><Field name="nombres" label="Nombres" defaultValue={docente?.nombres} /><Field name="apellidos" label="Apellidos" defaultValue={docente?.apellidos} /></StepCard></div>
      <div data-docente-step="1" className={step === 1 ? "" : "hidden"}><StepCard title="Contacto" description="Datos de comunicacion."><Field name="telefono" label="Telefono" defaultValue={docente?.telefono} /><Field name="correo" label="Correo" type="email" defaultValue={docente?.correo} /></StepCard></div>
      <div data-docente-step="2" className={step === 2 ? "" : "hidden"}><StepCard title="Academico" description="Especialidad y estado del docente."><Field name="especialidad" label="Especialidad" defaultValue={docente?.especialidad} /><SelectField name="estado" label="Estado" defaultValue={docente?.estado ?? "ACTIVO"}><option>ACTIVO</option><option>INACTIVO</option></SelectField></StepCard></div>
      <div data-docente-step="3" className={step === 3 ? "" : "hidden"}>
        <StepCard title="Documentos profesionales" description="El titulo profesional y el diplomado son obligatorios. La maestria es opcional.">
          {[
            ["PROF_AREA", "Titulo profesional en el area"],
            ["MAESTRIA", "Titulo de maestria (opcional)"],
            ["DIP_EDU_SUP", "Diplomado en educacion superior"],
          ].map(([codigo, label]) => {
            const current = requisito(codigo);
            const required = codigo !== "MAESTRIA";
            return (
              <div key={codigo} className="rounded-lg border border-slate-200 p-4 md:col-span-3">
                <h3 className="font-extrabold">{label}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field name={`requisitos[${codigo}][descripcion]`} label="Titulo o descripcion" required={required} defaultValue={current?.descripcion} />
                  <Field name={`requisitos[${codigo}][institucion]`} label="Institucion" required={required} defaultValue={current?.institucion} />
                  <Field name={`requisitos[${codigo}][fecha_obtencion]`} label="Fecha de obtencion" type="date" required={required} defaultValue={current?.fecha_obtencion} />
                  <Field name={`requisitos[${codigo}][codigo_documento]`} label="Nro. profesional o titulo" required={required} defaultValue={current?.codigo_documento} />
                </div>
                <label className="mt-3 block text-sm font-bold text-slate-700">
                  Archivo {docente ? "(dejar vacio para conservar el actual)" : ""}
                  <input
                    name={`documentos[${codigo}]`}
                    type="file"
                    required={!docente && required}
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(event) => setFileNames((names) => ({ ...names, [codigo]: event.target.files?.[0]?.name ?? "" }))}
                    className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2"
                  />
                </label>
                <p className="mt-2 text-sm text-slate-500">{fileNames[codigo] || current?.archivo_nombre_original || "Ningun archivo seleccionado"}</p>
              </div>
            );
          })}
        </StepCard>
      </div>
      <div data-docente-step="4" className={step === 4 ? "" : "hidden"}>
        <div className="mt-5 rounded-lg border border-slate-200 p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">Materias que puede dictar</p>
          <div className="space-y-3">
            {materiaIds.map((value, index) => (
              <div key={index} className="flex gap-2">
                <select value={value} onChange={(event) => setMateriaIds((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3">
                  {materias.map((materia) => <option key={materia.materia_id} value={materia.materia_id}>{materia.nombre}</option>)}
                </select>
                {index === materiaIds.length - 1 && <button type="button" onClick={() => setMateriaIds((items) => [...items, ""])} className="grid h-11 w-11 place-items-center rounded-lg bg-blue-700 text-white"><Plus size={18} /></button>}
                {materiaIds.length > 1 && <button type="button" onClick={() => setMateriaIds((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="grid h-11 w-11 place-items-center rounded-lg bg-red-700 text-white"><Trash2 size={18} /></button>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div data-docente-step="5" className={step === 5 ? "" : "hidden"}>
        <PreviewPanel
          title="Confirmacion"
          description="Verifica los datos ingresados antes de guardar el docente."
          items={[
            ["CI", preview.ci],
            ["Nombres", preview.nombres],
            ["Apellidos", preview.apellidos],
            ["Telefono", preview.telefono],
            ["Correo", preview.correo],
            ["Especialidad", preview.especialidad],
            ["Estado", preview.estado],
            ["Materias", materiaIds.map((id) => materias.find((materia) => String(materia.materia_id) === id)?.nombre).filter(Boolean).join(", ")],
            ["Titulo profesional", fileNames.PROF_AREA || requisito("PROF_AREA")?.archivo_nombre_original || ""],
            ["Maestria (opcional)", fileNames.MAESTRIA || requisito("MAESTRIA")?.archivo_nombre_original || "No presentada"],
            ["Diplomado", fileNames.DIP_EDU_SUP || requisito("DIP_EDU_SUP")?.archivo_nombre_original || ""],
          ]}
        />
      </div>
      <StepActions current={step} total={steps.length} onPrev={prev} onNext={next} />
      {saving && <p className="mt-3 font-bold text-blue-700">Guardando docente y documentos...</p>}
    </form>
  );
}

// MODULO ASIGNACION DOCENTES - asigna docentes disponibles a materias por grupo, sin horarios.
function DocenteAsignacionModule() {
  const [data, setData] = useState<DocenteAsignacionesResponse | null>(null);
  const [gestion, setGestion] = useState("");
  const [grupo, setGrupo] = useState("");
  const [materia, setMateria] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DocenteAsignacion | null>(null);
  const [docenteId, setDocenteId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"materias" | "docentes" | "sin_asignar">("materias");
  const [horarios, setHorarios] = useState<HorarioClase[]>([]);
  const [aulasHorario, setAulasHorario] = useState<Aula[]>([]);
  const [aulaId, setAulaId] = useState("");
  const [dia, setDia] = useState("LUNES");
  const [horaInicio, setHoraInicio] = useState("07:00");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  async function load(gestionId = gestion) {
    const suffix = gestionId ? `?gestion_id=${gestionId}` : "";
    const [response, horariosResponse] = await Promise.all([
      apiGet<DocenteAsignacionesResponse>(`/admin/docentes/asignaciones/grupos${suffix}`),
      apiGet<HorariosResponse>(`/admin/horarios${suffix}`),
    ]);
    setData(response);
    setHorarios(horariosResponse.horarios);
    setAulasHorario(horariosResponse.aulas);
    setAulaId((current) => current || horariosResponse.aulas[0]?.aula_id?.toString() || "");
    setGestion(response.gestion?.gestion_id ?? gestionId);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch(() => setMessage("No se pudo cargar la asignacion de docentes."));
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (data?.asignaciones ?? []).filter((item) => {
    const matchesGrupo = grupo ? String(item.grupo_id) === grupo : true;
    const matchesMateria = materia ? String(item.materia_id) === materia : true;
    const matchesQuery = `${item.grupo} ${item.materia} ${item.docente}`.toLowerCase().includes(query.toLowerCase());
    const matchesView = view === "sin_asignar" ? !item.docente_id : true;
    return matchesGrupo && matchesMateria && matchesQuery && matchesView;
  });
  const docentesList = (data?.docentes ?? []).filter((item) => {
    const materiaNombre = data?.materias.find((row) => row.materia_id === item.materia_id)?.nombre ?? "";
    return `${item.docente} ${materiaNombre}`.toLowerCase().includes(query.toLowerCase());
  });
  const docentesDisponibles = selected
    ? (data?.docentes ?? []).filter((docente) => docente.materia_id === selected.materia_id)
    : [];

  async function saveAssignment() {
    if (!selected || !docenteId) return;
    setSavingAssignment(true);
    try {
      await apiPost("/admin/docentes/asignaciones/grupos", {
        grupo_id: selected.grupo_id,
        materia_id: selected.materia_id,
        docente_id: Number(docenteId),
        observacion,
      });
      setMessage("Docente asignado correctamente.");
      setSelected(null);
      setDocenteId("");
      setObservacion("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo asignar el docente.");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function saveSchedule() {
    if (!selected || !aulaId) return;
    setSavingSchedule(true);
    try {
      await apiPost("/admin/horarios", {
        grupo_id: selected.grupo_id,
        materia_id: selected.materia_id,
        aula_id: Number(aulaId),
        dia,
        hora_inicio: horaInicio,
        hora_fin: addMinutes(horaInicio, 90),
      });
      setMessage("Horario agregado correctamente.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar el horario.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function deleteSchedule(horarioId: number) {
    await apiDelete(`/admin/horarios/${horarioId}`);
    setMessage("Horario eliminado correctamente.");
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold">Asignacion de docentes a grupos</h2>
            <p className="mt-1 text-slate-600">Administra que docente dictara cada materia programada por grupo.</p>
          </div>
          <button onClick={() => load().catch(() => setMessage("No se pudo actualizar la asignacion de docentes."))} className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-blue-950">Actualizar</button>
        </div>
        {message && <div className="mt-4 whitespace-pre-line rounded-lg bg-blue-50 p-3 font-semibold text-blue-900">{message}</div>}
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <select value={gestion} onChange={(event) => { setGestion(event.target.value); load(event.target.value).catch(() => setMessage("No se pudo cargar la gestion seleccionada.")); }} className="h-11 rounded-lg border border-slate-300 px-3">
            {(data?.gestiones ?? []).map((item) => <option key={item.gestion_id} value={item.gestion_id}>{item.gestion_id}</option>)}
          </select>
          <select value={grupo} onChange={(event) => setGrupo(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3">
            <option value="">Todos los grupos</option>
            {(data?.grupos ?? []).map((item) => <option key={item.grupo_id} value={item.grupo_id}>{item.codigo}</option>)}
          </select>
          <select value={materia} onChange={(event) => setMateria(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3">
            <option value="">Todas las materias</option>
            {(data?.materias ?? []).map((item) => <option key={item.materia_id} value={item.materia_id}>{item.nombre}</option>)}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3" placeholder="Buscar materia, grupo o docente" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricButton active={view === "materias"} label="Materias" value={data?.resumen.materias_programadas ?? 0} icon={BookOpen} onClick={() => setView("materias")} />
        <MetricButton active={view === "docentes"} label="Docentes disponibles" value={data?.resumen.docentes_disponibles ?? 0} icon={Users} onClick={() => setView("docentes")} />
        <MetricButton active={view === "sin_asignar"} label="Sin asignar" value={data?.resumen.sin_asignar ?? 0} icon={ClipboardList} onClick={() => setView("sin_asignar")} />
      </div>

      <div className={`grid gap-5 ${view === "docentes" ? "" : "xl:grid-cols-[1fr_340px]"}`}>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          {view === "docentes" ? (
            <DocentesDisponiblesList rows={docentesList} materias={data?.materias ?? []} />
          ) : (
            <Table
              columns={["grupo", "materia", "docente", "estado"]}
              rows={filtered as unknown as Array<Record<string, unknown>>}
              actions={(row) => {
                const item = row as unknown as DocenteAsignacion;
                return (
                  <button onClick={() => { setSelected(item); setDocenteId(item.docente_id ? String(item.docente_id) : ""); setObservacion(item.observacion ?? ""); }} className={`rounded-lg px-4 py-2 font-bold ${item.docente_id ? "border border-blue-700 text-blue-700" : "bg-blue-700 text-white"}`}>
                    {item.docente_id ? "Reasignar" : "Asignar"}
                  </button>
                );
              }}
            />
          )}
        </div>

        {view !== "docentes" && <aside className="rounded-lg bg-white p-5 shadow-sm">
          <h3 className="text-xl font-extrabold">Asignar docente</h3>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-bold text-slate-600">Materia seleccionada</p>
                <p className="font-extrabold text-blue-950">{selected.materia}</p>
                <p className="text-sm text-slate-600">Grupo: {selected.grupo}</p>
              </div>
              <label className="block text-sm font-bold text-slate-700">
                Seleccionar docente
                <select value={docenteId} onChange={(event) => setDocenteId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3">
                  <option value="">Seleccione un docente</option>
                  {docentesDisponibles.map((docente) => <option key={docente.docente_id} value={docente.docente_id}>{docente.docente} - {docente.grupos_disponibles} grupos disponibles</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Observaciones
                <textarea value={observacion} onChange={(event) => setObservacion(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3" placeholder="Agregue una observacion opcional" />
              </label>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-bold">Cancelar</button>
                <button onClick={saveAssignment} disabled={savingAssignment} className="flex-1 rounded-lg bg-blue-700 px-4 py-3 font-bold text-white shadow-md transition active:translate-y-px active:shadow-inner disabled:cursor-not-allowed disabled:opacity-60">
                  {savingAssignment ? "Asignando..." : "Asignar docente"}
                </button>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-extrabold text-blue-950">Agregar horario</h4>
                <p className="mt-1 text-sm text-slate-600">Bloques de 1h30 entre 07:00 y 20:30.</p>
                <div className="mt-3 grid gap-3">
                  <select value={dia} onChange={(event) => setDia(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3">
                    {["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                  <input type="time" min="07:00" max="19:00" step="1800" value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3" />
                  <select value={aulaId} onChange={(event) => setAulaId(event.target.value)} className="h-11 rounded-lg border border-slate-300 px-3">
                    {aulasHorario.map((aula) => <option key={aula.aula_id} value={aula.aula_id}>{aula.codigo} - cap. {aula.capacidad}</option>)}
                  </select>
                  <button type="button" onClick={saveSchedule} disabled={savingSchedule} className="rounded-lg bg-blue-950 px-4 py-3 font-bold text-white shadow-lg shadow-blue-950/25 ring-1 ring-blue-800 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-px active:shadow-inner disabled:cursor-not-allowed disabled:opacity-60">
                    {savingSchedule ? "Agregando bloque..." : "Agregar bloque"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-slate-600">Selecciona una materia de la tabla para asignar o reasignar docente.</p>
          )}
        </aside>}
      </div>
      <HorarioGrid
        horarios={horarios.filter((item) => !grupo || String(item.grupo_id) === grupo)}
        onDelete={deleteSchedule}
      />
    </div>
  );
}

// MODULO ASIGNACION DOCENTES LISTA - vista alterna cuando se hace click en "Docentes disponibles".
function DocentesDisponiblesList({ rows, materias }: { rows: DocenteDisponible[]; materias: Materia[] }) {
  if (rows.length === 0) {
    return <div className="rounded-lg bg-slate-50 p-8 text-slate-600">No hay docentes disponibles para mostrar.</div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xl font-extrabold">Docentes disponibles</h3>
        <p className="mt-1 text-slate-600">Lista de docentes habilitados por materia y cupos de grupos restantes.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => {
          const materiaNombre = materias.find((materia) => materia.materia_id === row.materia_id)?.nombre ?? "Materia";
          return (
            <article key={`${row.docente_id}-${row.materia_id}`} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-extrabold text-slate-950">{row.docente}</p>
              <p className="mt-1 text-sm font-semibold text-blue-700">{materiaNombre}</p>
              <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${row.grupos_disponibles > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {row.grupos_disponibles} grupos disponibles
              </span>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// MODULO HORARIOS GRID - calendario semanal de grupos, materias, docentes y aulas.
function HorarioGrid({ horarios, onDelete }: { horarios: HorarioClase[]; onDelete: (horarioId: number) => void }) {
  const dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
  const horas = ["07:00", "08:30", "10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"];
  const colors = ["bg-blue-50 border-blue-100 text-blue-950", "bg-emerald-50 border-emerald-100 text-emerald-950", "bg-amber-50 border-amber-100 text-amber-950", "bg-rose-50 border-rose-100 text-rose-950", "bg-violet-50 border-violet-100 text-violet-950"];

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold">Horarios de grupos</h3>
          <p className="mt-1 text-slate-600">Vista semanal de materias programadas. Cada bloque dura 1 hora y 30 minutos.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{horarios.length} bloques</span>
      </div>
      <div className="mt-5 overflow-auto rounded-lg border border-slate-200">
        <div className="grid min-w-[980px] grid-cols-[90px_repeat(6,minmax(145px,1fr))]">
          <div className="border-b border-r border-slate-200 bg-slate-50 p-3 text-sm font-extrabold">Hora</div>
          {dias.map((dia) => <div key={dia} className="border-b border-r border-slate-200 bg-slate-50 p-3 text-center text-sm font-extrabold">{dia}</div>)}
          {horas.map((hora) => (
            <FragmentRow key={hora} hora={hora} dias={dias} horarios={horarios} colors={colors} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FragmentRow({ hora, dias, horarios, colors, onDelete }: { hora: string; dias: string[]; horarios: HorarioClase[]; colors: string[]; onDelete: (horarioId: number) => void }) {
  return (
    <>
      <div className="min-h-28 border-r border-slate-200 p-3 text-sm font-bold text-slate-600">{hora}<br /><span className="text-xs">{addMinutes(hora, 90)}</span></div>
      {dias.map((dia, dayIndex) => {
        const items = horarios.filter((item) => item.dia === dia && item.hora_inicio === hora);
        return (
          <div key={`${dia}-${hora}`} className="min-h-28 border-r border-slate-200 p-2">
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.horario_id} className={`rounded-lg border p-2 text-xs ${colors[(dayIndex + index) % colors.length]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold">{item.materia}</p>
                      <p className="mt-1">{item.docente}</p>
                      <p>{item.grupo} - {item.aula}</p>
                    </div>
                    <button title="Eliminar horario" onClick={() => onDelete(item.horario_id)} className="rounded bg-white/80 p-1 text-red-700"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function addMinutes(time: string, minutes: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// MODULO GESTIONES - alta de gestiones academicas con codigo YYYY-S.
function CrudGestion({ rows, onSubmit }: { rows: Gestion[]; onSubmit: (data: Record<string, unknown>) => void }) {
  return <><FormShell title="Registrar gestion" onSubmit={onSubmit}><Field name="gestion_id" label="Codigo gestion" /><Field name="nombre" label="Nombre" /><Field name="fecha_inicio_inscripcion" label="Inicio inscripcion" type="date" /><Field name="fecha_fin_inscripcion" label="Fin inscripcion" type="date" /><SelectField name="estado" label="Estado"><option>PLANIFICADA</option><option>INSCRIPCION_ABIERTA</option><option>INSCRIPCION_CERRADA</option><option>FINALIZADA</option></SelectField></FormShell><Table columns={["gestion_id", "nombre", "fecha_inicio_inscripcion", "fecha_fin_inscripcion", "estado"]} rows={rows as unknown as Array<Record<string, unknown>>} /></>;
}

// MODULO CUPOS - define cupos por carrera y gestion para procesar admisiones.
function CrudCupo({ rows, carreras, gestiones, onSubmit }: { rows: CupoCarrera[]; carreras: Carrera[]; gestiones: Gestion[]; onSubmit: (data: Record<string, unknown>) => void }) {
  const [editing, setEditing] = useState<CupoCarrera | null>(null);

  return (
    <>
      <FormShell title="Definir cupo por carrera" onSubmit={onSubmit}>
        <SelectField name="gestion_id" label="Gestion">{gestiones.map((g) => <option key={g.gestion_id} value={g.gestion_id}>{g.gestion_id}</option>)}</SelectField>
        <SelectField name="carrera_id" label="Carrera">{carreras.map((c) => <option key={c.carrera_id} value={c.carrera_id}>{c.nombre}</option>)}</SelectField>
        <Field name="cupo" label="Cupo" type="number" />
      </FormShell>
      <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-extrabold">Cupos disponibles por carrera</h2>
        <p className="mt-2 text-slate-600">La admision usa estos cupos para admitir solo a los mejores promedios por carrera y gestion.</p>
        <Table
          columns={["gestion", "carrera", "cupo", "cupos_ocupados", "cupos_disponibles"]}
          rows={rows as unknown as Array<Record<string, unknown>>}
          actions={(row) => <button onClick={() => setEditing(row as unknown as CupoCarrera)} className="rounded-lg bg-blue-700 p-2 text-white"><Pencil size={18} /></button>}
        />
      </div>
      {editing && (
        <Modal title="Modificar cupo de carrera" onClose={() => setEditing(null)}>
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onSubmit({
              gestion_id: editing.gestion_id,
              carrera_id: editing.carrera_id,
              cupo: form.get("cupo"),
            });
            setEditing(null);
          }} className="grid gap-4">
            <div className="rounded-lg bg-blue-50 p-4 font-bold text-blue-950">{editing.gestion} - {editing.carrera}</div>
            <Field name="cupo" label="Nuevo cupo" type="number" defaultValue={editing.cupo} />
            <button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white">Guardar cambio</button>
          </form>
        </Modal>
      )}
    </>
  );
}

// MODULO POSTULANTES - registro, busqueda, filtros, edicion, eliminacion y grupo asignado.
function CrudPostulante({ readOnly = false, carreras, gestiones, grupos, onSubmit, onUpdate, onDelete }: { readOnly?: boolean; carreras: Carrera[]; gestiones: Gestion[]; grupos: GrupoResumen["grupos"]; onSubmit: (data: Record<string, unknown>) => Promise<void> | void; onUpdate: (id: number, data: Record<string, unknown>) => Promise<void> | void; onDelete: (id: number) => Promise<void> | void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [estado, setEstado] = useState("");
  const [gestion, setGestion] = useState("");
  const [carrera, setCarrera] = useState("");
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pageData, setPageData] = useState<PaginatedResponse<Postulante>>({
    data: [],
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });
  const [editing, setEditing] = useState<Postulante | null>(null);
  const [deleting, setDeleting] = useState<Postulante | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadPostulantes() {
      setLoadingRows(true);
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
      if (estado) params.set("estado", estado);
      if (gestion) params.set("gestion_id", gestion);
      if (carrera) params.set("carrera_id", carrera);

      try {
        const response = await apiGet<PaginatedResponse<Postulante>>(`/admin/postulantes?${params.toString()}`);
        if (!cancelled) {
          setPageData(response);
          setLoadError("");
        }
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    }

    loadPostulantes().catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : "No se pudo cargar postulantes.");
    });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery, estado, gestion, carrera, refreshVersion]);

  function resetPage() {
    setPage(1);
  }

  async function submitAndRefresh(payload: Record<string, unknown>) {
    await Promise.resolve(onSubmit(payload));
    setRefreshVersion((value) => value + 1);
  }

  async function updateAndRefresh(id: number, payload: Record<string, unknown>) {
    await Promise.resolve(onUpdate(id, payload));
    setRefreshVersion((value) => value + 1);
  }

  async function deleteAndRefresh(id: number) {
    await Promise.resolve(onDelete(id));
    setRefreshVersion((value) => value + 1);
  }

  return (
    <>
      {!readOnly && <PostulanteWizard gestiones={gestiones} carreras={carreras} onSubmit={submitAndRefresh} />}

      <div className="mt-6 grid gap-3 rounded-lg bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_220px]">
        <div className="flex items-center gap-3">
          <Search className="text-slate-500" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} className="h-11 flex-1 rounded-lg border border-slate-300 px-3" placeholder="Buscar por CI, nombre, apellido o correo" />
        </div>
        <select value={estado} onChange={(event) => { setEstado(event.target.value); resetPage(); }} className="h-11 rounded-lg border border-slate-300 px-3">
          <option value="">Todos los estados</option>
          <option>REGISTRADO</option>
          <option>INSCRITO</option>
          <option>RETIRADO</option>
          <option>ANULADO</option>
        </select>
        <select value={gestion} onChange={(event) => { setGestion(event.target.value); resetPage(); }} className="h-11 rounded-lg border border-slate-300 px-3">
          <option value="">Todas las gestiones</option>
          {gestiones.map((item) => <option key={item.gestion_id} value={item.gestion_id}>{item.gestion_id}</option>)}
        </select>
        <select value={carrera} onChange={(event) => { setCarrera(event.target.value); resetPage(); }} className="h-11 rounded-lg border border-slate-300 px-3">
          <option value="">Todas las carreras</option>
          {carreras.map((item) => <option key={item.carrera_id} value={item.carrera_id}>{item.nombre}</option>)}
        </select>
      </div>

      {loadingRows && <div className="mt-4 rounded-lg bg-blue-50 p-4 font-bold text-blue-900">Cargando postulantes...</div>}
      {loadError && <div className="mt-4 rounded-lg bg-red-50 p-4 font-bold text-red-700">{loadError}</div>}
      <Table
        columns={["postulante_id", "ci", "nombres", "apellidos", "grupo_asignado", "correo", "carrera_opcion_1", "carrera_opcion_2", "estado"]}
        rows={pageData.data as unknown as Array<Record<string, unknown>>}
        compact
        paginated={false}
        actions={readOnly ? undefined : (row) => (
          <div className="flex gap-2">
            <button onClick={() => setEditing(row as unknown as Postulante)} className="rounded-lg bg-blue-700 p-2 text-white"><Pencil size={18} /></button>
            <button onClick={() => setDeleting(row as unknown as Postulante)} className="rounded-lg bg-red-700 p-2 text-white"><Trash2 size={18} /></button>
          </div>
        )}
      />
      <PaginationControls page={pageData.current_page} lastPage={pageData.last_page} total={pageData.total} from={pageData.from} to={pageData.to} onPageChange={setPage} />

      {editing && <EditPostulanteModal postulante={editing} grupos={grupos} onClose={() => setEditing(null)} onSubmit={(payload) => { updateAndRefresh(editing.postulante_id, payload); setEditing(null); }} />}
      {deleting && (
        <Modal title="Eliminar postulante" onClose={() => setDeleting(null)}>
          <p className="text-lg">¿Estas seguro de eliminar al postulante {deleting.nombres} {deleting.apellidos}?</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setDeleting(null)} className="rounded-lg border px-5 py-3 font-bold">Cancelar</button>
            <button onClick={() => { deleteAndRefresh(deleting.postulante_id); setDeleting(null); }} className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white">Eliminar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// MODULO POSTULANTES FORMULARIO - asistente de 5 pasos con confirmacion de datos.
function PostulanteWizard({ gestiones, carreras, onSubmit }: { gestiones: Gestion[]; carreras: Carrera[]; onSubmit: (data: Record<string, unknown>) => Promise<void> | void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>>({
    gestion_id: gestiones[0]?.gestion_id ?? "",
    sexo: "M",
    carrera_opcion_1: carreras[0]?.carrera_id ? String(carreras[0].carrera_id) : "",
    carrera_opcion_2: carreras[0]?.carrera_id ? String(carreras[0].carrera_id) : "",
  });
  const steps = ["Datos personales", "Contacto", "Informacion academica", "Carreras", "Confirmacion"];
  const stepFields = [
    ["gestion_id", "ci", "nombres", "apellidos", "fecha_nacimiento", "sexo"],
    ["direccion", "telefono", "correo", "ciudad"],
    ["colegio_procedencia", "titulo_bachiller_codigo"],
    ["carrera_opcion_1", "carrera_opcion_2"],
    [],
  ];
  const next = () => {
    const values = formRef.current ? formValues(formRef.current) : {};
    setPreview(values);
    const missing = stepFields[step].filter((field) => !values[field] || values[field].trim() === "");
    if (missing.length > 0) {
      setFieldErrors(missing);
      return;
    }
    setFieldErrors([]);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  };
  const prev = () => {
    if (formRef.current) setPreview(formValues(formRef.current));
    setFieldErrors([]);
    setStep((value) => Math.max(value - 1, 0));
  };

  return (
    <form ref={formRef} onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const missing = stepFields.flat().filter((field) => !String(data[field] ?? "").trim());
      if (missing.length > 0) {
        setFieldErrors(missing);
        setStep(Math.max(0, stepFields.findIndex((fields) => fields.some((field) => missing.includes(field)))));
        return;
      }
      onSubmit(data);
      form.reset();
      setFieldErrors([]);
      setPreview({
        gestion_id: gestiones[0]?.gestion_id ?? "",
        sexo: "M",
        carrera_opcion_1: carreras[0]?.carrera_id ? String(carreras[0].carrera_id) : "",
        carrera_opcion_2: carreras[0]?.carrera_id ? String(carreras[0].carrera_id) : "",
      });
      setStep(0);
    }} onChange={(event) => setPreview(formValues(event.currentTarget))} noValidate className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold"><Plus size={22} /> Registrar postulante</h2>
      <StepHeader steps={steps} current={step} />

      <div className={step === 0 ? "" : "hidden"}>
        <StepCard title="Datos personales" description="Ingresa la informacion basica del postulante.">
          <SelectField name="gestion_id" label="Gestion" error={fieldErrors.includes("gestion_id")}>{gestiones.map((g) => <option key={g.gestion_id} value={g.gestion_id}>{g.gestion_id}</option>)}</SelectField>
          <Field name="ci" label="CI" error={fieldErrors.includes("ci")} />
          <Field name="nombres" label="Nombres" error={fieldErrors.includes("nombres")} />
          <Field name="apellidos" label="Apellidos" error={fieldErrors.includes("apellidos")} />
          <Field name="fecha_nacimiento" label="Fecha nacimiento" type="date" error={fieldErrors.includes("fecha_nacimiento")} />
          <SelectField name="sexo" label="Sexo" error={fieldErrors.includes("sexo")}><option>M</option><option>F</option><option>OTRO</option></SelectField>
        </StepCard>
      </div>

      <div className={step === 1 ? "" : "hidden"}>
        <StepCard title="Contacto" description="Datos de contacto y residencia.">
          <Field name="direccion" label="Direccion" error={fieldErrors.includes("direccion")} />
          <Field name="telefono" label="Telefono" error={fieldErrors.includes("telefono")} />
          <Field name="correo" label="Correo" type="email" error={fieldErrors.includes("correo")} />
          <Field name="ciudad" label="Ciudad" error={fieldErrors.includes("ciudad")} />
        </StepCard>
      </div>

      <div className={step === 2 ? "" : "hidden"}>
        <StepCard title="Informacion academica" description="Datos del colegio y titulo de bachiller.">
          <Field name="colegio_procedencia" label="Colegio" error={fieldErrors.includes("colegio_procedencia")} />
          <Field name="titulo_bachiller_codigo" label="Codigo titulo bachiller" error={fieldErrors.includes("titulo_bachiller_codigo")} />
        </StepCard>
      </div>

      <div className={step === 3 ? "" : "hidden"}>
        <StepCard title="Carreras" description="Selecciona primera y segunda opcion de postulacion.">
          <SelectField name="carrera_opcion_1" label="Carrera opcion 1" error={fieldErrors.includes("carrera_opcion_1")}>{carreras.map((c) => <option key={c.carrera_id} value={c.carrera_id}>{c.nombre}</option>)}</SelectField>
          <SelectField name="carrera_opcion_2" label="Carrera opcion 2" error={fieldErrors.includes("carrera_opcion_2")}>{carreras.map((c) => <option key={c.carrera_id} value={c.carrera_id}>{c.nombre}</option>)}</SelectField>
        </StepCard>
      </div>

      <div className={step === 4 ? "" : "hidden"}>
        <PreviewPanel
          title="Confirmacion de datos"
          description="Revisa todos los datos ingresados antes de guardar al postulante."
          items={[
            ["Gestion", preview.gestion_id],
            ["CI", preview.ci],
            ["Nombres", preview.nombres],
            ["Apellidos", preview.apellidos],
            ["Fecha nacimiento", preview.fecha_nacimiento],
            ["Sexo", preview.sexo],
            ["Direccion", preview.direccion],
            ["Telefono", preview.telefono],
            ["Correo", preview.correo],
            ["Ciudad", preview.ciudad],
            ["Colegio", preview.colegio_procedencia],
            ["Codigo titulo bachiller", preview.titulo_bachiller_codigo],
            ["Carrera opcion 1", carreras.find((carrera) => String(carrera.carrera_id) === preview.carrera_opcion_1)?.nombre],
            ["Carrera opcion 2", carreras.find((carrera) => String(carrera.carrera_id) === preview.carrera_opcion_2)?.nombre],
          ]}
        />
      </div>

      <StepActions current={step} total={steps.length} onPrev={prev} onNext={next} />
    </form>
  );
}

// MODULO POSTULANTES EDITAR - modal para modificar datos permitidos del postulante.
function EditPostulanteModal({ postulante, grupos, onClose, onSubmit }: { postulante: Postulante; grupos: GrupoResumen["grupos"]; onClose: () => void; onSubmit: (data: Record<string, unknown>) => void }) {
  return (
    <Modal title="Modificar datos del postulante" onClose={onClose}>
      <form onSubmit={(event) => handleForm(event, onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="ci" label="CI" defaultValue={postulante.ci} />
          <Field name="nombres" label="Nombres" defaultValue={postulante.nombres} />
          <Field name="apellidos" label="Apellidos" defaultValue={postulante.apellidos} />
          <Field name="fecha_nacimiento" label="Fecha nacimiento" type="date" defaultValue={postulante.fecha_nacimiento} />
          <SelectField name="sexo" label="Sexo" defaultValue={postulante.sexo}><option>M</option><option>F</option><option>OTRO</option></SelectField>
          <Field name="direccion" label="Direccion" defaultValue={postulante.direccion} />
          <Field name="telefono" label="Telefono" defaultValue={postulante.telefono} />
          <Field name="correo" label="Correo" type="email" defaultValue={postulante.correo} />
          <Field name="colegio_procedencia" label="Colegio" defaultValue={postulante.colegio_procedencia} />
          <Field name="ciudad" label="Ciudad" defaultValue={postulante.ciudad} />
          <Field name="titulo_bachiller_codigo" label="Codigo titulo bachiller" defaultValue={postulante.titulo_bachiller_codigo} />
          <SelectField name="grupo_id" label="Grupo asignado" defaultValue={postulante.grupo_id ?? ""} required={false}>
            <option value="">Sin grupo asignado</option>
            {grupos.map((grupo) => <option key={grupo.grupo_id} value={grupo.grupo_id}>{grupo.codigo}</option>)}
          </SelectField>
          <SelectField name="estado" label="Estado" defaultValue={postulante.estado}><option>REGISTRADO</option><option>INSCRITO</option><option>RETIRADO</option><option>ANULADO</option></SelectField>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-5 py-3 font-bold">Cancelar</button>
          <button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white">Confirmar cambio</button>
        </div>
      </form>
    </Modal>
  );
}

// UI MODAL - ventana emergente base para editar, confirmar y ver detalles.
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 font-bold">Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// UI CONFIRM MODAL - confirmacion reutilizable antes de eliminar registros.
function ConfirmModal({ title, text, onClose, onConfirm }: { title: string; text: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-lg text-slate-700">{text}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-3 font-bold">Cancelar</button>
        <button onClick={onConfirm} className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white">Eliminar</button>
      </div>
    </Modal>
  );
}

// UI ACTION BUTTONS - botones compactos de editar/eliminar en tablas.
function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button title="Editar" onClick={onEdit} className="rounded-lg bg-blue-700 p-2 text-white"><Pencil size={18} /></button>
      <button title="Eliminar" onClick={onDelete} className="rounded-lg bg-red-700 p-2 text-white"><Trash2 size={18} /></button>
    </div>
  );
}

// UI EDIT BASIC MODAL - editor generico para catalogos simples como carreras y materias.
function EditBasicModal({ title, row, idKey, fields, onClose, onConfirm }: { title: string; row: Record<string, unknown>; idKey: string; fields: string[]; onClose: () => void; onConfirm: (data: Record<string, unknown>) => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget).entries());
        onConfirm(data);
      }} className="grid gap-4">
        {fields.map((field) => <Field key={field} name={field} label={field} defaultValue={String(row[field] ?? "")} />)}
        <SelectField name="estado" label="Estado" defaultValue={String(row.estado ?? "ACTIVO")}><option>ACTIVO</option><option>INACTIVO</option></SelectField>
        <input type="hidden" name={idKey} value={String(row[idKey] ?? "")} />
        <button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white">Confirmar cambios</button>
      </form>
    </Modal>
  );
}

