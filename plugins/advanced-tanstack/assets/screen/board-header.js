(function () {
    "use strict";

    // Auto-refresh de los tableros: pide a DataViews recargar en segundo plano; ClientApp avisa con "dataviews:loaded".
    // El indicador solo informa; "Actualizar ahora" es una herramienta de la barra (toolbarEnd).
    const dot = document.getElementById("connection-indicator");
    const label = document.getElementById("connection-label");
    const rateSelect = document.getElementById("sync-rate");
    if (!dot || !label) return;

    const RATE_KEY = "dataviews-refresh-rate";
    let intervalMs = 60000, intervalId = null, lastUpdated = null, connected = false;
    try { intervalMs = Number(localStorage.getItem(RATE_KEY)) || intervalMs; } catch { }
    if (rateSelect) rateSelect.value = String(intervalMs);

    function elapsed(ms) {
        const s = Math.floor(ms / 1000);
        if (s < 60) return `hace ${s}s`;
        const m = Math.floor(s / 60);
        return m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h`;
    }
    function updateLabel() {
        label.textContent = connected && lastUpdated ? `Actualizado ${elapsed(Date.now() - lastUpdated)}` : lastUpdated === null ? "Conectando…" : "Sin conexión";
    }
    const reload = () => window.dispatchEvent(new Event("dataviews:reload"));
    function restart() {
        clearInterval(intervalId);
        intervalId = setInterval(reload, intervalMs);
    }

    window.addEventListener("dataviews:loaded", e => {
        connected = e.detail.ok;
        if (connected) lastUpdated = Date.now(); else lastUpdated ??= 0;
        dot.classList.toggle("conn-dot--online", connected);
        dot.classList.toggle("conn-dot--offline", !connected);
        updateLabel();
    });
    rateSelect?.addEventListener("change", () => {
        intervalMs = Number(rateSelect.value) || 60000;
        try { localStorage.setItem(RATE_KEY, String(intervalMs)); } catch { }
        restart();
    });

    restart();
    setInterval(updateLabel, 1000);
})();
