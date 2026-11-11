/* ancho-ajustable.js — columnas de tabla con ancho ajustable (skill ancho-ajustable de claude-tools). Sin dependencias, script clásico.
   Uso:  anchoAjustable(tabla, { clave: "mi-tabla-anchos" })
   - Arrastrar el borde derecho de un encabezado cambia el ancho de esa columna (la tabla crece o se achica; las demás no cambian).
   - Doble clic en el borde: la columna toma el ancho de su contenido visible (título y celdas), entre minAuto y maxAuto.
   - Con `clave` los anchos quedan en localStorage; con `onCambio` la app los guarda donde quiera (p. ej. en la vista del usuario).
   Cada <th> se identifica por data-col (o su texto). Las celdas deben ser de una línea (white-space:nowrap) para que el
   ajuste al contenido mida el texto completo. */
(function () {
  window.anchoAjustable = function (table, o = {}) {
    const MIN = o.min ?? 60, AMIN = o.minAuto ?? 60, AMAX = o.maxAuto ?? 640;
    const ths = () => [...table.tHead.rows[0].cells];
    const key = th => th.dataset.col || th.textContent.trim();
    let saved = o.anchos || {};
    if (o.clave) try { saved = { ...JSON.parse(localStorage.getItem(o.clave) || "{}"), ...saved } } catch (_) { }
    // Ancho inicial: el guardado o el que el navegador le dio antes de fijar el diseño de la tabla
    const W = new Map(ths().map(th => [th, saved[key(th)] ?? Math.max(MIN, Math.ceil(th.getBoundingClientRect().width))]));
    const paint = () => { let t = 0; ths().forEach(th => { const w = W.get(th); th.style.width = w + "px"; t += w }); table.style.width = t + "px" };
    const persist = () => {
      const m = {}; ths().forEach(th => m[key(th)] = W.get(th));
      if (o.clave) try { localStorage.setItem(o.clave, JSON.stringify(m)) } catch (_) { }
      o.onCambio?.(m)
    };
    table.classList.add("aa-table"); paint();

    // Doble clic: se mide el texto y las piezas en línea, no los bloques (un bloque ocupa la celda entera y no dice cuánto necesita)
    const range = document.createRange();
    const need = box => {
      if (!box) return 0; let l = Infinity, r = -Infinity;
      const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = walk.currentNode; n; n = walk.nextNode()) {
        let rect = null;
        if (n.nodeType === Node.TEXT_NODE) { if (n.textContent.trim()) { range.selectNodeContents(n); rect = range.getBoundingClientRect() } }
        else if (n !== box && !n.classList.contains("aa-resizer") && getComputedStyle(n).display.startsWith("inline")) rect = n.getBoundingClientRect();   // chips, íconos, avatares
        if (rect && rect.width) { l = Math.min(l, rect.left); r = Math.max(r, rect.right) }
      }
      const cs = getComputedStyle(box);
      return r > l ? r - l + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) : 0
    };
    const autofit = th => {
      const i = th.cellIndex; let w = need(th) + 8;
      [...table.tBodies].forEach(tb => [...tb.rows].forEach(tr => { const td = tr.cells[i]; if (td && td.colSpan === 1) w = Math.max(w, need(td) + 16) }));   // 16: aire para que el texto no toque el borde de un chip
      W.set(th, Math.round(Math.min(AMAX, Math.max(AMIN, w)))); paint(); persist()
    };

    ths().forEach((th, i, all) => {
      // Cada columna sobre la siguiente: el borde (centrado entre ambas) queda encima y recibe el mouse
      th.style.position = "relative"; th.style.zIndex = all.length - i + 1;
      const r = document.createElement("div");
      r.className = "aa-resizer"; r.title = "Arrastra para cambiar el ancho · doble clic: ajustar al contenido"; r.setAttribute("aria-hidden", "true");
      th.appendChild(r);
      r.addEventListener("pointerdown", e => {
        if (e.button) return; e.preventDefault(); e.stopPropagation();
        const x0 = e.clientX, w0 = W.get(th); r.setPointerCapture(e.pointerId);
        r.classList.add("is-resizing"); table.classList.add("aa-resizing"); document.documentElement.classList.add("aa-col-resizing");
        const move = ev => { W.set(th, Math.max(MIN, Math.round(w0 + ev.clientX - x0))); paint() };
        const up = () => {
          r.removeEventListener("pointermove", move); r.removeEventListener("pointerup", up); r.removeEventListener("pointercancel", up);
          r.classList.remove("is-resizing"); table.classList.remove("aa-resizing"); document.documentElement.classList.remove("aa-col-resizing");
          if (W.get(th) !== w0) persist()
        };
        r.addEventListener("pointermove", move); r.addEventListener("pointerup", up); r.addEventListener("pointercancel", up)
      });
      r.addEventListener("click", e => e.stopPropagation());   // no ordena ni dispara el clic del encabezado
      r.addEventListener("dblclick", e => { e.stopPropagation(); autofit(th) });
      r.addEventListener("dragstart", e => e.preventDefault())
    });

    return {
      anchos: () => Object.fromEntries(ths().map(th => [key(th), W.get(th)])),
      ajustar: col => { const th = ths().find(t => key(t) === col); if (th) autofit(th) },
      ajustarTodas: () => ths().forEach(autofit),
      restablecer: () => { ths().forEach(th => { th.style.width = "" }); table.style.width = ""; table.classList.remove("aa-table"); ths().forEach(th => W.set(th, Math.max(MIN, Math.ceil(th.getBoundingClientRect().width)))); table.classList.add("aa-table"); paint(); persist() }
    }
  }
})();
