// Esqueleto de montaje: tabla + tablero.
// Reemplazar: FIELDS, load, storageKey, rowHref y el id del div.
import { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { DataViews } from './dataviews/DataViews';
import { blankView } from './dataviews/useViews';
import type { Fields, Row, ViewConfig } from './dataviews/types';

// Esquema: el orden define las columnas. titleField (aquí 'id') es obligatorio y no se oculta.
const FIELDS: Fields = {
  id: { label: 'ID', type: 'number', size: 90 },
  nombre: { label: 'Nombre', type: 'text', size: 280 },
  estado: {
    label: 'Estado', type: 'select', size: 170,
    options: [
      { value: 'Nuevo', color: 'var(--c-nuevo)', icon: 'fa-circle-plus' },
      { value: 'Resuelto', color: 'var(--c-resuelto)', icon: 'fa-circle-check' },
    ],
  },
  fecha: { label: 'Fecha', type: 'date', size: 120 },
};

const SOURCES = [{ id: 'mine', label: 'Míos' }];

// Mismo origen, cookies de sesión; el servidor valida el alcance.
async function load(source: string): Promise<{ rows: Row[]; note?: string }> {
  const r = await fetch('/__Controller__/__Accion__', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ scope: source }),
  });
  if (!r.ok) throw new Error(`Error ${r.status} del servidor.`);
  const res = await r.json();
  if (!res?.success) throw new Error(res?.message || 'No se pudieron cargar los registros.');
  return { rows: res.datos ?? [] };
}

const defaults = (): ViewConfig[] => [{ ...blankView('table', 'mine', 'Míos'), groupBy: 'estado', sorting: [{ id: 'id', desc: true }] }];

function App({ user }: { user: string }) {
  const loadCb = useCallback(load, []);
  return (
    <DataViews
      fields={FIELDS}
      idField="id"
      titleField="id"
      boardField="estado"
      sources={SOURCES}
      load={loadCb}
      storageKey={`__app__-dataviews:v1:${user}`}
      defaultViews={defaults}
      rowHref={r => `/__Controller__/Details?id=${r.id}`}
    />
  );
}

const el = document.getElementById('dataviews-root');
if (el) createRoot(el).render(<StrictMode><App user={(el.dataset.user ?? '').toLowerCase()} /></StrictMode>);
