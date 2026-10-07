// Montaje de referencia: reportes agrupados por sección, con acciones por registro, gestión de secciones y mover.
// Sin dependencias de la página: botones con las clases del componente; los modales de Editar/Eliminar los pone la
// página escuchando .edit-btn / .btn-delete / .section-delete, y los errores se avisan con el evento "dataviews:error".
import { StrictMode, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DataViews } from './dataviews/DataViews';
import { blankView } from './dataviews/useViews';
import type { Fields, Row, ViewConfig } from './dataviews/types';

interface Report { id: number; name: string; details?: string | null; enabled: boolean; sections?: { name?: string } | null }
interface Section { id: number; name: string; enabled: boolean }

const toRow = (r: Report): Row => ({
  id: r.id,
  nombre: r.name,
  seccion: r.sections?.name || 'Sin sección',
  detalle: r.details ?? '',
  estado: r.enabled ? 'Activo' : 'Inactivo',
});

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  if (!r.ok) throw new Error(`Error ${r.status} del servidor.`);
  return r.json() as Promise<T>;
}
const fetchRows = async (url: string) => (await getJson<Report[]>(url)).map(toRow);

// Escrituras: el servidor exige la política de gestión (no la de lectura) y valida lo mismo que el cliente.
async function post(url: string, data: Record<string, string>) {
  const r = await fetch(url, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams(data),
  });
  const res = await r.json().catch(() => null);
  if (!r.ok || res?.success === false) throw new Error(res?.message || `No se pudo guardar (error ${r.status}).`);
}

const notifyError = (e: unknown) =>
  window.dispatchEvent(new CustomEvent('dataviews:error', { detail: e instanceof Error ? e.message : 'No se pudo guardar.' }));

// Esquema: las opciones de Sección vienen de los datos (ordenadas por cantidad); con gestión se suman las vacías para
// poder soltar reportes en ellas. Se arma una sola vez: FIELDS debe ser estable.
function buildFields(rows: Row[], all: Section[] = []): Fields {
  const count: Record<string, number> = {};
  all.forEach(s => { count[s.name] = 0; });
  rows.forEach(r => { count[r.seccion as string] = (count[r.seccion as string] ?? 0) + 1; });
  const sections = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b, 'es'));
  return {
    nombre: { label: 'Reporte', type: 'text', size: 320 },
    seccion: { label: 'Sección', type: 'select', size: 200, options: sections.map(value => ({ value, icon: 'fa-folder' })) },
    detalle: { label: 'Detalle', type: 'text', size: 380 },
    estado: {
      label: 'Estado', type: 'select', size: 120,
      options: [
        { value: 'Activo', color: 'var(--c-resuelto)', icon: 'fa-circle-check' },
        { value: 'Inactivo', color: 'var(--c-cancelado)', icon: 'fa-circle-minus' },
      ],
    },
    id: { label: 'ID', type: 'number', size: 80 },
  };
}

const defaults = (): ViewConfig[] => [
  { ...blankView('table', 'all', 'Reportes'), groupBy: 'seccion', sorting: [{ id: 'nombre', desc: false }], pageSize: 0 },
  { ...blankView('cards', 'all', 'Por sección'), groupBy: 'seccion', railBy: 'seccion' },
];

// Acciones por registro: Editar (lápiz) y Eliminar (papelera roja); la página abre sus modales por clase.
const actions = (r: Row, text = false) => (
  <>
    <button type="button" className={`rp-act edit-btn${text ? ' rp-act--text' : ''}`} data-id={String(r.id)} aria-label={`Editar ${r.nombre}`}>
      <i className="fa-regular fa-pen-to-square" aria-hidden />{text && 'Editar'}
    </button>
    <button type="button" className="rp-act rp-act--danger btn-delete" data-id={String(r.id)} data-name={String(r.nombre)} aria-label={`Eliminar ${r.nombre}`}>
      <i className="fa-regular fa-trash-can" aria-hidden />
    </button>
  </>
);

