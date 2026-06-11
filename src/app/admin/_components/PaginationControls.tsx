"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

// PAGINACION ADMIN - controles compactos para recorrer tablas grandes sin cargar visualmente la pantalla.
export function PaginationControls({ page, lastPage, total, from, to, onPageChange }: { page: number; lastPage: number; total: number; from: number | null; to: number | null; onPageChange: (page: number) => void }) {
  const pages = paginationRange(page, lastPage);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-600 md:flex-row md:items-center md:justify-between">
      <span>{from ?? 0}-{to ?? 0} de {total} resultados</span>
      <div className="flex flex-wrap items-center gap-2">
        <button className="grid h-9 w-9 place-items-center rounded border border-slate-200 disabled:opacity-40" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="Primera pagina">|&lt;</button>
        <button className="grid h-9 w-9 place-items-center rounded border border-slate-200 disabled:opacity-40" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Pagina anterior"><ChevronLeft size={16} /></button>
        {pages.map((item, index) => item === "..."
          ? <span key={`${item}-${index}`} className="px-2">...</span>
          : <button key={item} className={`h-9 min-w-9 rounded border px-3 ${item === page ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white"}`} onClick={() => onPageChange(item)}>{item}</button>
        )}
        <button className="grid h-9 w-9 place-items-center rounded border border-slate-200 disabled:opacity-40" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} aria-label="Pagina siguiente"><ChevronRight size={16} /></button>
        <button className="grid h-9 w-9 place-items-center rounded border border-slate-200 disabled:opacity-40" disabled={page >= lastPage} onClick={() => onPageChange(lastPage)} aria-label="Ultima pagina">&gt;|</button>
      </div>
    </div>
  );
}

function paginationRange(current: number, last: number): Array<number | "..."> {
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, last, current, current - 1, current + 1]);
  const sorted = [...pages].filter((item) => item >= 1 && item <= last).sort((a, b) => a - b);
  const result: Array<number | "..."> = [];

  sorted.forEach((item, index) => {
    if (index > 0 && item - sorted[index - 1] > 1) {
      result.push("...");
    }
    result.push(item);
  });

  return result;
}
