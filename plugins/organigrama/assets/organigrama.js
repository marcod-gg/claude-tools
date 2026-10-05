// Organigrama · módulo ES sin dependencias (skill organigrama de claude-tools).
//   organigramaPersonas(personas, op)  árbol por jefatura directa; sin jefatura ni reportes van aparte, como pares
//   organigramaEquipos(equipos, op)    árbol de equipos anidados (áreas) y los transversales aparte
//   arbolEquipos(equipos)              ruta, subequipos e integrantes heredados (un equipo incluye a sus subequipos)
//   visorOrganigrama(contenido, op)    marca de agua, zoom, buscador, arrastre, pantalla completa y descarga PNG/PDF
//                                      de todo o de una parte (descendente, ascendente, ascendente con pares)
// Íconos: Phosphor (https://phosphoricons.com) por defecto; se cambian con op.icono. Estilos en organigrama.css (tokens --org-*).
// PNG: html-to-image se carga desde jsDelivr solo al pedir la descarga. PDF: el diálogo de impresión con una copia del árbol.

const HTML_TO_IMAGE = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';

// ── Utilidades ──────────────────────────────────────────────────────────
// dataset es de solo lectura: se copia campo a campo (Object.assign sobre el elemento lo ignora sin error)
function el(tag, { dataset, ...props } = {}, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  if (dataset) Object.assign(e.dataset, dataset);
  e.append(...hijos.filter(h => h != null && h !== false));
  return e;
}
const iconoPhosphor = n => el('i', { className: `ph ph-${n}`, ariaHidden: 'true' });
export const iniciales = n => String(n ?? '').split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();
export const normalizar = s => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const menosMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const vacio = txt => el('p', { className: 'org-vacio', textContent: txt });
const cargarScript = src => new Promise((listo, falla) => {
  const previo = document.querySelector(`script[data-src="${src}"]`);
  if (previo?.dataset.listo) return listo();
  const s = Object.assign(document.createElement('script'), { src, onload: () => { s.dataset.listo = '1'; listo(); }, onerror: () => falla(new Error('no se pudo cargar la herramienta de imagen')) });
  s.dataset.src = src;
  document.head.append(s);
});

// Árbol con conectores: items = raíces; hijos(item) = sus hijos; nodo(item) = recuadro. --d = profundidad (aparecen de arriba abajo)
export function arbolOrg(items, hijos, nodo) {
  const rama = (x, d) => {
    const hs = hijos(x);
    const li = el('li', { className: 'org-rama' }, nodo(x), hs.length > 0 && el('ul', { className: 'org-hijos' }, ...hs.map(h => rama(h, d + 1))));
    li.style.setProperty('--d', d);
    return li;
  };
  return el('div', { className: 'org' }, el('ul', { className: 'org__arbol' }, ...items.map(x => rama(x, 0))));
}

// ── Personas por jefatura ───────────────────────────────────────────────
// personas: [{ id, nombre, cargo?, jefeId?, email?, etiqueta? }]. La jefatura cuenta si está en el conjunto
// (sirve para toda la empresa o para el organigrama interno de un equipo).
// op: { onPersona(persona), icono, vacio: 'texto si no hay nadie', ayudaSinJefaturas }
export function organigramaPersonas(personas, op = {}) {
  if (!personas.length) return vacio(op.vacio ?? 'Aún no hay personas.');
  const ids = new Set(personas.map(p => p.id));
  const jefeAqui = p => (p.jefeId && ids.has(p.jefeId) ? p.jefeId : null);
  const reportes = id => personas.filter(p => jefeAqui(p) === id);
  const enArbol = personas.filter(p => jefeAqui(p) || reportes(p.id).length);
  const sueltos = personas.filter(p => !enArbol.includes(p));
  const buscable = p => ({ buscar: normalizar(`${p.nombre} ${p.cargo ?? ''} ${p.email ?? ''}`) });
  const abrir = p => op.onPersona && (() => op.onPersona(p));
  const tarjeta = p => el(op.onPersona ? 'button' : 'div', { type: 'button', className: 'org-nodo org-nodo--persona', title: p.email ?? '', dataset: buscable(p), onclick: abrir(p) },
    el('span', { className: 'org-avatar', ariaHidden: 'true', textContent: iniciales(p.nombre) }),
    el('span', { className: 'org-persona__txt' }, el('b', { textContent: p.nombre }),
      el('small', { className: 'org-cargo', textContent: p.cargo || p.etiqueta || '' }),
      reportes(p.id).length > 0 && el('small', { className: 'org-muted', textContent: plural(reportes(p.id).length, 'reporte directo', 'reportes directos') })));
  const par = p => el('li', {}, el(op.onPersona ? 'button' : 'div', { type: 'button', className: 'org-persona', title: p.email ?? '', dataset: buscable(p), onclick: abrir(p) },
    el('span', { className: 'org-avatar', ariaHidden: 'true', textContent: iniciales(p.nombre) }),
    el('span', { className: 'org-persona__txt' }, el('span', { textContent: p.nombre }), p.cargo && el('small', { className: 'org-muted', textContent: p.cargo }))));
  return el('div', { className: 'org-personas' },
    enArbol.length > 0 && arbolOrg(enArbol.filter(p => !jefeAqui(p)), p => reportes(p.id), tarjeta),
    sueltos.length > 0 && el('div', { className: 'org-sueltos' },
      el('h3', { className: 'org-subtitulo', textContent: enArbol.length ? 'Sin jefatura asignada' : 'Integrantes' }),
      !enArbol.length && el('p', { className: 'org-muted', textContent: op.ayudaSinJefaturas ?? 'Nadie tiene jefatura asignada: asígnala para ver la jerarquía.' }),
      el('ul', { className: 'org-pares org-pares--grid' }, ...sueltos.map(par))));
}

