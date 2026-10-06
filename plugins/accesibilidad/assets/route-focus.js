/* accesibilidad · Cambio de ruta en una SPA (WCAG 2.4.2 Título y 2.4.3 Orden del foco).
   Sin esto, al navegar el título no cambia, el foco cae al <body> y el lector de pantalla no anuncia nada.

   dtRouteFocus(contenedor, ' · Mi app') →
     - document.title = texto del h1 + sufijo, cada vez que el h1 cambia (también cuando llega después de cargar datos);
     - al cambiar la URL (hash o history), el foco pasa al h1 (tabindex -1, sin anillo: ver a11y-base.css).
   En la carga inicial no mueve el foco. Devuelve una función para desconectarlo.
   El contenedor es donde se pinta la página (no el modal ni el menú): <main> o el nodo donde monta el router.
   Se espera al h1 real con un MutationObserver porque muchas páginas muestran "Cargando…" antes de su título.
   Cada página necesita un h1, también las de error, vacío y "no encontrado". */
(function () {
    function dtRouteFocus(root, suffix) {
        var url = location.href;
        var obs = new MutationObserver(function () {
            var h1 = root.querySelector('h1');
            if (!h1) return;
            document.title = h1.textContent.trim() + (suffix || '');
            if (url === location.href) return;
            url = location.href;
            h1.tabIndex = -1;
            h1.focus();
        });
        obs.observe(root, { childList: true, subtree: true, characterData: true });
        return function () { obs.disconnect(); };
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = dtRouteFocus;
    else window.dtRouteFocus = dtRouteFocus;
})();
