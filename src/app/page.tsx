import { ArrowRight, FileText, GraduationCap, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

// PAGINA PUBLICA - portada, carreras, requisitos y contacto.
// Las carreras se leen desde la API publica /api/portal, pero el logo/fondo se cambian solo aqui.
type HomeData = {
  carreras: Array<{ carrera_id: number; codigo: string; nombre: string }>;
};

// Coloca aqui la ruta o URL de la imagen de fondo de la portada.
// Ejemplos:
// const HERO_BACKGROUND_URL = "/imagenes/fondo-uagrm.jpg";
// const HERO_BACKGROUND_URL = "https://tusitio.com/fondo-uagrm.jpg";
const HERO_BACKGROUND_URL = "/imagenes/curichi_uagrm.jpg";

// Coloca aqui la ruta o URL del logo UAGRM que reemplaza la letra U.
// Ejemplo: const UAGRM_LOGO_URL = "/imagenes/logo-uagrm.png";
const UAGRM_LOGO_URL = "/imagenes/logo_uagrm.png";

const requisitos = [
  ["Titulo de Bachiller", "Documento academico obligatorio."],
  ["Prueba de Admision", "Notas en las cuatro materias."],
  ["Identificacion", "CI y datos personales completos."],
  ["Promedio minimo", "Aprobacion desde 60 puntos."],
] as const;

async function getHomeData(): Promise<HomeData> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"}/portal`, { cache: "no-store" });
    if (!response.ok) throw new Error("home");
    const data = await response.json();
    return { carreras: data.carreras ?? [] };
  } catch {
    return { carreras: [] };
  }
}

