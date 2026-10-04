import { createContext, useContext, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import type { ColumnDef, Row as TRow, SortingFn } from '@tanstack/react-table';
import { compareValues, toISODate } from './rules';
import type { FieldDef, Fields, OpenMode, Row } from './types';

/** Cómo abre el título su registro (lo da DataViews según la vista): pestaña nueva, o panel/modal de la página. */
export const OpenRecord = createContext<{ mode: OpenMode; open?: (row: Row, mode: 'side' | 'modal') => void }>({ mode: 'page' });

/** Selección para acciones masivas (lo da DataViews con bulkActions): casillas en filas y tarjetas. */
export interface Selection {
  id: (row: Row) => string;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Ids de todo lo que cumple filtros, búsqueda y segmento (no solo la página). */
  all: string[];
  setAll: (on: boolean) => void;
}
export const SelectionContext = createContext<Selection | null>(null);

/** Casilla para elegir un registro (fila o tarjeta). */
export function SelectBox({ row, titleField }: { row: Row; titleField: string }) {
  const sel = useContext(SelectionContext);
  if (!sel) return null;
  const id = sel.id(row);
  return <input type="checkbox" className="dv-selbox" checked={sel.has(id)} onChange={() => sel.toggle(id)}
    aria-label={`Seleccionar ${String(row[titleField] ?? '') || 'registro'}`} />;
}

/**
 * Genera columnas TanStack desde FIELDS. Llamar fuera del render o dentro de useMemo:
 * la referencia debe ser estable.
 */
export function buildColumns(fields: Fields, titleField: string, sumField?: string): ColumnDef<Row>[] {
  return Object.entries(fields).map(([id, field]) => {
    const sortingFn: SortingFn<Row> = (a, b, col) => compareValues(field, a.getValue(col), b.getValue(col));
    return {
      id,
      accessorFn: r => r[id],
      header: field.label,
      sortingFn,
      size: field.size ?? 150,
      minSize: 70,
      enableHiding: id !== titleField,
      // Solo se agrega el campo sumable; el resto no calcula agregados.
      aggregationFn: id === sumField ? 'sum' : undefined,
    } satisfies ColumnDef<Row>;
  });
}

const DATE_FMT = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export function formatValue(field: FieldDef, v: unknown): string {
  if (v == null || v === '') return '';
  if (field.type === 'number') return Number(v).toLocaleString('es-CL');
  if (field.type === 'date') {
    const iso = toISODate(v);
    return iso ? DATE_FMT.format(new Date(iso + 'T00:00:00Z')) : String(v);
  }
  return String(v);
}

export function Value({ field, value }: { field: FieldDef; value: unknown }) {
  const text = formatValue(field, value);
  if (!text) return <span className="dv-muted">—</span>;
  if (field.type === 'select') {
    const color = field.options?.find(o => o.value === text)?.color;
    return (
      <span className="dv-tag" style={color ? { ['--tag' as string]: color } : undefined}>
        {text}
      </span>
    );
  }
  return <>{text}</>;
}

export function Title({ row, titleField, href }: { row: Row; titleField: string; href?: string }) {
  const text = String(row[titleField] ?? '') || 'Sin título';
  const { mode, open } = useContext(OpenRecord);
  const inPage = (mode === 'side' || mode === 'modal') && open;
  if (!href && !inPage) return <span className="dv-title">{text}</span>;
  return (
    <a className="dv-title" href={href ?? '#'} target={mode === 'tab' ? '_blank' : undefined} rel={mode === 'tab' ? 'noopener' : undefined}
      // Panel o modal: el clic simple abre en la página; Ctrl/Cmd/Shift/clic central siguen siendo un enlace normal
      onClick={inPage ? e => {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(row, mode);
      } : undefined}>
      {text}
    </a>
  );
}

/** Encabezado colapsable de un grupo (row de TanStack con getIsGrouped()). */
export function GroupHeader({ row, fields, sumField, collapsed, onToggle, actions, onRename, dragProps }: {
  row: TRow<Row>;
  fields: Fields;
  sumField?: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Controles propios del grupo (p. ej. switch y eliminar sección), fuera del botón de colapsar. */
  actions?: ReactNode;
  /** Doble clic en el nombre para renombrar el grupo (Enter guarda, Esc cancela). */
  onRename?: (name: string) => Promise<void>;
  /** Arrastrar el encabezado para reordenar secciones (orden personalizado). */
  dragProps?: HTMLAttributes<HTMLElement>;
}) {
  const field = fields[row.groupingColumnId!];
  const sum = sumField ? row.getValue<number>(sumField) : undefined;
  const value = String(row.groupingValue ?? '');
  const [editing, setEditing] = useState(false);
  // Con renombrar, el clic espera un instante: si llega el doble clic no colapsa el grupo.
  const timer = useRef<number | undefined>(undefined);
  const click = () => {
    if (!onRename) return onToggle();
    clearTimeout(timer.current);
    timer.current = window.setTimeout(onToggle, 220);
  };
  const done = (v: string) => {
    setEditing(false);
    if (v.trim() && v.trim() !== value) onRename!(v.trim());
  };
  return (
    <div className="dv-grouphead">
      {editing ? (
        <span className="dv-group">
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'down'} dv-group__chev`} aria-hidden />
          <input className="dv-explorer__rename" defaultValue={value} autoFocus maxLength={100} aria-label={`Nuevo nombre para ${value}`}
            onFocus={e => e.currentTarget.select()} onBlur={e => done(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = value; e.currentTarget.blur(); } }} />
        </span>
      ) : (
        <button type="button" className="dv-group" aria-expanded={!collapsed} onClick={click} {...dragProps}
          onDoubleClick={onRename ? () => { clearTimeout(timer.current); setEditing(true); } : undefined}
          title={onRename ? 'Clic: contraer/expandir · Doble clic: renombrar' : undefined}>
          <i className={`fas fa-chevron-${collapsed ? 'right' : 'down'} dv-group__chev`} aria-hidden />
          {field && <Value field={field} value={row.groupingValue} />}
          <span className="dv-group__count">{row.subRows.length}</span>
          {sum != null && fields[sumField!] && (
            <span className="dv-group__sum">Σ {fields[sumField!].label}: {formatValue(fields[sumField!], sum) || 0}</span>
          )}
        </button>
      )}
      {actions && <span className="dv-explorer__actions">{actions}</span>}
    </div>
  );
}
