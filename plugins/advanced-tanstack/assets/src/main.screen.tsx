// Montaje de pantalla de monitoreo (ASP.NET Core). Referencia de:
// auto-refresh con dataviews:reload + aviso "dataviews:loaded", cargas en curso reutilizadas, pantalla completa con
// forcePageSize=0, Descargar (exportTitle), botones propios (toolbarEnd), tarjeta propia (BoardCard) y filtro
// por defecto con "o". Requiere copiar assets/dataviews-tokens.css a src/. El servidor valida la sesión.
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './dataviews-tokens.css';
import { BoardCard } from './BoardCard';
import { DataViews } from './dataviews/DataViews';
import { blankView } from './dataviews/useViews';
import type { FieldDef, Fields, Row, ViewConfig } from './dataviews/types';

type Board = 'preparacion' | 'retiro' | 'interno' | 'llamada';

const REGIONES: Record<string, string> = {
  13: 'Metropolitana', 1: 'Tarapacá', 2: 'Antofagasta', 3: 'Atacama', 4: 'Coquimbo', 5: 'Valparaíso',
  6: "O'Higgins", 7: 'Maule', 8: 'Biobío', 9: 'Araucanía', 10: 'Los Lagos', 11: 'Aysén',
  12: 'Magallanes', 14: 'Los Ríos', 15: 'Arica y Parinacota', 16: 'Ñuble',
};
const REGION_ORDER = ['13', ...Object.keys(REGIONES).filter(k => k !== '13')];

const estado: FieldDef = {
  label: 'Estado', type: 'select', size: 130,
  options: [
    { value: 'Atrasado', color: 'var(--dt-danger)', icon: 'fa-triangle-exclamation' },
    { value: 'Hoy', color: 'var(--dt-success)', icon: 'fa-clock' },
    { value: 'Próximo', color: 'var(--dt-state-pending)', icon: 'fa-calendar-days' },
    { value: 'Sin fecha', color: 'var(--dt-state-canceled)', icon: 'fa-calendar-xmark' },
  ],
};
const region: FieldDef = { label: 'Región', type: 'select', size: 150, options: REGION_ORDER.map(k => ({ value: REGIONES[k] })) };
const base = {
  cliente: { label: 'Cliente', type: 'text', size: 280 },
  llamada: { label: 'Llamada', type: 'text', size: 110 },
  estado,
  fecha: { label: 'Fecha convenida', type: 'date', size: 165 },
  nventa: { label: 'Nota de venta', type: 'text', size: 130 },
} satisfies Fields;
const contacto = {
  contacto: { label: 'Último contacto', type: 'date', size: 160 },
  hora: { label: 'Hora', type: 'text', size: 80 },
  asignado: { label: 'Asignado', type: 'text', size: 160 },
  repuesto: { label: 'Entrega repuesto', type: 'text', size: 150 },
  entrega: { label: 'Tipo de entrega', type: 'text', size: 150 },
} satisfies Fields;

// Constantes de módulo: DataViews necesita referencias estables.
const FIELDS: Record<Board, Fields> = {
  preparacion: { ...base, operador: { label: 'Operador', type: 'text', size: 160 }, region },
  retiro: { ...base, operador: { label: 'Operador', type: 'text', size: 160 }, tecnico: { label: 'Técnico', type: 'text', size: 160 }, region },
  interno: { ...base, ...contacto, region },
  llamada: { ...base, ...contacto, region },
};

// Ventana de fecha convenida que se pide al servidor .
const SOURCES = [
  { id: '14', label: '±14 días' },
  { id: '30', label: '±30 días' },
  { id: '60', label: '±60 días' },
];

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return isoDay(d); };

function estadoDe(fecha: unknown): string {
  if (typeof fecha !== 'string' || !fecha) return 'Sin fecha';
  const dia = fecha.slice(0, 10), hoy = isoDay(new Date());
  return dia < hoy ? 'Atrasado' : dia === hoy ? 'Hoy' : 'Próximo';
}

// Fila de /Tablero/{board}/Data en camelCase. Cada tablero trae solo las suyas.
interface ViewRow {
  callId: number;
  fechaAgendado?: string;
  cliente?: string;
  notaVenta?: string;
  region?: string;
  operador?: string;
  tecnico?: string;
  entregaRepuesto?: string;
  tipoEntrega?: string;
  fechaAct?: string;
  horaAct?: string;
  asignado?: string;
}

