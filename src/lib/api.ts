export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

// API CLIENTE - agrega automaticamente el token del administrador a las rutas protegidas.
// Si el backend cambia de puerto o dominio, modifica NEXT_PUBLIC_API_URL en frontend/.env.local.
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// API GET - se usa para listar datos: postulantes, carreras, grupos, reportes, etc.
// Por defecto mantiene no-store para datos administrativos sensibles; el backend ya cachea consultas pesadas.
export async function apiGet<T>(path: string, options: { cache?: RequestCache } = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: options.cache ?? "no-store", headers: authHeaders() });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(formatApiError(detail, `Error al consultar ${path}`));
  }
  return response.json();
}

// API POST - se usa para crear registros o ejecutar procesos: login, registrar postulante, asignar grupos.
export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(formatApiError(detail, `Error al guardar ${path}`));
  }

  return response.json();
}

// API PUT - se usa para modificar registros existentes: carreras, materias, docentes, grupos, portal.
export async function apiPut<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(formatApiError(detail, `Error al actualizar ${path}`));
  }
  return response.json();
}

// API DELETE - se usa para eliminar registros desde los botones de acciones.
export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { Accept: "application/json", ...authHeaders() },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(formatApiError(detail, `Error al eliminar ${path}`));
  }
  return response.json();
}

type ApiErrorDetail = {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[]>;
};

// ERRORES API - convierte errores de Laravel a mensajes legibles para el administrador.
// Todas las funciones HTTP pasan por aqui para evitar mensajes tecnicos como validation.unique.
function formatApiError(detail: ApiErrorDetail, fallback: string) {
  if (Array.isArray(detail.errors)) {
    return detail.errors.map((item) => `- ${item}`).join("\n");
  }

  if (detail.errors && typeof detail.errors === "object") {
    return Object.values(detail.errors).flat().map((item) => `- ${item}`).join("\n");
  }

  return detail.message ?? detail.error ?? fallback;
}

// TIPOS FRONTEND - reflejan la estructura JSON que devuelve Laravel.
// Si agregas columnas en el backend, este es el primer lugar para tiparlas en React.
export type Gestion = {
  gestion_id: string;
  nombre: string;
  fecha_inicio_inscripcion: string;
  fecha_fin_inscripcion: string;
  estado: string;
};

export type Carrera = {
  carrera_id: number;
  codigo: string;
  nombre: string;
  estado: string;
};

export type Materia = {
  materia_id: number;
  codigo: string;
  nombre: string;
  estado: string;
};

export type Aula = {
  aula_id: number;
  codigo: string;
  nombre: string;
  capacidad: number;
  ubicacion?: string;
  estado: string;
};

export type Grupo = {
  grupo_id: number;
  gestion_id: string;
  codigo: string;
  capacidad_maxima: number;
  turno?: string;
  estado: string;
  total_estudiantes: number;
};

export type GrupoResumen = {
  gestion?: Gestion;
  total_inscritos: number;
  grupos_necesarios: number;
  grupos_habilitados: number;
  pendientes_sin_grupo: number;
  grupos: Grupo[];
};

export type Docente = {
  docente_id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  especialidad: string;
  estado: string;
  materia_ids?: number[];
  materias?: string;
};

export type Postulante = {
  postulante_id: number;
  gestion_id?: string;
  gestion?: string;
  ci: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string;
  sexo?: string;
  direccion?: string;
  telefono?: string;
  correo: string;
  colegio_procedencia?: string;
  ciudad?: string;
  titulo_bachiller_codigo?: string;
  carrera_opcion_1?: string;
  carrera_opcion_2?: string;
  grupo_id?: number | null;
  grupo_asignado?: string | null;
  estado: string;
};

export type PromedioPostulante = {
  postulante_id: number;
  gestion_id: string;
  ci: string;
  nombres: string;
  apellidos: string;
  sexo?: string;
  promedio_final: string;
  promedio_desempate: string;
  estado_academico_calculado: string;
  estado_academico?: string | null;
  estado_admision?: string | null;
  carrera_admitida?: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
};

export type CupoCarrera = {
  gestion_id: string;
  gestion: string;
  carrera_id: number;
  carrera: string;
  cupo: number;
  cupos_ocupados: number;
  cupos_disponibles: number;
};

export type NotasMateria = {
  materia_id: number;
  codigo: string;
  nombre: string;
  examen_1: string | null;
  examen_2: string | null;
  examen_3: string | null;
};

export type Bitacora = {
  accion_id: number;
  accion: string;
  tabla_afectada: string | null;
  registro_id: string | null;
  descripcion: string;
  fecha_hora: string;
  ip: string | null;
};

export type DocenteAsignacion = {
  grupo_id: number;
  materia_id: number;
  docente_id: number | null;
  observacion: string | null;
  gestion_id: string;
  grupo: string;
  materia: string;
  docente: string;
  estado: "ASIGNADO" | "SIN_ASIGNAR";
};

export type HorarioClase = {
  horario_id: number;
  grupo_id: number;
  materia_id: number;
  docente_id: number;
  aula_id: number;
  gestion_id: string;
  grupo: string;
  turno?: string;
  materia: string;
  docente: string;
  aula: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
};

export type HorariosResponse = {
  horarios: HorarioClase[];
  aulas: Aula[];
};

export type InscripcionOpciones = {
  gestiones: Gestion[];
  carreras: Array<Pick<Carrera, "carrera_id" | "codigo" | "nombre">>;
  monto_inscripcion: number;
  tiempo_pago_segundos: number;
};

export type BoletaInscripcion = {
  postulante: Postulante & { gestion?: string; turno?: string };
  carreras: Array<{ orden: number; codigo: string; nombre: string }>;
  pago: {
    pago_id: number;
    monto: string;
    metodo: string;
    numero_comprobante: string;
    estado: string;
    pagado_en?: string;
  };
  materias: Array<{
    materia_id: number;
    codigo: string;
    nombre: string;
    docente?: string;
    dia?: string;
    hora_inicio?: string;
    hora_fin?: string;
    aula?: string;
  }>;
  estado_grupo: "ASIGNADO" | "PENDIENTE_DE_GRUPO";
};

export type DocenteDisponible = {
  docente_id: number;
  materia_id: number;
  docente: string;
  grupos_disponibles: number;
};

export type DocenteAsignacionesResponse = {
  gestion?: Gestion;
  gestiones: Gestion[];
  grupos: Grupo[];
  materias: Materia[];
  docentes: DocenteDisponible[];
  asignaciones: DocenteAsignacion[];
  resumen: {
    materias_programadas: number;
    docentes_disponibles: number;
    sin_asignar: number;
  };
};