// Controles de sección en el encabezado del grupo: switch Activa + papelera (la página confirma con su modal).
function SectionControls({ s, count }: { s: Section; count: number }) {
  const [on, setOn] = useState(s.enabled);
  const toggle = async () => {
    const next = !on;
    setOn(next); // optimista
    try { await post('/Reportes/Sections/Update', { id: String(s.id), name: s.name, enabled: String(next) }); s.enabled = next; }
    catch (e) { setOn(!next); notifyError(e); }
  };
  return (
    <>
      <label className="dv-sec-switch" title={on ? 'Sección activa' : 'Sección inactiva'}>
        <input type="checkbox" role="switch" checked={on} onChange={toggle} aria-label={`Sección ${s.name} activa`} />
        <span>{on ? 'Activa' : 'Inactiva'}</span>
      </label>
      <button type="button" className="dv-sec-delete section-delete" data-id={s.id} data-name={s.name} disabled={count > 0}
        title={count > 0 ? 'Solo se elimina una sección vacía' : 'Eliminar sección'} aria-label={`Eliminar sección ${s.name}`}>
        <i className="fa-regular fa-trash-can" aria-hidden />
      </button>
    </>
  );
}

function App({ fields, first, url, user, admin, sections, canSections }: { fields: Fields; first: Row[]; url: string; user: string; admin: boolean; sections: Section[]; canSections: boolean }) {
  // Primera carga: las filas que ya trajo el montaje; las siguientes (dataviews:refresh) vuelven a pedirlas.
  const [pending] = useState<{ rows: Row[] | null }>({ rows: first });
  const load = useCallback(async () => {
    if (pending.rows) { const rows = pending.rows; pending.rows = null; return { rows }; }
    return { rows: await fetchRows(url) };
  }, [pending, url]);
  const find = (name: string) => sections.find(x => x.name === name);
  return (
    <DataViews
      fields={fields}
      idField="id"
      titleField="nombre"
      boardField="seccion"
      sources={[{ id: 'all', label: admin ? 'Todos los reportes' : 'Mis reportes' }]}
      load={load}
      // Un set de vistas por usuario y perfil.
      storageKey={`__APP__-dataviews:v1:${user}:${admin ? 'admin' : 'user'}`}
      defaultViews={defaults}
      rowHref={r => `/Reportes/Documentos/Ver/${r.id}`}
      rowActions={admin ? r => actions(r) : undefined}
      rowActionsWidth={96}
      cardActions={admin ? r => actions(r, true) : undefined}
      // Mover un reporte a otra sección arrastrándolo (optimista; si el servidor rechaza, vuelve).
      onMove={admin ? async (r, _f, name) => {
        const target = find(name);
        if (!target) throw new Error('Sección desconocida: recarga la página.');
        await post('/Reportes/Reports/Move', { id: String(r.id), sectionId: String(target.id) });
      } : undefined}
      groupActions={canSections ? (name, rows) => { const s = find(name); return s ? <SectionControls s={s} count={rows.length} /> : null; } : undefined}
      showEmptyGroups={canSections}
      onRenameGroup={canSections ? async (name, next) => {
        const s = find(name);
        if (!s) return;
        await post('/Reportes/Sections/Update', { id: String(s.id), name: next, enabled: String(s.enabled) });
        location.reload(); // las secciones son opciones de FIELDS: se rearman al montar
      } : undefined}
      exportTitle="Reportes"
    />
  );
}

const el = document.getElementById('dataviews-root');
if (el) {
  const admin = el.dataset.admin === 'true';
  const canSections = el.dataset.sections === 'true';   // gestión de secciones (política de gestión en el servidor)
  const url = admin ? '/Reportes/Reports/GetReportsJson' : '/Reportes/Reports/GetActiveReportsJson';
  const user = (el.dataset.user ?? '').toLowerCase();
  Promise.all([fetchRows(url), admin || canSections ? getJson<Section[]>('/Reportes/Sections/GetSectionsJson') : Promise.resolve(null)])
    .then(([rows, sections]) => createRoot(el).render(<StrictMode>
      <App fields={buildFields(rows, canSections ? sections ?? [] : [])} first={rows} url={url} user={user} admin={admin} sections={sections ?? []} canSections={canSections} />
    </StrictMode>))
    .catch(e => { el.textContent = e?.message || 'No se pudieron cargar los reportes.'; });
}
