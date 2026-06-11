"use client";

import { API_URL, apiGet, apiPost, BoletaInscripcion, InscripcionOpciones } from "@/lib/api";
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Download, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const initialForm = {
  gestion_id: "",
  ci: "",
  nombres: "",
  apellidos: "",
  fecha_nacimiento: "",
  sexo: "M",
  direccion: "",
  telefono: "",
  correo: "",
  colegio_procedencia: "",
  ciudad: "",
  titulo_bachiller_codigo: "",
  carrera_opcion_1: "",
  carrera_opcion_2: "",
};

const steps = ["Datos personales", "Contacto", "Informacion academica", "Carreras", "Confirmacion", "Pago"];
const stepFields = [
  ["gestion_id", "ci", "nombres", "apellidos", "fecha_nacimiento", "sexo"],
  ["direccion", "telefono", "correo", "ciudad"],
  ["colegio_procedencia", "titulo_bachiller_codigo"],
  ["carrera_opcion_1", "carrera_opcion_2"],
  [],
  [],
];

export default function InscripcionPage() {
  const [options, setOptions] = useState<InscripcionOpciones | null>(null);
  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [loading, setLoading] = useState(false);
  const [boleta, setBoleta] = useState<BoletaInscripcion | null>(null);
  const paymentPrepared = useRef(false);

  useEffect(() => {
    apiGet<InscripcionOpciones>("/inscripciones/opciones")
      .then((data) => {
        setOptions(data);
        setSecondsLeft(data.tiempo_pago_segundos);
        setForm((current) => ({
          ...current,
          gestion_id: data.gestiones[0]?.gestion_id ?? "",
          carrera_opcion_1: data.carreras[0]?.carrera_id ? String(data.carreras[0].carrera_id) : "",
          carrera_opcion_2: data.carreras[1]?.carrera_id ? String(data.carreras[1].carrera_id) : "",
        }));
      })
      .catch(() => setMessage("No se pudieron cargar las opciones de inscripcion."));
  }, []);

  useEffect(() => {
    if (step !== 5 || !token || boleta) return;
    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setMessage("El tiempo para confirmar el pago vencio. Vuelve a revisar tus datos e inicia de nuevo la pasarela.");
          setToken("");
          paymentPrepared.current = false;
          setStep(4);
          return 0;
        }

        return value - 1;
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [step, token, secondsLeft, boleta]);

  const carrera1 = useMemo(() => options?.carreras.find((item) => String(item.carrera_id) === form.carrera_opcion_1), [options, form.carrera_opcion_1]);
  const carrera2 = useMemo(() => options?.carreras.find((item) => String(item.carrera_id) === form.carrera_opcion_2), [options, form.carrera_opcion_2]);

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => current.filter((item) => item !== name));
  }

  async function next() {
    setMessage("");
    const missing = stepFields[step].filter((field) => !String(form[field] ?? "").trim());
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }
    if (step === 3 && form.carrera_opcion_1 === form.carrera_opcion_2) {
      setErrors(["carrera_opcion_2"]);
      setMessage("La segunda carrera debe ser diferente de la primera.");
      return;
    }
    if (step === 4) {
      await preparePayment();
      return;
    }
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  async function preparePayment() {
    if (paymentPrepared.current && token) {
      setStep(5);
      return;
    }
    setLoading(true);
    try {
      const response = await apiPost<{ token: string; expira_en: string; monto: number }>("/inscripciones/preparar", form);
      setToken(response.token);
      setSecondsLeft(options?.tiempo_pago_segundos ?? 300);
      paymentPrepared.current = true;
      setStep(5);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar la pasarela de pago.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmPayment() {
    if (!token) return;
    setLoading(true);
    try {
      const response = await apiPost<BoletaInscripcion>(`/inscripciones/${token}/confirmar-pago`, {
        metodo: "SIMULADO",
        monto: options?.monto_inscripcion ?? 200,
      });
      setBoleta(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo confirmar el pago.");
    } finally {
      setLoading(false);
    }
  }

  if (boleta) {
    return <BoletaScreen boleta={boleta} token={token} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 font-bold text-blue-900">
            <ArrowLeft size={18} /> Volver al inicio
          </Link>
          <div className="flex items-center gap-3 font-extrabold text-blue-900">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-700 text-white"><UserPlus /></div>
            Inscripcion de postulante
          </div>
        </div>

        <form onSubmit={(event) => event.preventDefault()} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <StepHeader current={step} />
          {message && <div className="mb-4 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 font-semibold text-red-700">{message}</div>}

          {step === 0 && (
            <StepCard title="Datos personales" description="Completa tu informacion basica para iniciar la postulacion.">
              <SelectField name="gestion_id" label="Gestion" value={form.gestion_id} error={errors.includes("gestion_id")} onChange={update}>
                {(options?.gestiones ?? []).map((item) => <option key={item.gestion_id} value={item.gestion_id}>{item.gestion_id} - {item.nombre}</option>)}
              </SelectField>
              <Field name="ci" label="CI" value={form.ci} error={errors.includes("ci")} onChange={update} />
              <Field name="nombres" label="Nombres" value={form.nombres} error={errors.includes("nombres")} onChange={update} />
              <Field name="apellidos" label="Apellidos" value={form.apellidos} error={errors.includes("apellidos")} onChange={update} />
              <Field name="fecha_nacimiento" label="Fecha nacimiento" type="date" value={form.fecha_nacimiento} error={errors.includes("fecha_nacimiento")} onChange={update} />
              <SelectField name="sexo" label="Sexo" value={form.sexo} error={errors.includes("sexo")} onChange={update}><option>M</option><option>F</option><option>OTRO</option></SelectField>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard title="Contacto" description="Estos datos se usaran para avisos del proceso de admision.">
              <Field name="direccion" label="Direccion" value={form.direccion} error={errors.includes("direccion")} onChange={update} />
              <Field name="telefono" label="Telefono" value={form.telefono} error={errors.includes("telefono")} onChange={update} />
              <Field name="correo" label="Correo electronico" type="email" value={form.correo} error={errors.includes("correo")} onChange={update} />
              <Field name="ciudad" label="Ciudad" value={form.ciudad} error={errors.includes("ciudad")} onChange={update} />
            </StepCard>
          )}

          {step === 2 && (
            <StepCard title="Informacion academica" description="Registra colegio de procedencia y titulo de bachiller.">
              <Field name="colegio_procedencia" label="Colegio de procedencia" value={form.colegio_procedencia} error={errors.includes("colegio_procedencia")} onChange={update} />
              <Field name="titulo_bachiller_codigo" label="Codigo titulo bachiller" value={form.titulo_bachiller_codigo} error={errors.includes("titulo_bachiller_codigo")} onChange={update} />
            </StepCard>
          )}

          {step === 3 && (
            <StepCard title="Carreras" description="Elige primera y segunda opcion de carrera.">
              <SelectField name="carrera_opcion_1" label="Carrera opcion 1" value={form.carrera_opcion_1} error={errors.includes("carrera_opcion_1")} onChange={update}>
                {(options?.carreras ?? []).map((item) => <option key={item.carrera_id} value={item.carrera_id}>{item.nombre}</option>)}
              </SelectField>
              <SelectField name="carrera_opcion_2" label="Carrera opcion 2" value={form.carrera_opcion_2} error={errors.includes("carrera_opcion_2")} onChange={update}>
                {(options?.carreras ?? []).map((item) => <option key={item.carrera_id} value={item.carrera_id}>{item.nombre}</option>)}
              </SelectField>
            </StepCard>
          )}

          {step === 4 && (
            <Preview
              form={form}
              carrera1={carrera1?.nombre}
              carrera2={carrera2?.nombre}
              monto={options?.monto_inscripcion ?? 200}
            />
          )}

          {step === 5 && (
            <PaymentPanel secondsLeft={secondsLeft} monto={options?.monto_inscripcion ?? 200} loading={loading} onConfirm={confirmPayment} />
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
            <button type="button" disabled={step === 0 || loading} onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-slate-700 disabled:opacity-50">Anterior</button>
            {step < 5 ? (
              <button type="button" disabled={loading} onClick={next} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 font-bold text-white disabled:opacity-60">
                {loading ? "Preparando..." : "Siguiente"} <ArrowRight size={18} />
              </button>
            ) : (
              <button type="button" disabled={loading || !token} onClick={confirmPayment} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-6 py-3 font-bold text-white disabled:opacity-60">
                {loading ? "Confirmando..." : "Confirmar pago"} <CreditCard size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function StepHeader({ current }: { current: number }) {
  return (
    <div className="mb-6">
      <div className="grid gap-3 md:grid-cols-6">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${index <= current ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-500"}`}>{index + 1}</span>
            <span className={`text-sm font-bold ${index === current ? "text-blue-700" : "text-slate-500"}`}>{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-700" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

function StepCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-blue-100">
      <div className="border-b border-blue-100 bg-blue-50 p-5">
        <h1 className="text-xl font-extrabold text-blue-950">{title}</h1>
        <p className="mt-1 font-semibold text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({ name, label, value, onChange, type = "text", error = false }: { name: string; label: string; value: string; onChange: (name: string, value: string) => void; type?: string; error?: boolean }) {
  return (
    <label className={`block text-sm font-bold ${error ? "text-red-700" : "text-slate-700"}`}>
      {label}
      <input value={value} onChange={(event) => onChange(name, event.target.value)} type={type} className={`mt-2 h-12 w-full rounded-lg border bg-white px-3 ${error ? "border-red-500 ring-2 ring-red-100" : "border-slate-300"}`} />
      {error && <span className="mt-1 block text-xs">Campo obligatorio</span>}
    </label>
  );
}

function SelectField({ name, label, value, onChange, children, error = false }: { name: string; label: string; value: string; onChange: (name: string, value: string) => void; children: React.ReactNode; error?: boolean }) {
  return (
    <label className={`block text-sm font-bold ${error ? "text-red-700" : "text-slate-700"}`}>
      {label}
      <select value={value} onChange={(event) => onChange(name, event.target.value)} className={`mt-2 h-12 w-full rounded-lg border bg-white px-3 ${error ? "border-red-500 ring-2 ring-red-100" : "border-slate-300"}`}>{children}</select>
      {error && <span className="mt-1 block text-xs">Campo obligatorio</span>}
    </label>
  );
}

function Preview({ form, carrera1, carrera2, monto }: { form: Record<string, string>; carrera1?: string; carrera2?: string; monto: number }) {
  const items = [
    ["Gestion", form.gestion_id],
    ["CI", form.ci],
    ["Nombres", form.nombres],
    ["Apellidos", form.apellidos],
    ["Fecha nacimiento", form.fecha_nacimiento],
    ["Sexo", form.sexo],
    ["Direccion", form.direccion],
    ["Telefono", form.telefono],
    ["Correo", form.correo],
    ["Ciudad", form.ciudad],
    ["Colegio", form.colegio_procedencia],
    ["Titulo bachiller", form.titulo_bachiller_codigo],
    ["Carrera opcion 1", carrera1],
    ["Carrera opcion 2", carrera2],
    ["Monto de inscripcion", `Bs. ${monto}`],
  ];
  return (
    <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-blue-950"><FileText /> Confirmacion de datos</h1>
      <p className="mt-2 font-semibold text-slate-600">Verifica tus datos antes de pasar a la pasarela de pago simulada.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
            <p className="mt-1 min-h-6 break-words font-bold text-slate-900">{value || "Sin dato"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PaymentPanel({ secondsLeft, monto, loading, onConfirm }: { secondsLeft: number; monto: number; loading: boolean; onConfirm: () => void }) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-blue-950"><CreditCard /> Pasarela de pago simulada</h1>
          <p className="mt-2 text-slate-600">Por ahora este pago es estatico. Mas adelante puedes conectar Stripe usando este mismo paso.</p>
          <div className="mt-6 rounded-lg bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-500">Monto a pagar</p>
            <p className="mt-2 text-4xl font-extrabold text-blue-700">Bs. {monto}</p>
            <p className="mt-4 font-semibold text-slate-600">Metodo: pago simulado</p>
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="font-bold">Tiempo restante</p>
          <p className="mt-3 text-5xl font-extrabold">{minutes}:{seconds}</p>
          <p className="mt-3 text-sm font-semibold">Si el tiempo llega a cero, la operacion se cancela y tendras que confirmar nuevamente tus datos.</p>
          <button type="button" disabled={loading} onClick={onConfirm} className="mt-6 w-full rounded-lg bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-60">Confirmar pago</button>
        </div>
      </div>
    </section>
  );
}

function BoletaScreen({ boleta, token }: { boleta: BoletaInscripcion; token: string }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-6xl rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold text-blue-950"><CheckCircle2 className="text-emerald-600" /> Inscripcion completada</h1>
            <p className="mt-2 text-slate-600">Tu pago fue confirmado y la inscripcion quedo consolidada.</p>
          </div>
          <a href={`${API_URL}/inscripciones/${token}/boleta.pdf`} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-3 font-bold text-white">
            <Download size={18} /> Descargar PDF
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="ID Postulante" value={String(boleta.postulante.postulante_id)} />
          <Info label="Nombre" value={`${boleta.postulante.nombres} ${boleta.postulante.apellidos}`} />
          <Info label="Gestion" value={boleta.postulante.gestion_id ?? ""} />
          <Info label="Grupo" value={boleta.postulante.grupo_asignado || "Pendiente de grupo"} tone={boleta.estado_grupo === "ASIGNADO" ? "green" : "amber"} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title="Carreras postuladas">
            {boleta.carreras.map((item) => <Info key={item.orden} label={`Opcion ${item.orden}`} value={item.nombre} />)}
          </Panel>
          <Panel title="Pago">
            <Info label="Estado" value={boleta.pago.estado} tone="green" />
            <Info label="Metodo" value={boleta.pago.metodo} />
            <Info label="Monto" value={`Bs. ${boleta.pago.monto}`} />
            <Info label="Comprobante" value={boleta.pago.numero_comprobante} />
          </Panel>
        </div>

        <Panel title="Materias y horarios">
          <div className="mt-3 overflow-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-blue-700 text-white"><tr><th className="px-3 py-3">Materia</th><th className="px-3 py-3">Docente</th><th className="px-3 py-3">Dia</th><th className="px-3 py-3">Horario</th><th className="px-3 py-3">Aula</th></tr></thead>
              <tbody>
                {boleta.materias.map((item, index) => (
                  <tr key={`${item.materia_id}-${index}`} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-bold">{item.nombre}</td>
                    <td className="px-3 py-3">{item.docente ?? "Pendiente"}</td>
                    <td className="px-3 py-3">{item.dia ?? "Pendiente"}</td>
                    <td className="px-3 py-3">{item.hora_inicio ? `${item.hora_inicio} - ${item.hora_fin}` : "Pendiente"}</td>
                    <td className="px-3 py-3">{item.aula ?? "Pendiente"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-xl font-extrabold text-blue-950">{title}</h2>{children}</section>;
}

function Info({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-950",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <div className={`mt-3 rounded-lg p-4 ${tones[tone]}`}><p className="text-xs font-bold uppercase opacity-70">{label}</p><p className="mt-1 break-words font-extrabold">{value || "Sin dato"}</p></div>;
}
