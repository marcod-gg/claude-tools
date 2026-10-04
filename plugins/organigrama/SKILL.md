---
name: organigrama
description: Organigramas interactivos para apps web con datos reales, sin dependencias — por jefatura directa de las personas, de equipos anidados (áreas y transversales como comités o sindicatos) y el organigrama interno de un equipo. Visor con marca de agua ("Organigrama <Empresa> por <Producto> · <Marca>"), zoom (botones, Ctrl+rueda, ajustar al ancho), buscador por nombre/cargo/equipo, arrastre para moverse, pantalla completa y descarga PNG/PDF de todo o de una parte (descendente, ascendente, ascendente con pares), con animaciones y modo oscuro. Incluye el modelo opcional de Postgres/Supabase para jefaturas, cargos y equipos anidados sin ciclos con integrantes heredados. Antes de implementar pregunta qué organigramas, qué pasa al hacer clic, la firma de la marca de agua y de dónde toma el estilo. Úsala siempre que el usuario pida un organigrama, jerarquía de personas, "quién reporta a quién", estructura de equipos o áreas, árbol de cargos, jefaturas, equipos anidados o descargar el organigrama, aunque no nombre esta skill.
---

# Organigrama

Un módulo ES sin dependencias (`assets/organigrama.js`), su CSS con tokens (`assets/organigrama.css`) y un modelo de datos
opcional (`assets/sql/`). Nació en el portal de clientes de Nexus (Fractional IT); aquí queda genérico.

| Pieza | Para qué |
|---|---|
| `organigramaPersonas(personas, op)` | Árbol por jefatura directa. Sin jefatura ni reportes → aparte, como pares |
| `organigramaEquipos(equipos, op)` | Árbol de áreas anidadas; los transversales (comités, sindicatos) aparte |
| `arbolEquipos(equipos)` | Ruta (migas), subequipos e integrantes heredados (un equipo incluye a sus subequipos) |
| `visorOrganigrama(contenido, op)` | Marca de agua, zoom, buscador, arrastre, pantalla completa, descargas |

API completa, formas de datos y tokens: `references/api.md`. Ejemplo funcionando: `examples/demo/index.html`
(servir por HTTP: `python -m http.server` desde la raíz del plugin y abrir `/examples/demo/`).

## Cuándo sí / cuándo no

- **Sí**: organigrama de una empresa o área con datos de la app, consultable (buscar, acercar, moverse) y descargable.
- **No**: un diagrama estático de una vez para un documento o presentación → Mermaid o una skill de diagramas.
  Una lista corta de "quién es quién" sin jerarquía → una tabla.

## Lo que entrega

- **Personas** (el que más se consulta): un recuadro por persona con iniciales, nombre, cargo y "N reportes directos";
  clic → `onPersona` (la app abre su ficha en panel o modal).
- **Equipos**: un recuadro por equipo con personas totales (incluye subequipos) y subequipos; enlace o botón a su página.
- **Organigrama interno de un equipo**: `organigramaPersonas` con las personas de `arbolEquipos(e).integrantes(id)`;
  solo cuentan las jefaturas dentro del equipo, el resto queda como pares.
- **Visor**:
  - Marca de agua arriba a la izquierda, fija al desplazarse y presente en las descargas.
  - Zoom −/+ con porcentaje, Ajustar al ancho, Tamaño real, Ctrl+rueda y teclas `+ - 0`. Se ajusta solo si no cabe (mínimo 50 %).
  - Buscador que resalta y centra; Enter / Shift+Enter recorren.
  - Arrastre con el mouse y pantalla completa.
  - **Descargar**: todo (PNG o PDF) o una parte en tres pasos: 1 clic en un nodo, 2 **Descendente** (el nodo y lo que
    depende de él) o **Ascendente** (su cadena hasta la cima, con **Incluir pares** opcional: sus hermanos sin lo que
    cuelga de ellos), 3 "Descargar como" PNG/PDF. Vista previa atenuando lo que queda fuera y "N de M incluidos".
- **Animaciones** (todas apagadas con `prefers-reduced-motion`): nodos que aparecen por niveles, pulso en el resultado
  actual, desplegables, elevación al pasar el cursor e "Incluir pares" que entra y sale deslizándose.

## Antes de implementar: preguntar (AskUserQuestion)

Una sola llamada con estas preguntas, salvo las que el pedido ya responda (sin preferencia, la opción A):

1. **¿Qué organigramas?** (`multiSelect`) Personas por jefatura · Equipos anidados · Organigrama interno de cada equipo.
   Recomendado: personas en la pestaña o página de usuarios y equipos en la de equipos, con una vista **Organigrama | Gestionar**
   en cada una (el organigrama primero).
2. **¿Qué pasa al hacer clic en una persona o equipo?** A: abre su ficha en un **panel lateral** (vista previa sin
   perder el organigrama). B: modal. C: enlace a su página. D: nada (solo consulta).
3. **¿Qué firma lleva la marca de agua?** A: "por <producto> · <empresa que lo provee>" (deducir de la app; en Nexus,
   "por Nexus · Fractional IT"). B: sin firma (solo "Organigrama <Empresa>"). C: otro texto.
4. **¿Qué estilo toma?** A: **el de la página**: leer su CSS (variables, colores de marca, radios, fuente) y apuntar cada
   `--org-*` a lo que ya usa. B: los valores por defecto del CSS (terracota y crema, con modo oscuro). C: otra fuente que
   indique el usuario. En A y C revisar contraste ≥ 4.5:1 de texto y estados sobre su fondo en claro y oscuro.

