# API de la parrilla

## `crearParrilla(opciones)`

| Opción | Tipo | Por defecto | Qué hace |
|---|---|---|---|
| `el` | Element | — | Contenedor `.pz` con los `.pz-item[data-id]` (todos los widgets posibles, visibles u ocultos) |
| `layout` | `Item[]` | `[]` | Disposición inicial. Los widgets que no están quedan ocultos y aparecen en la bandeja |
| `onSave` | `(layout) => void` | — | Se llama tras cada cambio con una copia de la disposición completa |
| `tray` | Element | — | Panel `.pz-tray` (opcional). `editar(true/false)` lo muestra u oculta |
| `list` | Element | — | `.pz-list` dentro de la bandeja: ahí se dibujan los widgets disponibles |
| `area` | Element | `el.parentElement` | Zona donde soltar un widget traído de la bandeja cuenta como "dentro" |
| `topOffset` | `() => number` | `0` | Alto de una cabecera fija: el autodesplazamiento hacia arriba empieza debajo |
| `cols` | number | `12` | Columnas |
| `minW` | number | `3` | Ancho mínimo en columnas |
| `minH` | number | `120` | Alto mínimo en px al estirar |

Devuelve:

| Método | Qué hace |
|---|---|
| `editar(on)` | Agrega o quita `.editing` en `el`, muestra la bandeja y dibuja la lista |
| `layout()` | Copia de la disposición actual |
| `setLayout(l)` | Reemplaza la disposición con animación (no llama a `onSave`) |
| `fit()` | Recalcula columnas, alturas y posiciones |
| `apply()` | Sincroniza visibles/ocultos con la disposición, `fit()` y redibuja la bandeja |
| `busy()` | `true` mientras se arrastra o estira (no aplicar cambios remotos) |

## Modelo

```js
// Item
{ id: "carga", w: 8, x: 0, y: 2, h: 389 }
```

- `w`: columnas (3–12). `x`: columna de inicio (0–11). `y`: fila (cuadros desde arriba).
- `h`: alto fijo en px; ausente = alto automático según el contenido.
- Un ítem sin `x`/`y` (p. ej. recién agregado o una disposición por defecto `{ id, w }`) toma el primer hueco libre y queda guardado.
- Las posiciones se compactan hacia arriba al mostrar; la guardada se respeta como orden.

## Marcado

```html
<div class="pz" id="grid">
  <section class="pz-item" data-id="carga">
    <h2>Carga por semana</h2>
    <div class="pz-sub">Horas planificadas</div>   <!-- descripción en la bandeja (opcional) -->
    <div class="pz-body">…contenido…</div>          <!-- lo que se mide para el alto automático y hace scroll con h -->
  </section>
</div>

<aside class="pz-tray" id="tray" hidden aria-labelledby="trayT">
  <button type="button" class="pz-tab" data-pzmin aria-label="Abrir el panel de widgets"><span>Widgets</span></button>
  <div class="pz-tray-head"><div><b id="trayT">Widgets</b><p>Ayuda breve</p></div>
    <span><button type="button" class="pz-x" data-pzmin aria-label="Contraer el panel">»</button>
          <button type="button" class="pz-x" id="done" aria-label="Cerrar">×</button></span></div>
  <div class="pz-list" id="avail"></div>
  <div class="pz-tray-foot">…Restablecer · Listo…</div>
</aside>
```

El módulo agrega a cada `.pz-item` sus herramientas (`.pz-tools` con ⠿ y ×, y la esquina `.pz-rz`), que solo se ven en edición.
`[data-pzmin]` contrae o expande la bandeja.

## Clases de estado

| Clase | Dónde | Cuándo |
|---|---|---|
| `.editing` | `.pz` | Modo Personalizar |
| `.auto` | `.pz-item` | Sin `h` (alto automático) |
| `.lifted` / `.resizing` | `.pz-item` | Mientras se mueve / estira |
| `.dropping` | `.pz-item` | Traído de la bandeja, aún sin soltar |
| `.pz-slot` | hijo de `.pz` | Dónde caerá el widget que se mueve |
| `.pz-min` / `.pz-auto` | `.pz-tray` | Contraída por el usuario / escondida mientras se arrastra |
| `.on` | `.pz-trash` | El puntero está sobre la zona para quitar |

## Tokens

| Token | Uso |
|---|---|
| `--pz-bg` | Fondo de los chips de la bandeja |
| `--pz-surface` | Widgets, bandeja, botones |
| `--pz-sunken` | Hover de botones y esquina |
| `--pz-line` | Bordes |
| `--pz-fg` / `--pz-muted` | Texto / texto secundario e íconos |
| `--pz-accent` | Cuadrícula de edición, contornos, espacio de destino |
| `--pz-bad` / `--pz-on-bad` | Zona para quitar y su texto al activarse |
| `--pz-radius` | Radio de widgets y del espacio de destino |
| `--pz-shadow` | Sombra de los widgets |

Variables que pone el módulo en `.pz` (no tocar): `--pz-col` (ancho de columna = alto de fila), `--pz-step`, `--pz-mask`.