// En Listas para retiro una llamada viene repetida (una fila por técnico): id propio por fila.
const toRow = (i: ViewRow, n: number): Row => ({
  id: `${i.callId}-${n}`,
  cliente: i.cliente,
  llamada: String(i.callId ?? ''),
  estado: estadoDe(i.fechaAgendado),
  fecha: i.fechaAgendado,
  nventa: i.notaVenta,
  operador: i.operador,
  tecnico: i.tecnico,
  contacto: i.fechaAct,
  hora: i.horaAct,
  asignado: i.asignado,
  repuesto: i.entregaRepuesto,
  entrega: i.tipoEntrega,
  region: REGIONES[String(i.region ?? '').trim()] ?? i.region,
});

async function fetchRows(board: Board, source: string): Promise<{ rows: Row[]; note?: string }> {
  const days = Number(source) || 14;
  const params = new URLSearchParams({ desde: shift(-days), hasta: shift(days), sinFecha: 'true' });
  try {
    const r = await fetch(`/Tablero/${board}/Data?${params}`, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`Error ${r.status} del servidor.`);
    const rows = ((await r.json()) as ViewRow[]).map(toRow);
    window.dispatchEvent(new CustomEvent('dataviews:loaded', { detail: { ok: true } }));
    return { rows, note: `actualizado ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}` };
  } catch (e) {
    window.dispatchEvent(new CustomEvent('dataviews:loaded', { detail: { ok: false } }));
    throw e;
  }
}

// Cargas lentas: si el auto-refresh llega con una carga en curso, se reutiliza esa.
function loader(board: Board) {
  const inflight = new Map<string, Promise<{ rows: Row[]; note?: string }>>();
  return (source: string) => {
    let p = inflight.get(source);
    if (!p) {
      p = fetchRows(board, source).finally(() => inflight.delete(source));
      inflight.set(source, p);
    }
    return p;
  };
}

const defaults = (): ViewConfig[] => [{
  ...blankView('table', '14', 'Todos'),
  // Como los tableros anteriores: fecha convenida en ±14 días de hoy, o sin fecha (nulos incluidos).
  filters: [
    { id: 'fecha-rango', col: 'fecha', op: 'within', value: '14' },
    { id: 'fecha-nula', col: 'fecha', op: 'empty', value: '', join: 'or' },
  ],
  sorting: [{ id: 'estado', desc: false }, { id: 'fecha', desc: false }],
}];

// Pantalla completa sobre #board-screen (Tablero.cshtml): incluye título y herramientas.
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.getElementById('board-screen')?.requestFullscreen();
}

function App({ board, user, title }: { board: Board; user: string; title: string }) {
  const load = useMemo(() => loader(board), [board]);
  // Pantalla completa: todas las filas, sin paginar.
  const [full, setFull] = useState(false);
  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  return (
    <DataViews
      fields={FIELDS[board]}
      idField="id"
      titleField="cliente"
      boardField="estado"
      sources={SOURCES}
      load={load}
      storageKey={`__APP__-dataviews:v2:${user}:${board}`}
      defaultViews={defaults}
      forcePageSize={full ? 0 : undefined}
      exportTitle={title}
      hideRefresh
      renderCard={(row, { visible }) => <BoardCard row={row} fields={FIELDS[board]} visible={visible} />}
      toolbarEnd={<>
        <span className="dv-tool">
          <button type="button" className="dv-btn" onClick={() => window.dispatchEvent(new Event('dataviews:reload'))} aria-label="Actualizar ahora">
            <i className="fas fa-rotate-right" aria-hidden />
            <span className="dv-tool__label">Actualizar ahora</span>
          </button>
        </span>
        <span className="dv-tool">
          <button type="button" className="dv-btn" onClick={toggleFullscreen} aria-label={full ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            <i className={`fas ${full ? 'fa-compress' : 'fa-expand'}`} aria-hidden />
            <span className="dv-tool__label">{full ? 'Salir' : 'Pantalla completa'}</span>
          </button>
        </span>
      </>}
    />
  );
}

const el = document.getElementById('dataviews-root');
const board = el?.dataset.board as Board | undefined;
if (el && board && FIELDS[board])
  createRoot(el).render(<StrictMode><App board={board} user={(el.dataset.user ?? '').toLowerCase()} title={el.dataset.title || board} /></StrictMode>);
