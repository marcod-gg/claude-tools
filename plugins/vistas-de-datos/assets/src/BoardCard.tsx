// Tarjeta propia del tablero (ejemplo): qué llamada es, para quién, cuándo vence y quién la lleva.
// Respeta "Propiedades" (visible); los campos vacíos no se muestran.
import { CopyButton } from './dataviews/CopyButton';
import { formatValue } from './dataviews/fields';
import { toISODate } from './dataviews/rules';
import type { Fields, Row } from './dataviews/types';
import './board-card.css';

const DAY = 86_400_000;

// Días entre hoy y la fecha convenida (negativo = atrasado), por día calendario local.
function daysFromToday(v: unknown): number | null {
  const iso = toISODate(v);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number), now = new Date();
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY);
}

function relative(n: number) {
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return '1 día de atraso';
  return n < 0 ? `${-n} días de atraso` : `En ${n} días`;
}

// Personas y logística, en orden de importancia.
const META: { id: string; icon: string }[] = [
  { id: 'operador', icon: 'fa-user-gear' },
  { id: 'tecnico', icon: 'fa-screwdriver-wrench' },
  { id: 'asignado', icon: 'fa-user-check' },
  { id: 'entrega', icon: 'fa-truck' },
  { id: 'repuesto', icon: 'fa-box' },
  { id: 'region', icon: 'fa-location-dot' },
];

export function BoardCard({ row, fields, visible }: { row: Row; fields: Fields; visible: Set<string> }) {
  const show = (id: string) => fields[id] && visible.has(id) && formatValue(fields[id], row[id]) !== '';
  const text = (id: string) => formatValue(fields[id], row[id]);
  const color = fields.estado.options?.find(o => o.value === row.estado)?.color ?? 'var(--c-text-m)';
  const days = daysFromToday(row.fecha);
  const llamada = String(row.llamada ?? '');

  return (
    <div className="bc" style={{ ['--bc-accent' as string]: color }}>
      <div className="bc__ids">
        {llamada && (
          <span className="bc__id">
            <span className="bc__id-lbl">Llamada</span> <b>{llamada}</b>
            <CopyButton text={llamada} what="llamada" />
          </span>
        )}
        {show('nventa') && <span className="bc__id"><span className="bc__id-lbl">NV</span> <b>{text('nventa')}</b></span>}
      </div>

      <h3 className="bc__title" title={String(row.cliente ?? '')}>{String(row.cliente ?? '') || 'Sin cliente'}</h3>

      {visible.has('fecha') && (
        <div className={`bc__due${days != null && days < 0 ? ' is-late' : ''}`}>
          <i className={`fas ${days == null ? 'fa-calendar-xmark' : 'fa-calendar-day'}`} aria-hidden />
          {days == null
            ? <span>Sin fecha convenida</span>
            : <><b>{relative(days)}</b><span className="bc__muted">{text('fecha')}</span></>}
        </div>
      )}

      {META.some(m => show(m.id)) && (
        <dl className="bc__meta">
          {META.filter(m => show(m.id)).map(m => (
            <div key={m.id} className="bc__row">
              <dt><i className={`fas ${m.icon}`} aria-hidden /> {fields[m.id].label}</dt>
              <dd title={text(m.id)}>{text(m.id)}</dd>
            </div>
          ))}
        </dl>
      )}

      {show('contacto') && (
        <div className="bc__foot">
          <i className="fas fa-phone" aria-hidden />
          <span>Último contacto <b>{text('contacto')}</b>{show('hora') && <> · {text('hora')}</>}</span>
        </div>
      )}
    </div>
  );
}
