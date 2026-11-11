/* parrilla.js — parrilla de widgets de 12 columnas (skill parrilla-widgets de claude-tools). Sin dependencias, script clásico.
   Uso:  const g = crearParrilla({ el, layout, onSave, tray, list });  g.editar(true)
   Modelo: layout = [{ id, w, x, y, h? }]  w = columnas (3..12) · x,y = cuadro · h = alto en px (sin h: alto automático).
   Las filas miden lo mismo que una columna: cada cuadro de la cuadrícula es cuadrado. */
(function () {
  const GAP = 16, EASE = "cubic-bezier(.2,.8,.2,1)", reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const TOOLS = `<div class="pz-tools"><button type="button" class="pz-btn pz-grip" aria-label="Mover widget" title="Arrastrar para mover · flechas: mover un cuadro · Mayús+flechas: ancho y alto">⠿</button><button type="button" class="pz-btn pz-hide" aria-label="Quitar widget" title="Quitar de la página">×</button></div><span class="pz-rz" title="Arrastra para cambiar tamaño · doble clic: alto automático"></span>`;

  window.crearParrilla = function (o) {
    const el = o.el, C = o.cols || 12, MINW = o.minW || 3, MINH = o.minH || 120;
    const area = o.area || el.parentElement, list = o.list, TR = o.tray;
    let LAY = (o.layout || []).map(x => ({ ...x }));
    const items = () => [...el.querySelectorAll(":scope > .pz-item")];
    const P = id => items().find(p => p.dataset.id === id);
    const vis = () => items().filter(p => !p.hidden);
    const idOf = p => p.dataset.id, itOf = p => LAY.find(x => x.id === idOf(p));
    const save = () => o.onSave?.(LAY.map(x => ({ ...x })));
    items().forEach(p => { if (!p.querySelector(":scope > .pz-tools")) p.insertAdjacentHTML("beforeend", TOOLS) });

    /* RW: filas de cada widget · dFixed: el que se mueve (no lo empujan) · POS: dónde se ve cada widget ahora. POS se calcula desde
       la posición guardada (x, y) y nunca la modifica: si un widget crece empuja a los de abajo solo en pantalla. La posición
       guardada cambia solo cuando el usuario suelta un widget (commit). */
    const RW = new Map(), POS = new Map(), seen = new WeakSet();
    let dFixed = null, dSlot = null, dDrag = null, dfr = 0, tDrag = null, tSkip = false;
    const step = () => (el.clientWidth - (C - 1) * GAP) / C + GAP;
    const clampW = w => Math.max(MINW, Math.min(C, w || 6));
    const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + RW.get(b.id) && b.y < a.y + RW.get(a.id);

    function settle() {
      POS.clear(); const placed = [], add = q => { placed.push(q); POS.set(q.id, q) };
      const fix = it => { it.w = clampW(it.w); return { id: it.id, w: it.w, x: Math.max(0, Math.min(C - it.w, it.x | 0)), y: Math.max(0, it.y | 0) } };
      if (dFixed && RW.has(dFixed.id) && dFixed.x != null) add(fix(dFixed));
      const rest = LAY.filter(it => it !== dFixed && RW.has(it.id));
      rest.filter(it => it.x != null).sort((a, b) => a.y - b.y || a.x - b.x).forEach(it => {   // cada uno sube hasta donde pueda
        const q = fix(it); let c; q.y = 0;
        while ((c = placed.filter(p => over(q, p))).length) q.y = Math.max(...c.map(p => p.y + RW.get(p.id)));
        add(q)
      });
      rest.filter(it => it.x == null).forEach(it => {   // sin posición: el primer hueco, y queda guardado
        const q = { id: it.id, w: it.w = clampW(it.w) };
        for (let y = 0, ok = false; !ok; y++) for (let x = 0; x + q.w <= C && !ok; x++) { q.x = x; q.y = y; ok = !placed.some(p => over(q, p)) }
        it.x = q.x; it.y = q.y; add(q)
      })
    }
    const commit = () => POS.forEach((q, id) => { const it = LAY.find(i => i.id === id); if (it) { it.x = q.x; it.y = q.y } });

    function fit() {
      const wide = innerWidth > 760, g = (el.clientWidth - (C - 1) * GAP) / C, st = g + GAP; if (!(g > 0)) return;
      if (el.dataset.g !== String(g)) {
        el.dataset.g = g; el.style.setProperty("--pz-col", g + "px"); el.style.setProperty("--pz-step", st + "px");
        el.style.setProperty("--pz-mask", `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${st}' height='${st}'><rect width='${g}' height='${g}' rx='14'/></svg>`)}")`)
      }
      const vs = vis(); RW.clear();
      vs.forEach(p => {
        const it = itOf(p); if (!it) return; const b = p.querySelector(":scope > .pz-body");
        if (b && !seen.has(b)) { seen.add(b); RO.observe(b) }
        p.classList.toggle("auto", !it.h); const cs = getComputedStyle(p), pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 2;
        const head = [...p.children].filter(c => c !== b && !c.matches(".pz-tools,.pz-rz")).reduce((a, c) => a + c.offsetHeight, 0);
        RW.set(it.id, Math.max(1, it.h ? Math.round((it.h + GAP) / st) : Math.ceil(((b ? b.offsetHeight : 0) + head + pad + GAP) / st)))
      });
      settle();
      vs.forEach(p => {
        const it = itOf(p), q = it && POS.get(it.id); if (!q) return; const r = RW.get(it.id);
        if (wide) { p.style.gridColumn = `${q.x + 1} / span ${q.w}`; p.style.gridRow = `${q.y + 1} / span ${r}`; p.style.order = "" }
        else { p.style.gridColumn = "1/-1"; p.style.gridRow = `span ${r}`; p.style.order = q.y * C + q.x }
        if (dSlot && dDrag && dDrag.p === p) ["gridColumn", "gridRow", "order"].forEach(k => dSlot.style[k] = p.style[k])
      })
    }
    const RO = new ResizeObserver(() => { if (dDrag) return; cancelAnimationFrame(dfr); dfr = requestAnimationFrame(fit) });
    addEventListener("resize", () => { cancelAnimationFrame(dfr); dfr = requestAnimationFrame(fit) });

    /* FLIP: mide dónde se ve cada widget (aunque vaya a medio camino), aplica el cambio y lo anima desde ahí.
       La animación anterior se cancela antes de medir el destino; si no, el destino sale corrido y el widget salta. */
    function flip(change, skip) {
      const els = () => [...vis(), ...(dSlot ? [dSlot] : [])], r0 = new Map(els().map(p => [p, p.getBoundingClientRect()]));
      change(); fit(); if (reduce.matches) return;
      els().forEach(p => {
        if (p === skip) return; const a = r0.get(p); p.getAnimations().forEach(x => x.cancel()); const b = p.getBoundingClientRect();
        if (!a) { p.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: EASE }); return }
        const dx = a.left - b.left, dy = a.top - b.top; if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        p.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 440, easing: EASE, id: "flip" })
      })
    }
    function sync() { items().forEach(p => p.hidden = !LAY.some(x => x.id === idOf(p))); LAY.forEach(x => { const p = P(x.id); if (p) el.appendChild(p) }) }
    const avail = () => items().filter(p => p.hidden).map(p => ({ id: idOf(p), title: (p.querySelector("h2,h3") || {}).textContent || idOf(p), desc: (p.querySelector(".pz-sub") || {}).textContent || "" }));
    function tray() {
      if (!list) return; const av = avail();
      list.innerHTML = av.length ? `<div class="pz-lbl">Disponibles · ${av.length}</div>` + av.map(a => `<button type="button" class="pz-chip" data-add="${esc(a.id)}"><span class="pz-chip-ico">+</span><span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></span></button>`).join("")
        : '<div class="pz-empty">Todos los widgets están en la página.</div>'
    }
    function apply() { sync(); fit(); tray() }

    /* Panel contraíble y zona para quitar: al arrastrar un widget el panel se contrae solo (pz-auto) y aparece la zona */
    TR?.addEventListener("click", e => { if (!e.target.closest("[data-pzmin]")) return; const m = TR.classList.toggle("pz-min"); TR.querySelector(m ? ".pz-tab" : ".pz-tray-head [data-pzmin]")?.focus() });
    const trash = Object.assign(document.createElement("div"), { className: "pz-trash", hidden: true, innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg><span>Suelta aquí para quitar el widget</span>' });
    trash.setAttribute("role", "status"); document.body.appendChild(trash);
    const dragUi = on => { TR?.classList.toggle("pz-auto", on); trash.hidden = !on; if (!on) trash.classList.remove("on") };
    const onTrash = e => { if (trash.hidden) return false; const r = trash.getBoundingClientRect(), h = e.clientX >= r.left - 12 && e.clientX <= r.right + 12 && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12; trash.classList.toggle("on", h); return h };
    if (list) list.onclick = e => { const b = e.target.closest("[data-add]"); if (!b || tSkip) return; flip(() => { LAY = [...LAY, { id: b.dataset.add, w: 6 }]; apply() }); save() };
    el.addEventListener("click", e => {
      const x = e.target.closest(".pz-hide"); if (!x) return; const p = x.closest(".pz-item"), id = idOf(p);
      const go = () => { flip(() => { LAY = LAY.filter(i => i.id !== id); apply() }); save() };
      if (reduce.matches) go(); else p.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.94)" }], { duration: 170, easing: "ease-in" }).onfinish = go
    });
    el.addEventListener("dblclick", e => { const rz = e.target.closest(".pz-rz"); if (!rz) return; const it = itOf(rz.closest(".pz-item")); if (it && it.h) { flip(() => { delete it.h }); save() } });

    /* Autodesplazamiento al arrastrar cerca del borde: más rápido cuanto más cerca; se detiene al ver el final de la parrilla */
    let dAuto = 0, dAutoE = null, dAutoFn = null;
    const autoScroll = (e, fn) => { dAutoE = e; dAutoFn = fn; if (!dAuto) dAuto = requestAnimationFrame(autoStep) };
    function autoStep() {
      dAuto = 0; const e = dAutoE; if (!e || !dAutoFn) return; const top = (o.topOffset?.() || 0) + 60, bot = innerHeight - 60;
      let v = e.clientY < top ? e.clientY - top : e.clientY > bot ? e.clientY - bot : 0;
      if (v > 0 && el.getBoundingClientRect().bottom <= innerHeight) v = 0; if (!v) return;
      const y0 = scrollY; scrollBy(0, Math.sign(v) * Math.min(18, Math.ceil(Math.abs(v) / 3))); if (scrollY === y0) return;
      dAutoFn(e); dAuto = requestAnimationFrame(autoStep)
    }
    const autoStop = () => { cancelAnimationFrame(dAuto); dAuto = 0; dAutoE = dAutoFn = null };
    const follow = (p, e) => { p.style.transform = ""; const b = p.getBoundingClientRect(); p.style.transform = `translate(${e.clientX - dDrag.ox - b.left}px,${e.clientY - dDrag.oy - b.top}px)` };

    el.addEventListener("pointerdown", e => {
      if (!el.classList.contains("editing") || e.button) return; const p = e.target.closest(".pz-item"); if (!p || p.parentElement !== el || e.target.closest(".pz-hide")) return;
      e.preventDefault(); const r = p.getBoundingClientRect(), rz = e.target.closest(".pz-rz"), it = itOf(p); if (!it) return;
      dFixed = it;
      dDrag = rz ? { mode: "rz", p, it, y0: e.clientY, auto: !it.h } : { mode: "mv", p, it, ox: e.clientX - r.left, oy: e.clientY - r.top };
      (rz || p).setPointerCapture(e.pointerId); p.classList.add(rz ? "resizing" : "lifted");
      if (!rz) { dSlot = document.createElement("div"); dSlot.className = "pz-slot"; dSlot.setAttribute("aria-hidden", "true"); el.appendChild(dSlot); fit(); dragUi(true) }
    });
    el.addEventListener("pointermove", e => move(e));
    function move(e) {
      if (!dDrag) return; const { p, it } = dDrag, st = step();
      if (dDrag.mode === "rz") {
        const r = p.getBoundingClientRect(), w = Math.max(MINW, Math.min(C - it.x, Math.round((e.clientX - r.left + GAP) / st))),
          /* si solo se cambia el ancho, un widget de alto automático lo sigue siendo (su contenido decide el alto) */
          h = dDrag.auto && Math.abs(e.clientY - dDrag.y0) < st / 2 ? undefined : Math.max(Math.ceil((MINH + GAP) / st), Math.round((e.clientY - r.top + GAP) / st)) * st - GAP;
        if (w !== it.w || h !== it.h) flip(() => { it.w = w; if (h === undefined) delete it.h; else it.h = h }, p); return
      }
      follow(p, e); if (onTrash(e)) { autoStop(); clearTimeout(go.t); go.pend = null; return }
      const G = el.getBoundingClientRect(), x = Math.max(0, Math.min(C - it.w, Math.round((e.clientX - dDrag.ox - G.left) / st))), y = Math.max(0, Math.round((e.clientY - dDrag.oy - G.top) / st));
      dDrag.e = e; go(p, it, x, y); autoScroll(e, move)
    }
    /* Solo espera la primera mitad del desplazamiento de otro widget; pasada la mitad ya se puede volver a acomodar */
    const busy = p => vis().some(q => q !== p && q.getAnimations().some(a => a.id === "flip" && a.playState === "running" && a.currentTime < 220));
    function go(p, it, x, y, now) {
      clearTimeout(go.t); go.pend = null; if (x === it.x && y === it.y) return;
      if (!now && busy(p)) { go.pend = [p, it, x, y]; go.t = setTimeout(() => go(p, it, x, y), 50); return }
      flip(() => { it.x = x; it.y = y }, p); if (dDrag && dDrag.e) follow(p, dDrag.e)
    }
    const end = () => {
      if (!dDrag) return; autoStop(); const kill = dDrag.mode === "mv" && trash.classList.contains("on"); dragUi(false);
      if (kill) {
        const { p, it } = dDrag; dDrag = null; dSlot?.remove(); dSlot = null; dFixed = null; clearTimeout(go.t); go.pend = null;
        const out = () => { p.classList.remove("lifted"); p.style.transform = ""; flip(() => { LAY = LAY.filter(i => i !== it); apply() }); commit(); save() };
        if (reduce.matches) out(); else { const a = p.animate([{ opacity: 1 }, { opacity: 0, scale: ".9" }], { duration: 170, easing: "ease-in", fill: "forwards" }); setTimeout(() => { out(); a.cancel() }, 170) } return
      }
      if (go.pend) go(...go.pend, true); const { p, mode } = dDrag; dDrag = null; dSlot?.remove(); dSlot = null; commit(); dFixed = null; p.classList.remove("lifted", "resizing");
      /* se guarda lo que se ve con el soltado fijo y recién después se compacta: al revés, el soltado empata en fila con el que estaba ahí */
      const b0 = p.getBoundingClientRect(); p.style.transform = ""; flip(() => { }, p); commit();
      if (mode === "mv" && !reduce.matches) { const b1 = p.getBoundingClientRect(); p.animate([{ transform: `translate(${b0.left - b1.left}px,${b0.top - b1.top}px)` }, { transform: "none" }], { duration: 240, easing: EASE }) }
      save()
    };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);

    /* Arrastrar un widget de la bandeja a la parrilla: entra al pasar sobre ella, se acomoda bajo el puntero y se queda donde se
       suelte; si vuelve a la bandeja, sale. Se escucha en la ventana porque al entrar el widget la lista se vuelve a dibujar. */
    list?.addEventListener("pointerdown", e => {
      const c = e.target.closest(".pz-chip"); if (!c || e.button) return;
      tDrag = { c, id: c.dataset.add, x: e.clientX, y: e.clientY, on: false, in: false }; addEventListener("pointermove", tMove); addEventListener("pointerup", tEnd); addEventListener("pointercancel", tEnd)
    });
    function tMove(e) {
      const t = tDrag; if (!t) return;
      if (!t.on) {
        if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < 6) return; t.on = true; const r = t.c.getBoundingClientRect(); t.ox = e.clientX - r.left; t.oy = e.clientY - r.top;
        t.g = t.c.cloneNode(true); t.g.classList.add("pz-ghost"); t.g.style.width = r.width + "px"; t.g.setAttribute("aria-hidden", "true"); document.body.appendChild(t.g); dragUi(true)
      }
      t.g.style.transform = `translate(${e.clientX - t.ox}px,${e.clientY - t.oy}px)`; autoScroll(e, tMove);
      const hit = document.elementFromPoint(e.clientX, e.clientY), inGrid = !onTrash(e) && !!hit && area.contains(hit) && !(TR && TR.contains(hit)), st = step(), G = el.getBoundingClientRect();
      const cell = w => ({ x: Math.max(0, Math.min(C - w, Math.floor((e.clientX - G.left) / st))), y: Math.max(0, Math.floor((e.clientY - G.top) / st)) });
      if (inGrid && !t.in) { t.in = true; const it = { id: t.id, w: 6, ...cell(6) }; dFixed = it; flip(() => { LAY = [...LAY, it]; apply() }); P(t.id)?.classList.add("dropping"); return }
      if (!inGrid && t.in) { t.in = false; clearTimeout(go.t); go.pend = null; P(t.id)?.classList.remove("dropping"); const it = dFixed; dFixed = null; flip(() => { LAY = LAY.filter(x => x !== it); apply() }); return }
      if (t.in) { const p = P(t.id), it = dFixed, c = cell(it.w); if (p) go(p, it, c.x, c.y) }
    }
    function tEnd() {
      const t = tDrag; tDrag = null; removeEventListener("pointermove", tMove); removeEventListener("pointerup", tEnd); removeEventListener("pointercancel", tEnd);
      autoStop(); if (!t || !t.on) return; dragUi(false); t.g.remove(); tSkip = true; setTimeout(() => tSkip = false);
      if (t.in && go.pend) go(...go.pend, true); clearTimeout(go.t); go.pend = null; if (t.in) commit(); dFixed = null;
      if (t.in) { const p = P(t.id); p?.classList.remove("dropping"); fit(); commit(); save(); if (p && !reduce.matches) p.animate([{ opacity: .6, transform: "scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: EASE }) }
    }
    /* Teclado: con el foco en ⠿, flechas mueven un cuadro; Mayús+flechas cambian ancho y alto */
    el.addEventListener("keydown", e => {
      const g = e.target.closest(".pz-grip"); if (!g) return; const it = itOf(g.closest(".pz-item")); if (!it) return;
      const dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0, dy = { ArrowUp: -1, ArrowDown: 1 }[e.key] || 0; if (!dx && !dy) return; e.preventDefault(); const st = step();
      flip(() => {
        dFixed = it;
        if (e.shiftKey) { if (dx) it.w = Math.max(MINW, Math.min(C - it.x, it.w + dx)); if (dy) it.h = Math.max(Math.ceil((MINH + GAP) / st), (RW.get(it.id) || 1) + dy) * st - GAP }
        else { it.x = Math.max(0, Math.min(C - it.w, it.x + dx)); it.y = Math.max(0, it.y + dy) }
      }); commit(); dFixed = null; save(); g.focus()
    });

    const editar = on => { el.classList.toggle("editing", on); if (TR) { TR.hidden = !on; TR.classList.remove("pz-min") } fit(); tray() };
    apply();
    return {
      fit, apply, editar,
      layout: () => LAY.map(x => ({ ...x })),
      setLayout: l => { flip(() => { LAY = l.map(x => ({ ...x })); apply() }) },
      busy: () => !!dDrag || !!tDrag
    };
  };
})();
