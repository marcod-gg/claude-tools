// Demo de DataViews (skill advanced-tanstack): mantenciones de flota, solo lectura, tabla + tablero + tarjetas.
// Respuestas usadas: no se mueven registros; tema por defecto (default-theme). El resto, deducido por la skill.
import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataViews } from './dataviews/DataViews';
import { blankView } from './dataviews/useViews';
import type { Fields, Row, ViewConfig } from './dataviews/types';

// Esquema: el orden define las columnas. titleField ('ot') es obligatorio y no se oculta.
const FIELDS: Fields = {
  ot: { label: 'Mantención', type: 'text', size: 280 },
  patente: { label: 'Patente', type: 'text', size: 110, copy: true },
  estado: {
    label: 'Estado', type: 'select', size: 170,
    options: [
      { value: 'Programada', color: 'var(--c-pendiente)', icon: 'fa-calendar-check' },
      { value: 'En taller', color: 'var(--c-curso)', icon: 'fa-screwdriver-wrench' },
      { value: 'Esperando repuesto', color: 'var(--c-espera)', icon: 'fa-hourglass-half' },
      { value: 'Lista', color: 'var(--c-resuelto)', icon: 'fa-circle-check' },
      { value: 'Cancelada', color: 'var(--c-cancelado)', icon: 'fa-ban' },
    ],
  },
  tipo: {
    label: 'Tipo', type: 'select', size: 140,
    options: [
      { value: 'Preventiva', icon: 'fa-shield-halved' },
      { value: 'Correctiva', icon: 'fa-wrench' },
      { value: 'Neumáticos', icon: 'fa-circle-dot' },
      { value: 'Eléctrica', icon: 'fa-bolt' },
    ],
  },
  taller: {
    label: 'Taller', type: 'select', size: 160,
    options: ['Taller Central', 'Taller Norte', 'Taller Sur', 'Externo'].map(value => ({ value, icon: 'fa-warehouse' })),
  },
  conductor: { label: 'Conductor', type: 'text', size: 160 },
  km: { label: 'Kilometraje', type: 'number', size: 120 },
  costo: { label: 'Costo (CLP)', type: 'number', size: 130 },
  ingreso: { label: 'Ingreso', type: 'date', size: 120 },
  entrega: { label: 'Entrega', type: 'date', size: 120 },
};

const SOURCES = [{ id: 'todas', label: 'Todas las mantenciones' }, { id: 'abiertas', label: 'Abiertas' }];

// Datos de prueba deterministas (en una app real, un endpoint del mismo origen que valida el acceso).
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ROWS: Row[] = (() => {
  const r = rng(11), pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const vehiculos = ['Camión 3/4', 'Tracto', 'Furgón', 'Camioneta', 'Rampla'];
  const conductores = ['Ana Rojas', 'Diego Muñoz', 'Camila Soto', 'Felipe Araya', 'Valentina Díaz', 'Jorge Pinto'];
  const estados = FIELDS.estado.options!.map(o => o.value), tipos = FIELDS.tipo.options!.map(o => o.value), talleres = FIELDS.taller.options!.map(o => o.value);
  const letras = 'BCDFGHJKLPRSTVWXYZ';
  return Array.from({ length: 140 }, (_, i) => {
    const ingreso = -Math.floor(r() * 45);
    const estado = pick(estados);
    const patente = `${pick([...letras])}${pick([...letras])}${pick([...letras])}${pick([...letras])}-${10 + Math.floor(r() * 90)}`;
    return {
      id: 7100 + i,
      ot: `OT-${7100 + i} · ${pick(vehiculos)} ${patente}`,
      patente,
      estado,
      tipo: pick(tipos),
      taller: pick(talleres),
      conductor: pick(conductores),
      km: 20000 + Math.floor(r() * 380000),
      costo: Math.round(r() * 2400) * 1000 + 35000,
      ingreso: day(ingreso),
      entrega: estado === 'Lista' ? day(ingreso + 1 + Math.floor(r() * 10)) : '',
    };
  });
})();

async function load(source: string): Promise<{ rows: Row[]; note?: string }> {
  await new Promise(res => setTimeout(res, 300));
  const rows = source === 'abiertas' ? ROWS.filter(r => r.estado !== 'Lista' && r.estado !== 'Cancelada') : ROWS;
  return { rows: rows.map(r => ({ ...r })), note: 'datos de prueba' };
}

const defaults = (): ViewConfig[] => [
  { ...blankView('table', 'todas', 'Mantenciones'), groupBy: 'estado', sorting: [{ id: 'ingreso', desc: true }] },
  { ...blankView('board', 'abiertas', 'En curso'), groupBy: 'estado', types: ['board', 'table'] },
];

function App() {
  const loadCb = useCallback(load, []);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.getElementById('board-screen')?.requestFullscreen());
  return (
    <DataViews
      fields={FIELDS}
      idField="id"
      titleField="ot"
      boardField="estado"
      sumField="costo"
      sources={SOURCES}
      load={loadCb}
      storageKey="flota-dataviews:v1:demo@example.com:todas,abiertas"
      defaultViews={defaults}
      rowHref={r => `#mantencion-${r.id}`}
      exportTitle="Mantenciones de flota"
      styleKey="flota-tb"
      styleSlot="#dv-style"
      forcePageSize={full ? 0 : undefined}
      toolbarEnd={
        <span className="dv-tool">
          <button type="button" className="dv-btn" onClick={toggleFull} aria-label={full ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            <i className={`fas ${full ? 'fa-compress' : 'fa-expand'}`} aria-hidden />
            <span className="dv-tool__label">{full ? 'Salir' : 'Pantalla completa'}</span>
          </button>
        </span>
      }
    />
  );
}

const el = document.getElementById('dataviews-root');
if (el) createRoot(el).render(<StrictMode><App /></StrictMode>);