// ── Equipos anidados ────────────────────────────────────────────────────
// equipos: [{ id, nombre, padreId?, tipo?: 'area' | 'transversal', integrantes: [idPersona] }]
export function arbolEquipos(equipos) {
  const lista = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const porId = new Map(lista.map(g => [g.id, g]));
  const hijos = new Map(lista.map(g => [g.id, []]));
  const raices = [];
  for (const g of lista) (g.padreId && porId.has(g.padreId) ? hijos.get(g.padreId) : raices).push(g);
  const orden = [];
  const recorrer = (g, nivel) => { orden.push({ g, nivel }); hijos.get(g.id).forEach(h => recorrer(h, nivel + 1)); };
  raices.forEach(g => recorrer(g, 0));
  const debajo = id => hijos.get(id).flatMap(h => [h, ...debajo(h.id)]);
  const integrantes = id => new Set([porId.get(id), ...debajo(id)].flatMap(g => g.integrantes ?? []));
  const ruta = id => { const r = []; for (let g = porId.get(id); g; g = porId.get(g.padreId)) r.unshift(g); return r; };
  return { porId, hijos, raices, orden, debajo, integrantes, ruta };
}

// op: { hrefEquipo(equipo) | onEquipo(equipo), icono, vacio }
export function organigramaEquipos(equipos, op = {}) {
  const icono = op.icono ?? iconoPhosphor;
  const arbol = arbolEquipos(equipos);
  if (!arbol.raices.length) return vacio(op.vacio ?? 'Aún no hay equipos.');
  const nodo = g => {
    const subs = arbol.hijos.get(g.id).length;
    const props = { className: 'org-nodo org-nodo--equipo', dataset: { buscar: normalizar(g.nombre) } };
    if (op.hrefEquipo) props.href = op.hrefEquipo(g);
    else if (op.onEquipo) { props.type = 'button'; props.onclick = () => op.onEquipo(g); }
    return el(op.hrefEquipo ? 'a' : op.onEquipo ? 'button' : 'div', props,
      el('div', { className: 'org-nodo__head' }, el('b', { textContent: g.nombre }), (op.hrefEquipo || op.onEquipo) && icono('arrow-right')),
      el('span', { className: 'org-muted', textContent: [plural(arbol.integrantes(g.id).size, 'persona', 'personas'), subs && plural(subs, 'subequipo', 'subequipos')].filter(Boolean).join(' · ') }));
  };
  const areas = arbol.raices.filter(g => g.tipo !== 'transversal');
  const transversales = arbol.raices.filter(g => g.tipo === 'transversal');
  return el('div', { className: 'org-personas' },
    areas.length ? arbolOrg(areas, g => arbol.hijos.get(g.id), nodo) : vacio('Aún no hay áreas.'),
    transversales.length > 0 && el('section', { className: 'org-transversales', ariaLabel: 'Equipos transversales' },
      el('h3', { className: 'org-subtitulo', textContent: 'Equipos transversales' }),
      el('p', { className: 'org-muted', textContent: 'Comités, sindicatos y otros equipos que cruzan las áreas.' }),
      el('div', { className: 'org-transversales__lista' }, ...transversales.map(nodo))));
}

