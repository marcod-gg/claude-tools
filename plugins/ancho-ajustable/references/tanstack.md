# Ancho ajustable con TanStack Table (React)

Lo mismo que el script, sobre el estado `columnSizing` de TanStack. Usar el CSS de `assets/ancho-ajustable.css`: las clases
son las mismas (`aa-table`, `aa-resizing`, `aa-resizer`, `is-resizing`, `aa-col-resizing`).

## 1. La tabla

```tsx
const table = useReactTable({
  data, columns,
  state: { columnSizing: view.sizes ?? {} },               // anchos guardados por columna: { [columnId]: px }
  onColumnSizingChange: u => saveSizes(typeof u === 'function' ? u(view.sizes ?? {}) : u),
  columnResizeMode: 'onChange',                            // la columna sigue al mouse (no al soltar)
  getCoreRowModel: getCoreRowModel(),
});
// En cada columna: size (ancho inicial) y minSize
const columns = fields.map(f => ({ id: f.id, header: f.label, size: f.size ?? 150, minSize: 70, /* … */ }));
```

`saveSizes` guarda donde se haya elegido: en la vista del usuario en el servidor o en `localStorage`.

## 2. Cursor fijo y sin transición mientras se arrastra

```tsx
const resizing = !!table.getState().columnSizingInfo.isResizingColumn;
useEffect(() => {
  if (!resizing) return;
  document.documentElement.classList.add('aa-col-resizing');
  return () => document.documentElement.classList.remove('aa-col-resizing');
}, [resizing]);
```

## 3. Ajustar al contenido (doble clic)

```tsx
const tableRef = useRef<HTMLTableElement>(null);
const autofit = (id: string) => {
  const el = tableRef.current; if (!el) return;
  // Se mide el texto y las piezas en línea, no los bloques: un bloque ocupa la celda entera y no dice cuánto necesita.
  const range = document.createRange();
  const need = (box: Element | null) => {
    if (!box) return 0;
    let l = Infinity, r = -Infinity;
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n: Node | null = walk.currentNode; n; n = walk.nextNode()) {
      let rect: DOMRect | null = null;
      if (n.nodeType === Node.TEXT_NODE) { if (n.textContent?.trim()) { range.selectNodeContents(n); rect = range.getBoundingClientRect(); } }
      else if (n !== box && getComputedStyle(n as Element).display.startsWith('inline')) rect = (n as Element).getBoundingClientRect();
      if (rect?.width) { l = Math.min(l, rect.left); r = Math.max(r, rect.right); }
    }
    const cs = getComputedStyle(box);
    return r > l ? r - l + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 0;
  };
  let w = need(el.querySelector(`thead [data-col="${CSS.escape(id)}"] .th-label`)) + 8;
  el.querySelectorAll(`tbody [data-col="${CSS.escape(id)}"]`).forEach(td => { w = Math.max(w, need(td) + 16); });
  table.setColumnSizing(old => ({ ...old, [id]: Math.round(Math.min(640, Math.max(60, w))) }));
};
```

Cada `<td>` lleva `data-col={cell.column.id}` para poder encontrar las celdas de la columna.

## 4. El encabezado

```tsx
const headers = table.getHeaderGroups()[0].headers;
<table ref={tableRef} className={`aa-table${resizing ? ' aa-resizing' : ''}`} style={{ width: table.getTotalSize() + extra }}>
  <thead><tr>
    {headers.map((h, i) => (
      <th key={h.id} data-col={h.column.id}
          draggable={!resizing}                                      // si las columnas se reordenan arrastrando
          // Cada columna sobre la siguiente: el borde (centrado entre ambas) queda encima y recibe el mouse
          style={{ width: h.getSize(), zIndex: headers.length - i + 1 }}>
        <button type="button" className="th-label" onClick={h.column.getToggleSortingHandler()}>
          {flexRender(h.column.columnDef.header, h.getContext())}
        </button>
        <div className={`aa-resizer${h.column.getIsResizing() ? ' is-resizing' : ''}`}
             onMouseDown={e => { e.stopPropagation(); h.getResizeHandler()(e); }}
             onTouchStart={e => { e.stopPropagation(); h.getResizeHandler()(e); }}
             onClick={e => e.stopPropagation()}
             onDoubleClick={e => { e.stopPropagation(); autofit(h.column.id); }}
             onDragStart={e => e.preventDefault()} draggable={false}
             title="Arrastra para cambiar el ancho · doble clic: ajustar al contenido" aria-hidden />
      </th>
    ))}
  </tr></thead>
  …
</table>
```

- `extra`: ancho de columnas que no son de datos (casilla de selección, acciones), para que el total cuadre.
- El `<th>` queda con `position: relative` y `box-sizing: border-box` por `.aa-table th` del CSS.
- Con reordenamiento de columnas por arrastre, el `<th>` es `draggable` solo cuando no se está cambiando el ancho.