Sin preguntar, se deduce del proyecto:

| Qué | De dónde | Resultado |
|---|---|---|
| **Jefatura y cargo** | Esquema: ¿hay "reporta a" / jefe y cargo por persona? | Si no, proponer `assets/sql/equipos_jefaturas_cargos.sql` (en la membresía por empresa si una persona puede estar en varias) y un campo "Jefatura directa" + "Cargo" en la ficha |
| **Equipos** | ¿Hay grupos o áreas? ¿Anidados? | Si son planos, agregar `padre_id` y `tipo`; mantener el nombre de la tabla si otra app ya la usa |
| **Íconos** | ¿La página carga Phosphor? | Si no, cargar `@phosphor-icons/web` o pasar `icono` con la librería que use |
| **Quién ve** | Reglas de acceso del proyecto | Mostrar solo personas activas; las RPC de lectura y escritura validan en el servidor |

## Flujo

1. **Copiar** `assets/organigrama.js` y `assets/organigrama.css` a los estáticos del proyecto (sin build: es un módulo ES).
   Si la app usa un bundler, importarlo desde ahí.
2. **Tokens** (pregunta 4): en el `:root` del sitio apuntar los `--org-*` a sus variables (`references/api.md`).
3. **Datos**: mapear al formato de personas `{ id, nombre, cargo, jefeId, email }` y equipos `{ id, nombre, padreId, tipo, integrantes }`.
   Si falta jefatura, cargo o anidamiento, aplicar el SQL (paso opcional, con migración y su archivo en el repo).
4. **Montar**: `contenedor.replaceChildren(visorOrganigrama(organigramaPersonas(activos, { onPersona }), { nombre, firma, avisar }))`.
   Página de un equipo: ruta con `arbolEquipos(e).ruta(id)`, subequipos con `.hijos.get(id)` y su organigrama interno.
5. **Editar jefaturas y equipos**: ficha de la persona con Cargo y Jefatura directa (select de miembros activos, sin la propia persona)
   y equipos como multiselect con sangría por nivel (`orden`). El servidor valida ciclos y permisos.
6. **Verificar**: `node --check` del módulo y build del proyecto siempre. La revisión en el navegador (Playwright) **solo con
   confirmación previa**. Si se confirma: buscar, zoom, arrastre, descargar todo y una parte en las dos direcciones (con y sin
   pares), en claro y oscuro y en móvil.

## Principios

- **Sin dependencias**: árbol con listas anidadas y conectores CSS; html-to-image (PNG) se carga desde jsDelivr solo al
  pedir la descarga; el PDF es el diálogo de impresión.
- **Zoom con la propiedad CSS `zoom`**, no `transform`: cambia el tamaño real y el scroll del lienzo sigue al contenido.
- **Exportar siempre una copia** de la hoja (marca + árbol), recortada si hay parte elegida, a tamaño real y sin resaltados.
  Se monta fuera de pantalla dentro de un `.orgv` porque sus estilos dependen de él.
- **PDF**: imprimir solo la copia con `display:none` en el resto (con `visibility:hidden` quedan páginas en blanco), A4 horizontal,
  ajustada a ~1000 px de ancho.
- **Elegir un nodo en modo selección**: listener de clic en fase de captura sobre la hoja, así no se dispara la acción del nodo.
- **Jefatura y equipos sin ciclos en la base** (triggers recursivos); el cliente solo evita el intento.

## Errores ya resueltos (no repetir)

- **Radios de un mismo grupo con `name` distinto** (p. ej. aleatorio por radio): quedan independientes y "Ascendente" nunca
  gana. Un solo `name` por grupo, o un segmentado con `aria-pressed` y una variable (lo que usa el módulo).
- **`Object.assign(el, { dataset })` no hace nada**: `dataset` es de solo lectura; copiar campo a campo (el buscador depende de `data-buscar`).
- **CSS de la página por etiqueta**: `section { padding-block: 120px }` o `header { position: fixed }` del sitio rompen el
  árbol (los nodos de equipo y la página usan `<section>`/`<h3>`). Acotar esas reglas a la página (`main > section`, `.site-header`).
- **Fuentes decorativas en el PNG**: html-to-image no siempre incrusta Google Fonts y cae a una serif genérica; la firma usa la
  tipografía del sitio.
- **Inputs del sitio** con borde propio dan doble borde al buscador: el CSS del módulo usa doble clase (`.orgv .orgv__buscar input`).
- **`display` animado**: para animar al mostrar y ocultar con `hidden`, `transition: display … allow-discrete` + `@starting-style`.
- **Estáticos con huella** (ASP.NET Core `MapStaticAssets`): los cambios de CSS/JS no se ven hasta recompilar y reiniciar.

## Archivos

| Archivo | Uso |
|---|---|
| `assets/organigrama.js` | Módulo ES: `organigramaPersonas`, `organigramaEquipos`, `arbolEquipos`, `visorOrganigrama`, `arbolOrg`, `iniciales`, `normalizar` |
| `assets/organigrama.css` | Estilos con tokens `--org-*` (por defecto en `:where(:root)`, con modo oscuro), impresión y animaciones |
| `assets/sql/equipos_jefaturas_cargos.sql` | Modelo opcional Postgres/Supabase: jefatura y cargo en la membresía, equipos anidados sin ciclos, vista de integrantes heredados |
| `references/api.md` | Formas de datos, opciones de cada función y tokens |
| `examples/demo/index.html` | Demo con 34 personas y 13 equipos: personas, equipos y el organigrama interno de un equipo |