// ── Visor ───────────────────────────────────────────────────────────────
// op: { nombre: 'Logística Sur', eyebrow: 'Organigrama', firma: ['MiApp', 'MiEmpresa'] (por <producto> · <marca>),
//       logo (URL o elemento; reemplaza el sello), icono, avisar(texto) (errores de descarga; por defecto console.error) }
export function visorOrganigrama(contenido, op = {}) {
  const icono = op.icono ?? iconoPhosphor;
  const nombre = op.nombre ?? '';
  const eyebrow = op.eyebrow ?? 'Organigrama';
  const [producto, marcaTexto] = op.firma ?? [];
  const avisar = op.avisar ?? (t => console.error(t));
  let zoom = 1, teclas = () => { };

  const marca = el('div', { className: 'orgv__marca' },
    typeof op.logo === 'string' ? el('img', { className: 'orgv__logo', src: op.logo, alt: '' })
      : op.logo ?? el('span', { className: 'orgv__sello', ariaHidden: 'true' }),
    el('div', {}, el('span', { className: 'orgv__eyebrow', textContent: eyebrow }), el('b', { textContent: nombre }),
      producto && el('small', {}, `por ${producto}`, marcaTexto && ' · ', marcaTexto && el('span', { className: 'orgv__firma', translate: false, textContent: marcaTexto }))));
  const escala = el('div', { className: 'orgv__zoom' }, contenido);
  const hoja = el('div', { className: 'orgv__hoja' }, marca, escala);
  const lienzo = el('div', { className: 'orgv__lienzo', tabIndex: 0, ariaLabel: `${eyebrow} ${nombre}. Arrastra para moverte; + y - para el zoom` }, hoja);

  // Zoom con la propiedad CSS zoom: cambia el tamaño real, así el scroll del lienzo sigue al contenido (transform no)
  const pct = el('span', { className: 'orgv__pct', ariaLive: 'polite', textContent: '100%' });
  const aplicar = z => { zoom = Math.min(2, Math.max(0.3, Math.round(z * 100) / 100)); escala.style.zoom = zoom; pct.textContent = `${Math.round(zoom * 100)}%`; };
  const anchoNatural = () => { const z = zoom; escala.style.zoom = 1; const w = escala.scrollWidth; escala.style.zoom = z; return w; };
  const ajustar = () => aplicar(Math.min(1, (lienzo.clientWidth - 56) / anchoNatural()));
  const btn = (ic, label, fn) => el('button', { type: 'button', className: 'orgv__btn', title: label, ariaLabel: label, onclick: fn }, icono(ic));
  lienzo.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); aplicar(zoom * (e.deltaY < 0 ? 1.1 : 0.9)); }, { passive: false });
  lienzo.addEventListener('keydown', e => {
    teclas(e);
    if (e.target !== lienzo) return;
    if (e.key === '+' || e.key === '=') aplicar(zoom + 0.1);
    else if (e.key === '-') aplicar(zoom - 0.1);
    else if (e.key === '0') aplicar(1);
  });

  // Arrastrar el fondo con el mouse (en táctil basta el desplazamiento nativo)
  let arrastre = null;
  lienzo.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button || e.target.closest('button, a, input, summary')) return;
    arrastre = { x: e.clientX, y: e.clientY, l: lienzo.scrollLeft, t: lienzo.scrollTop };
    lienzo.setPointerCapture(e.pointerId);
    lienzo.classList.add('es-arrastrando');
  });
  lienzo.addEventListener('pointermove', e => {
    if (!arrastre) return;
    lienzo.scrollLeft = arrastre.l - (e.clientX - arrastre.x);
    lienzo.scrollTop = arrastre.t - (e.clientY - arrastre.y);
  });
  const soltar = () => { arrastre = null; lienzo.classList.remove('es-arrastrando'); };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  // Buscador sobre data-buscar: resalta, centra la actual; Enter / Shift+Enter recorren
  const buscar = el('input', { type: 'search', placeholder: 'Buscar persona, cargo o equipo', ariaLabel: 'Buscar en el organigrama' });
  const conteo = el('span', { className: 'orgv__conteo org-muted', ariaLive: 'polite' });
  let hallados = [], actual = 0;
  const ir = n => {
    if (!hallados.length) return;
    actual = (n + hallados.length) % hallados.length;
    hallados.forEach((h, k) => h.classList.toggle('es-actual', k === actual));
    hallados[actual].scrollIntoView({ block: 'center', inline: 'center', behavior: menosMovimiento() ? 'auto' : 'smooth' });
    conteo.textContent = `${actual + 1} de ${hallados.length}`;
  };
  buscar.addEventListener('input', () => {
    const q = normalizar(buscar.value.trim());
    hoja.querySelectorAll('.es-hallado').forEach(n => n.classList.remove('es-hallado', 'es-actual'));
    hallados = q ? [...hoja.querySelectorAll('[data-buscar]')].filter(n => n.dataset.buscar.includes(q)) : [];
    hallados.forEach(n => n.classList.add('es-hallado'));
    conteo.textContent = q && !hallados.length ? 'Sin resultados' : '';
    if (hallados.length) ir(0);
  });
  buscar.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ir(actual + (e.shiftKey ? -1 : 1)); } });

  // ── Descargas: siempre una copia de la hoja (recortada si hay parte elegida), a tamaño real y sin resaltados ──
  hoja.querySelectorAll('.org-rama').forEach((li, i) => li.dataset.rama = i);
  let eleccion = null; // { id, dir: 'abajo' | 'arriba', pares, etiqueta }
  const nombreDe = li => li.querySelector(':scope > .org-nodo b')?.textContent ?? 'nodo';
  const hermanos = li => [...li.parentElement.children].filter(h => h !== li && h.matches('.org-rama'));
  const ramasIncluidas = li => eleccion.dir === 'abajo'
    ? [li, ...li.querySelectorAll('.org-rama')]
    : (() => {
      const r = eleccion.pares ? hermanos(li) : [];
      for (let x = li; x; x = x.parentElement.closest('.org-rama')) r.push(x);
      return r;
    })();
  const recortar = () => {
    const copia = hoja.cloneNode(true);
    copia.classList.remove('es-seleccionando');
    copia.querySelectorAll('.es-hallado, .es-actual, .es-fuera, .es-elegida').forEach(n => n.classList.remove('es-hallado', 'es-actual', 'es-fuera', 'es-elegida'));
    copia.querySelector('.orgv__zoom').style.zoom = 1;
    if (!eleccion) return copia;
    const li = copia.querySelector(`[data-rama="${eleccion.id}"]`);
    copia.querySelectorAll('.org-sueltos, .org-transversales').forEach(n => n.remove());
    const arbol = li.closest('.org');
    copia.querySelectorAll('.org').forEach(o => o !== arbol && o.remove());
    if (eleccion.dir === 'abajo') li.closest('.org__arbol').replaceChildren(li);
    else {
      li.querySelector(':scope > .org-hijos')?.remove();
      // Con pares quedan los hermanos del nodo (sin lo que cuelga de ellos); hacia arriba, solo la cadena
      if (eleccion.pares) hermanos(li).forEach(h => h.querySelector(':scope > .org-hijos')?.remove());
      for (let x = eleccion.pares ? li.parentElement.closest('.org-rama') : li; x; x = x.parentElement.closest('.org-rama'))
        [...x.parentElement.children].forEach(h => h !== x && h.remove());
    }
    copia.querySelector('.orgv__marca > div').append(el('small', { className: 'orgv__parte', textContent: eleccion.etiqueta }));
    return copia;
  };
  // Fuera de pantalla dentro de un .orgv (los estilos dependen de él) para medirla o fotografiarla
  const montarCopia = () => {
    const copia = recortar();
    const caja = el('div', { className: 'orgv orgv--export' }, copia);
    document.body.append(caja);
    return { caja, copia };
  };
  const archivo = () => `${eyebrow} ${nombre}${eleccion ? ` - ${eleccion.etiqueta}` : ''}`.trim().replace(/[\\/:*?"<>|]/g, '-');
  const png = async () => {
    const { caja, copia } = montarCopia();
    try {
      await cargarScript(HTML_TO_IMAGE);
      const url = await window.htmlToImage.toPng(copia, { pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor,
        width: copia.scrollWidth, height: copia.scrollHeight });
      el('a', { href: url, download: `${archivo()}.png` }).click();
    } catch (e) {
      avisar(`No se pudo generar la imagen: ${e?.message ?? e}`);
    } finally {
      caja.remove();
    }
  };
  // PDF: se imprime solo la copia (el resto con display:none, no visibility: no deja páginas en blanco), ajustada a A4 horizontal
  const pdf = () => {
    const { caja, copia } = montarCopia();
    copia.querySelector('.orgv__zoom').style.zoom = Math.min(1, 1000 / copia.scrollWidth);
    caja.id = 'org-impresion';
    document.body.classList.add('org-imprimiendo');
    const titulo = document.title;
    document.title = archivo(); // nombre propuesto al guardar como PDF
    window.addEventListener('afterprint', () => { caja.remove(); document.body.classList.remove('org-imprimiendo'); document.title = titulo; }, { once: true });
    window.print();
  };

  // ── Descargar una parte en tres pasos: nodo (clic en captura: no dispara su acción), dirección, formato ──
  let dir = 'abajo', pares = false;
  const desde = el('span', { className: 'orgv__desde' });
  const pintarDesde = li => desde.replaceChildren(...(li
    ? [el('span', { className: 'org-avatar', ariaHidden: 'true', textContent: iniciales(nombreDe(li)) }),
        el('span', { className: 'org-persona__txt' }, el('b', { textContent: nombreDe(li) }),
          el('small', { className: 'org-muted', textContent: li.querySelector(':scope > .org-nodo small')?.textContent ?? '' }))]
    : [icono('cursor-click'), el('span', { className: 'org-muted', textContent: 'Haz clic en una persona o equipo' })]));
  // Un solo valor para el grupo: con radios, cada uno necesita el MISMO name (un name aleatorio por radio los desacopla)
  const seg = el('div', { className: 'orgv__seg', role: 'group', ariaLabel: 'Dirección' },
    ...[['abajo', 'arrow-down', 'Descendente', 'El nodo y todo lo que depende de él'], ['arriba', 'arrow-up', 'Ascendente', 'El nodo y su cadena hasta la cima']].map(([v, i, t, ayuda]) =>
      el('button', { type: 'button', title: ayuda, ariaPressed: String(v === dir), dataset: { dir: v }, onclick: () => {
        dir = v;
        seg.querySelectorAll('button').forEach(b => b.ariaPressed = String(b.dataset.dir === dir));
        incluirPares.hidden = dir !== 'arriba';
        if (eleccion) elegir(hoja.querySelector(`[data-rama="${eleccion.id}"]`));
      } }, icono(i), ` ${t}`)));
  const casillaPares = el('input', { type: 'checkbox', role: 'switch', onchange: () => {
    pares = casillaPares.checked;
    if (eleccion) elegir(hoja.querySelector(`[data-rama="${eleccion.id}"]`));
  } });
  const incluirPares = el('label', { className: 'orgv__pares', hidden: true, title: 'Personas o equipos del mismo nivel, sin lo que depende de ellos' },
    casillaPares, el('span', { className: 'orgv__switch', ariaHidden: 'true' }), ' Incluir pares');
  const cuenta = el('span', { className: 'orgv__cuenta org-muted', ariaLive: 'polite' });
  const como = el('details', { className: 'orgv__menu orgv__como es-inactivo' },
    el('summary', { className: 'orgv__primario', ariaDisabled: 'true', onclick: e => { if (!eleccion) e.preventDefault(); } },
      icono('download-simple'), ' Descargar como', icono('caret-down')),
    el('div', { className: 'orgv__menu-panel' },
      el('button', { type: 'button', onclick: () => { como.open = false; png(); } }, icono('file-png'), ' Imagen PNG'),
      el('button', { type: 'button', onclick: () => { como.open = false; pdf(); } }, icono('file-pdf'), ' PDF')));
  const habilitarComo = si => { como.classList.toggle('es-inactivo', !si); como.querySelector('summary').ariaDisabled = String(!si); if (!si) como.open = false; };
  const paso = (n, titulo, ...hijos) => el('div', { className: 'orgv__paso' }, el('span', { className: 'orgv__num', ariaHidden: 'true', textContent: n }),
    el('div', { className: 'orgv__paso-cuerpo' }, el('small', { className: 'orgv__paso-titulo', textContent: titulo }), ...hijos));
  const seleccion = el('div', { className: 'orgv__seleccion', hidden: true, role: 'region', ariaLabel: 'Descargar una parte del organigrama' },
    paso('1', 'Desde', desde),
    paso('2', 'Dirección', el('div', { className: 'orgv__dir-fila' }, seg, incluirPares)),
    paso('3', 'Descargar', el('div', { className: 'orgv__sel-acciones' }, como, cuenta)),
    el('button', { type: 'button', className: 'orgv__btn orgv__cerrar', title: 'Cancelar (Esc)', ariaLabel: 'Cancelar la descarga de una parte', onclick: () => salirSeleccion() }, icono('x')));
  pintarDesde(null);
  const elegir = li => {
    eleccion = { id: li.dataset.rama, dir, pares: dir === 'arriba' && pares };
    eleccion.etiqueta = `${nombreDe(li)} · ${dir === 'abajo' ? 'descendente' : eleccion.pares ? 'ascendente con pares' : 'ascendente'}`;
    const dentro = new Set(ramasIncluidas(li));
    hoja.querySelectorAll('.org-rama').forEach(r => r.querySelector(':scope > .org-nodo')?.classList.toggle('es-fuera', !dentro.has(r)));
    hoja.querySelectorAll('.es-elegida').forEach(n => n.classList.remove('es-elegida'));
    li.querySelector(':scope > .org-nodo')?.classList.add('es-elegida');
    hoja.querySelectorAll('.org-sueltos, .org-transversales').forEach(n => n.classList.add('es-fuera'));
    pintarDesde(li);
    cuenta.textContent = `${dentro.size} de ${hoja.querySelectorAll('.org-rama').length} incluidos`;
    habilitarComo(true);
  };
  const entrarSeleccion = () => {
    menu.open = false;
    seleccion.hidden = false;
    hoja.classList.add('es-seleccionando');
    lienzo.focus();
  };
  function salirSeleccion() {
    eleccion = null;
    seleccion.hidden = true;
    hoja.classList.remove('es-seleccionando');
    hoja.querySelectorAll('.es-fuera, .es-elegida').forEach(n => n.classList.remove('es-fuera', 'es-elegida'));
    pintarDesde(null);
    cuenta.textContent = '';
    habilitarComo(false);
  }
  hoja.addEventListener('click', e => {
    if (!hoja.classList.contains('es-seleccionando')) return;
    const nodo = e.target.closest('.org-rama > .org-nodo');
    if (!nodo) return;
    e.preventDefault();
    e.stopPropagation();
    elegir(nodo.parentElement);
  }, true);
  teclas = e => { if (e.key === 'Escape' && !seleccion.hidden) salirSeleccion(); };

  const menu = el('details', { className: 'orgv__menu' },
    el('summary', { className: 'orgv__btn orgv__btn--txt', title: 'Descargar' }, icono('download-simple'), el('span', { textContent: 'Descargar' })),
    el('div', { className: 'orgv__menu-panel' },
      el('span', { className: 'orgv__menu-titulo', textContent: 'Todo el organigrama' }),
      el('button', { type: 'button', onclick: () => { menu.open = false; salirSeleccion(); png(); } }, icono('file-png'), ' Imagen PNG'),
      el('button', { type: 'button', onclick: () => { menu.open = false; salirSeleccion(); pdf(); } }, icono('file-pdf'), ' PDF'),
      el('span', { className: 'orgv__menu-titulo', textContent: 'Una parte' }),
      el('button', { type: 'button', onclick: entrarSeleccion }, icono('selection-plus'), ' Elegir desde una persona o equipo…')));
  // Los desplegables se cierran al hacer clic fuera
  document.addEventListener('click', e => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
    if (como.open && !como.contains(e.target)) como.open = false;
  });

  const visor = el('section', { className: 'orgv', ariaLabel: `${eyebrow} ${nombre}` });
  const barra = el('div', { className: 'orgv__barra', role: 'toolbar', ariaLabel: 'Herramientas del organigrama' },
    el('label', { className: 'orgv__buscar' }, icono('magnifying-glass'), buscar), conteo,
    el('div', { className: 'orgv__grupo' },
      btn('minus', 'Alejar', () => aplicar(zoom - 0.1)), pct, btn('plus', 'Acercar', () => aplicar(zoom + 0.1)),
      btn('arrows-in-line-horizontal', 'Ajustar al ancho', ajustar), btn('arrow-counter-clockwise', 'Tamaño real', () => aplicar(1))),
    menu, btn('corners-out', 'Pantalla completa', () => document.fullscreenElement ? document.exitFullscreen() : visor.requestFullscreen()));
  visor.append(barra, seleccion, lienzo);
  // Si el árbol no cabe al montarse, se ajusta al ancho (sin bajar de 50 %)
  setTimeout(() => { if (lienzo.isConnected && anchoNatural() > lienzo.clientWidth) aplicar(Math.max(0.5, (lienzo.clientWidth - 56) / anchoNatural())); }, 0);
  return visor;
}