// LOGO PUBLICO - si UAGRM_LOGO_URL esta vacio muestra la letra "U"; si tiene ruta muestra imagen.
function Logo({ footer = false, logoUrl = "" }: { footer?: boolean; logoUrl?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-12 w-12 place-items-center rounded-lg ${footer ? "bg-red-700" : "bg-blue-700"} text-xl font-bold text-white`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logoUrl ? <img src={logoUrl} alt="Logo UAGRM" className="h-10 w-10 object-contain" /> : "U"}
      </div>
      <span className={`text-2xl font-bold ${footer ? "text-white" : "text-blue-700"}`}>UAGRM</span>
    </div>
  );
}

export default async function Home() {
  const data = await getHomeData();
  const carreras = data.carreras.length > 0
    ? data.carreras
    : [
        { carrera_id: 1, codigo: "SIS", nombre: "Ingenieria en Sistemas" },
        { carrera_id: 2, codigo: "MED", nombre: "Medicina" },
        { carrera_id: 3, codigo: "ADM", nombre: "Administracion de Empresas" },
        { carrera_id: 4, codigo: "EDU", nombre: "Educacion" },
      ];

  return (
    <main className="bg-white text-slate-950">
      {/* ENCABEZADO PUBLICO - navegacion de la portada y acceso al panel administrativo. */}
      <header className="border-b-4 border-blue-700 bg-white">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Logo logoUrl={UAGRM_LOGO_URL} />
          <div className="hidden items-center gap-10 text-lg font-semibold text-slate-700 md:flex">
            <a href="#carreras">Carreras</a>
            <a href="#admision">Proceso de Admision</a>
            <a href="#requisitos">Requisitos</a>
            <a className="rounded-lg bg-red-700 px-8 py-3 text-white" href="#contacto">Contacto</a>
            <Link className="rounded-lg border border-blue-700 px-6 py-3 text-blue-700" href="/admin">Admin</Link>
          </div>
        </nav>
      </header>

      {/* HERO PUBLICO - aqui se aplica HERO_BACKGROUND_URL como fondo detras del titulo principal. */}
      <section
        id="admision"
        className="relative bg-blue-700 px-6 py-24 text-center text-white"
        style={HERO_BACKGROUND_URL ? { backgroundImage: `linear-gradient(rgba(29, 78, 216, 0.82), rgba(29, 78, 216, 0.9)), url(${HERO_BACKGROUND_URL})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <h1 className="text-5xl font-extrabold leading-tight md:text-8xl">
          Abre las Puertas
          <br />
          a tu <span className="text-red-300">Futuro</span>
        </h1>
        <p className="mx-auto mt-10 max-w-4xl text-2xl leading-relaxed text-blue-50">
          Unete a una comunidad de excelencia academica. Forma parte de la universidad que transforma vidas y construye lideres.
        </p>
        <div className="mt-14 flex flex-col justify-center gap-5 sm:flex-row">
          <Link className="inline-flex items-center justify-center gap-3 rounded-lg bg-red-700 px-10 py-5 text-xl font-bold text-white" href="/inscripcion">
            Solicitar Admision <ArrowRight />
          </Link>
          <a className="rounded-lg border-2 border-white px-10 py-5 text-xl font-bold text-white" href="#carreras">Conocer Carreras</a>
        </div>
      </section>

      {/* CARRERAS PUBLICAS - lista alimentada desde PostgreSQL mediante Laravel. */}
      <section id="carreras" className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-5xl font-extrabold">Nuestras <span className="text-blue-700">Carreras</span></h2>
            <p className="mx-auto mt-6 max-w-3xl text-2xl text-slate-600">Carreras registradas y habilitadas desde la base de datos.</p>
          </div>
          <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {carreras.map((carrera, index) => (
              <article key={carrera.carrera_id} className={`rounded-lg border-2 bg-white p-8 ${index % 2 === 0 ? "border-blue-700" : "border-red-700"}`}>
                <div className={`grid h-16 w-16 place-items-center rounded-lg ${index % 2 === 0 ? "bg-blue-700" : "bg-red-700"} text-white`}>
                  <GraduationCap size={32} />
                </div>
                <h3 className="mt-7 text-2xl font-extrabold">{carrera.nombre}</h3>
                <p className="mt-4 text-lg leading-relaxed text-slate-700">Codigo: {carrera.codigo}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* REQUISITOS PUBLICOS - tarjetas informativas, contenido fijo del frontend. */}
      <section id="requisitos" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-5xl font-extrabold">Requisitos de <span className="text-blue-700">Admision</span></h2>
            <p className="mx-auto mt-6 max-w-3xl text-2xl text-slate-600">Revisa cuidadosamente todos los requisitos necesarios.</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {requisitos.map(([title, text]) => (
              <article key={title} className="rounded-lg bg-white p-10 shadow-lg">
                <div className="grid h-16 w-16 place-items-center rounded-lg bg-red-700 text-white">
                  <FileText size={30} />
                </div>
                <h3 className="mt-7 text-2xl font-extrabold">{title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-slate-700">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO PUBLICO - formulario visual de consulta, no conectado todavia a backend. */}
      <section id="contacto" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-5xl font-extrabold">¿Tienes <span className="text-red-700">Preguntas?</span></h2>
            <p className="mx-auto mt-6 max-w-3xl text-2xl text-slate-600">Nuestro equipo de admisiones esta listo para ayudarte.</p>
          </div>
          <div className="mt-16 grid gap-12 lg:grid-cols-2">
            <div className="space-y-10">
              <Contact icon={<Phone />} title="Telefono" text="+1 (555) 123-4567" color="blue" />
              <Contact icon={<Mail />} title="Correo Electronico" text="admisiones@universidad.edu" color="red" />
              <Contact icon={<MapPin />} title="Ubicacion" text="Calle Universidad 123" color="blue" />
            </div>
            <form className="rounded-lg bg-slate-50 p-10">
              {["Nombre Completo", "Correo Electronico", "Telefono"].map((label) => (
                <label key={label} className="mb-8 block text-lg font-bold">
                  {label}
                  <input className="mt-3 h-16 w-full rounded-lg border border-slate-300 bg-white px-6 text-lg" placeholder={label} />
                </label>
              ))}
              <button className="h-16 w-full rounded-lg bg-red-700 text-xl font-bold text-white">Enviar consulta</button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER PUBLICO - enlaces institucionales y acceso al panel administrativo. */}
      <footer className="bg-blue-900 px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4">
          <div>
            <Logo footer logoUrl={UAGRM_LOGO_URL} />
            <p className="mt-8 text-xl leading-relaxed text-blue-50">Transformando vidas a traves de la excelencia academica y la formacion integral.</p>
          </div>
          <div><h3 className="text-xl font-bold">Admisiones</h3><p className="mt-6 text-xl text-blue-50">Solicitar Admision<br />Carreras<br />Requisitos<br />Becas</p></div>
          <div><h3 className="text-xl font-bold">Academico</h3><p className="mt-6 text-xl text-blue-50">Facultades<br />Investigacion<br />Extension<br />Biblioteca</p></div>
          <div><h3 className="text-xl font-bold">Sistema</h3><Link className="mt-6 inline-block rounded-lg bg-red-700 px-6 py-3 font-bold" href="/admin">Panel administrativo</Link></div>
        </div>
      </footer>
    </main>
  );
}

function Contact({ icon, title, text, color }: { icon: React.ReactNode; title: string; text: string; color: "blue" | "red" }) {
  return (
    <div className="flex gap-6">
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-lg ${color === "blue" ? "bg-blue-700" : "bg-red-700"} text-white`}>
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-extrabold">{title}</h3>
        <p className="mt-3 text-xl text-slate-700">{text}</p>
      </div>
    </div>
  );
}
