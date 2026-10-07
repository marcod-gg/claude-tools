import { useEffect, useId, useRef } from 'react';
import { Value, formatValue } from './fields';
import type { Fields, Row } from './types';

/**
 * Vista previa propia del registro, para cuando el montaje no trae onOpenRecord: todos sus campos con valor.
 * modal = ventana centrada (la vista queda inerte detrás); side = panel a la derecha que deja usar la vista, así otro
 * clic en un título cambia el registro sin cerrar. Esc, el botón × o un clic fuera (modal) cierran.
 */
export function RecordPreview({ row, mode, fields, titleField, href, onClose }: {
  row: Row;
  mode: 'side' | 'modal';
  fields: Fields;
  titleField: string;
  /** Enlace al detalle (rowHref): botón "Abrir en una pestaña nueva". */
  href?: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current!;
    if (!d.open) { if (mode === 'modal') d.showModal(); else d.show(); }
    // show/showModal enfocan el primer control (el enlace): el foco va a Cerrar
    d.querySelector<HTMLElement>('.dv-preview__close')?.focus();
    if (mode === 'modal') return;
    // Un dialog no modal no se cierra con Esc por sí solo
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') d.close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode]);
  // Al cambiar de registro en el panel lateral, el foco vuelve al panel para que el lector anuncie el nuevo título
  useEffect(() => { ref.current?.querySelector<HTMLElement>('.dv-preview__close')?.focus(); }, [row]);

  const title = String(row[titleField] ?? '') || 'Sin título';
  const ids = Object.keys(fields).filter(id => id !== titleField && formatValue(fields[id], row[id]));
  return (
    <dialog ref={ref} className={`dv-preview dv-preview--${mode}`} aria-labelledby={titleId} onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) ref.current!.close(); }}>
      <div className="dv-preview__box">
        <header className="dv-preview__head">
          <h2 id={titleId}>{title}</h2>
          {href && (
            <a className="dv-icon" href={href} target="_blank" rel="noopener" title="Abrir en una pestaña nueva" aria-label="Abrir en una pestaña nueva">
              <i className="fas fa-arrow-up-right-from-square" aria-hidden />
            </a>
          )}
          <button type="button" className="dv-icon dv-preview__close" title="Cerrar (Esc)" aria-label="Cerrar" onClick={() => ref.current!.close()}>
            <i className="fas fa-xmark" aria-hidden />
          </button>
        </header>
        <dl className="dv-preview__body">
          {ids.map(id => (
            <div key={id}>
              <dt>{fields[id].label}</dt>
              <dd className={`dv-card__v--${fields[id].type}`}><Value field={fields[id]} value={row[id]} /></dd>
            </div>
          ))}
          {ids.length === 0 && <p className="dv-muted">Sin más datos.</p>}
        </dl>
      </div>
    </dialog>
  );
}
