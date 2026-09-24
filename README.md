# CDI — Refonte HP

Base estática de la home del **Centre pour le développement intellectuel**,
implementada a partir del Figma [CDI Refonte HP](https://www.figma.com/design/AmROMNmh0wuaWCuWTJqiNy/CDI-Refonte-HP?node-id=549-145)
(frame `home 1`, nodo `549:145`).

Sin build step, sin dependencias: se abre con cualquier servidor estático.

```bash
python3 .claude/serve.py
```

Luego http://127.0.0.1:4173 — o cualquier otro servidor estático sobre la raíz
del proyecto. (Ojo: macOS bloquea el acceso de procesos no autorizados a
`~/Downloads`; si el servidor falla con *Operation not permitted*, mové el
proyecto fuera de esa carpeta o dale acceso a la terminal en Ajustes →
Privacidad y seguridad → Archivos y carpetas.)

## Estructura

```
index.html            Una sola página, marcada por secciones semánticas
css/
  tokens.css          Custom properties: color, tipografía, layout, movimiento
  base.css            Reset, contenedor, capa decorativa, gancho de revelado
  components.css      Botones, iconos, pills, tarjetas, play
  sections.css        Header, hero, elevator, profils, services, video, news, footer
js/
  main.js             Carrusel, botones de play, barra de accesibilidad, reveal
assets/
  img/                Fotos (redimensionadas a tamaño web)
  svg/                Formas decorativas de marca + logos
  icons/              Iconos de UI, iconos de servicio, redes sociales
```

## Decisiones de implementación

**Escala.** El diseño es un artboard de 1512px con 120px de margen. `.container`
reproduce esa caja de 1272px y la centra, encogiéndose por debajo de 1352px con
un margen mínimo de 40px. Las alturas de sección son `min-height` con los
valores del Figma: a 1512px el documento mide los mismos 6159px, y más angosto
las bandas crecen con el contenido en vez de cortarlo.

**Fondo del hero.** El encuadre del Figma (foto sobre una caja de 1512x983 con
el header tapando los primeros 185px) está expresado en porcentajes —
`background-size: 115.6% auto` anclado al pie — para que dé exactamente lo mismo
a 1512px y además acompañe a pantallas más anchas sin dejar banda gris.

**Formas decorativas.** Cada banda tiene su `.deco`, una capa absoluta e inerte
al puntero. Cada forma declara a qué se ancla — borde izquierdo de la ventana
(por defecto), `.is-right`, `.at-content` (al borde de la caja de contenido),
`.is-center`, `.is-bottom` — en vez de a coordenadas absolutas del artboard. Así
las que van a sangre siguen tocando el borde en una pantalla de 1728px, y las
que acompañan al contenido se mueven con él. La sección las recorta con
`overflow: hidden`, igual que en el Figma.

**Formas agrupadas.** Las que en el Figma van pegadas entre sí —los círculos
turquesa + rayas rosas + onda verde del elevator, los triángulos verdes + rayas
rosas del pie de actualités, etc.— viven dentro de un `.deco-cluster`. El grupo
se ancla una sola vez y sus hijos se posicionan en coordenadas locales, así que
**nunca se separan** al cambiar el ancho. Si se agrega una forma que toca a
otra, va dentro del mismo cluster.

**Vídeo.** El hero reproduce `assets/video/hero.mp4` (autoplay, muted, loop),
con su primer fotograma de poster. El encuadre es `object-fit: cover` sobre la
caja del hero: recorta un 6% vertical y nada horizontal. El bloque de vídeo
todavía no tiene clip. Ver `assets/video/LEEME.txt`.

**Popup de evento.** `<dialog>` nativo: el navegador da la trampa de foco, el
cierre con Escape y el fondo oscuro. Se abre 600ms después de cargar. En
`js/main.js`, `REMEMBER_DISMISSAL` está en `false` para que aparezca en cada
visita mientras se revisa el sitio; en producción hay que ponerlo en `true`
(entonces se muestra una vez por evento, recordado en `localStorage`).
`?popup=off` en la URL lo saltea — sirve para QA y capturas.

**Iconos.** Los monocromos se pintan con `mask-image` sobre `currentColor`, así
heredan el color del contexto (teal en los links, blanco sobre el hero, gris en
el footer) y se animan con `transform` sin tocar el SVG. Los multicolor —
iconos de servicio, redes, logos — van como `<img>`.

**Color de acento.** Cada tarjeta define `--accent` inline; el borde izquierdo,
el título y el link lo heredan. Cambiar el color de una tarjeta es una sola
línea.

## Ganchos para las animaciones

La base ya deja el andamiaje puesto:

- `--ease-out`, `--ease-in-out`, `--dur-fast/base/slow` en `tokens.css`: una
  sola fuente de verdad para tiempos y curvas.
- `data-reveal` en cualquier elemento + el `IntersectionObserver` de `main.js`
  le agrega `is-visible` al entrar en viewport. Variantes: `up` (por defecto),
  `left`, `right`, `scale`, `zoom` (la foto entra con un acercamiento corto).
- `data-reveal-group` en un contenedor escalona a los hijos solo (90ms cada uno,
  tope a los 6): agregar una tarjeta no obliga a renumerar nada.
- El estado inicial sólo se aplica con JS activo (`html.js`), así que sin JS no
  se oculta nada. Y si el observador no llegara a funcionar, a los 3s se revela
  todo igual: nunca queda la página en blanco.
- Las formas decorativas tienen un parallax corto (`initDecoParallax`, 26px de
  recorrido) atado al scroll con `requestAnimationFrame`.
- Todo se apaga con `prefers-reduced-motion`.
- El carrusel mueve el track con `translate3d` y lee el paso del CSS real, así
  que un timeline de GSAP puede tomarlo sin recalcular medidas.
- `prefers-reduced-motion` ya está respetado globalmente en `base.css`.

## Breakpoints

A 1512px o más el render es idéntico al Figma. Por debajo:

| Ancho    | Qué cambia                                                        |
|----------|-------------------------------------------------------------------|
| < 1352px | El contenedor se encoge (margen mínimo 40px)                      |
| ≤ 1400px | Las flechas del carrusel entran al flujo, junto a los puntos      |
| ≤ 1240px | La foto del hero pasa a `cover`                                   |
| ≤ 1080px | Menú desplegable; servicios a 2 columnas; perfiles a 1; carrusel de a 2 |
| ≤ 900px  | Bloque vídeo apilado; footer a 2 columnas; decoración atenuada    |
| ≤ 680px  | Todo a una columna; tipografía reducida; se sueltan las alturas   |

**El Figma sólo define desktop.** De 1080px para abajo — el menú desplegable, el
apilado de tarjetas, la fila de controles del carrusel, la atenuación de la capa
decorativa — son decisiones propias para que la página no se rompa, no diseño
validado. Hay que revisarlas cuando llegue el diseño de tablet/mobile.

## Cambios del cliente aplicados

**Toolbar.** Se sacaron el conmutador de contraste y los botones A+/A−. La
búsqueda bajó a la barra principal, a la derecha. La barra de accesibilidad
queda, de izquierda a derecha: idiomas · Facile à lire · Intranet.

**Versiones para comparar.** Hay un conmutador abajo a la izquierda con dos
ejes independientes:

| Eje        | Opciones                          | Qué cambia |
|------------|-----------------------------------|------------|
| `intranet` | **`blue`** · `pink`               | Color del botón Intranet |
| `profiles` | **`gradient`** · `cards` · `banners` | Sección "profils": la propuesta con degradado (300px), la tarjeta del Figma V8 (200px) o el bandeau duotono de la r7 (240px) |

En negrita, lo elegido: son los valores por defecto. El conmutador queda para
poder volver a mostrar las alternativas; si ya no hace falta, se borra el bloque
`.version-switch` del HTML y listo.

### Contraste de los bandeaux — decisión de diseño pendiente

Medido sobre el render, texto blanco:

| Variante | Naranja | Turquesa | AA texto grande |
|----------|---------|----------|-----------------|
| B · Bandeaux | 2,76:1 | 2,36:1 | 3:1 |
| C · Dégradé  | 1,89:1 | 2,16:1 | 3:1 |

Ninguna pasa. El blanco sobre el naranja de marca da 2,1:1 por sí solo, así que
el problema es del par color/texto, no del velo. Las palancas, por si hay
auditoría: subir la opacidad de `.profile-banner::before` (con 0,55 arriba, B
llegaba a 3,1–3,7:1), pasar el texto a oscuro (8,3:1 y 6,8:1, con los colores a
plena saturación) u oscurecer el panel al 65% del color.

La variante del degradado usa recortes propios (`-focus`) al 74% del original,
elegidos marcando sobre la foto la zona que ocupa el texto para que ninguna cara
quede detrás. Los originales son 4:3 con la gente al centro; si en algún momento
hay fotos pensadas para apaisado, el encuadre mejora solo.

Cada eje se guarda por separado y se escribe en la URL
(`?profiles=banners&intranet=blue`), así se puede pasar un link a una
combinación concreta. Agregar un eje nuevo es un grupo `data-axis` en el
conmutador más una regla CSS: el JS no se toca. `?switch=off` lo oculta para sacar capturas limpias.

El valor inicial lo fija un script en línea en el `<head>`, antes del primer
pintado, así que no parpadea. Los tokens `--intranet-bg` / `--intranet-disc`
viven en `:root` y los cambia el atributo `data-intranet` en `<html>`; los
componentes sólo los consumen. Agregar una tercera versión es una regla
`[data-intranet="x"]` en `tokens.css` más un botón en el conmutador.

> Cuidado al tocar esto: **no pongas `transition` sobre una propiedad cuyo valor
> venga de una custom property que cambia**. Chrome arranca una transición que
> nunca avanza y el color queda clavado en el inicial — la variable se actualiza
> pero `background-color` no. Costó un rato encontrarlo.

**Textos.** «Pour les familles» → «Pour les parents» en la navegación y el
footer. Las dos tarjetas de perfil pasaron de «Les parents» / «Les
professionnels» a «Pour les parents» / «Pour les professionnels». Las pills de
categoría de las tarjetas de servicio siguen diciendo «Parents» /
«Professionnels» (ver dudas abajo).

**Bloque 2.** Marcado con un `TODO(cliente)` en `index.html`: el texto actual es
el del Figma, a la espera del que escriban Maxime y Mark.

### Dudas abiertas sobre el brief

- *«Retirer les deux outils dont nous n'avons pas besoin»* no dice cuáles. Se
  interpretaron el contraste y el tamaño de texto, porque la constelación nueva
  que el cliente enumera contiene exactamente los demás elementos. Confirmar.
- *«La partie recherche intégrée dans la barre principale»*: se movió el botón
  tal cual estaba. Si querían un campo de búsqueda abierto, es otra decisión de
  diseño y hace falta el Figma.
- *«les deux boutons»* se entendió como las dos tarjetas de perfil. Si incluía
  también las pills de categoría, se cambian en un minuto.

## Alto contraste

El botón de la barra de accesibilidad activa `html.is-high-contrast`, que
redefine los tokens de color por versiones oscurecidas hasta cruzar 4,5:1 sobre
blanco, sube el velo del hero a 0,72, subraya los enlaces, atenúa las fotos de
los bandeaux y le pone contorno a las tarjetas. Medido en el navegador:

| Elemento | Normal | Alto contraste |
|----------|--------|----------------|
| Link "En savoir plus" | 2,63:1 | 4,58:1 |
| Texto de tarjeta | 6,54:1 | 13,27:1 |
| Link de footer | 15,65:1 | 19,93:1 |

La preferencia se guarda en `localStorage`. `?contrast=on` lo fuerza, para QA.

## Versión editable en Figma

Página **«Accueil V8 — éditable»** del mismo archivo, creada nueva para no tocar
las existentes. Adentro, el marco `home — éditable` (1512 × 6159):

- `Référence · site` — captura del sitio **sin** las formas, bloqueada al fondo.
  Sirve para ver dónde cae todo mientras se mueven las formas.
- Ocho marcos, uno por banda (`01 · Header` … `08 · Footer`), transparentes y
  con `clipsContent`, que recortan las formas en el borde de su sección igual
  que el sitio.
- Las 25 formas decorativas como **vectores editables**, en las coordenadas
  exactas del sitio.

**Sin auto-layout en ningún contenedor**, para poder arrastrar las formas.

La referencia se genera con `?export=1`: oculta la capa decorativa y fija el
hero al alto del artboard (si no, el hero mide lo que el viewport y la captura
sale mal). `?export=2` hace lo mismo pero deja las formas, para comparar el
sitio contra la maqueta.

**Ida y vuelta.** Las posiciones del Figma se traen al código leyendo los nodos
con `use_figma` y mapeando cada forma a su sección y a su tipo de anclaje. En el
sitio las formas siempre van detrás del contenido (`.deco` tiene `z-index: 0` y
`pointer-events: none`; el contenido va en `z-index: 1`), así que el orden de
capas de la maqueta no hace falta reproducirlo.

## Pendientes conocidos

- **Diseño de tablet y mobile**: falta el Figma. Lo que hay abajo de 1080px
  funciona y no se rompe, pero no está validado.
- **Barra de accesibilidad**: los botones de contraste y tamaño de texto guardan
  la preferencia en `localStorage` y aplican `html.is-high-contrast` /
  `font-size`, pero falta definir la paleta de alto contraste y pasar las
  medidas a `rem` para que el escalado tenga efecto real.
- **Contraste del hero**: con el metraje real y la capa negra al 20% del Figma,
  el texto blanco cae a **1,41:1** de contraste sobre los planos claros del
  vídeo (AA pide 4,5:1 para texto normal; el H1, al ser grande, pide 3:1).
  Medido sobre 16 fotogramas: falla en 10. La palanca es `--hero-scrim` en
  `tokens.css`; a 0,8 con degradado a la izquierda el peor caso sube a 5,6:1.
  Decisión pendiente de diseño.
- **Clip del bloque de vídeo**: falta `assets/video/video-block.mp4`. Mientras
  tanto muestra su poster y el botón de play queda deshabilitado.
- **Contenido**: el bloque "Video Block" y una de las noticias son placeholder,
  tal como en el Figma.
- Dos pictogramas de la barra de accesibilidad (contraste y "Facile à lire")
  venían rasterizados dentro del Figma, no como vectores: están recortados del
  PNG original en `assets/icons/`. Conviene pedirlos en SVG al equipo de diseño.

## Formas que en el diseño se tocan

Si dos formas están pegadas en Figma, tienen que ir juntas en un
`.deco-cluster`: se ancla el grupo una sola vez y los hijos van en coordenadas
locales. Anclarlas por separado parece igual a 1512px, pero si una lleva
`at-content` (sigue al contenedor) y la otra `is-right` (sigue al borde de la
ventana), **se despegan apenas la ventana es más ancha** — en una MacBook 16"
el hueco ya se ve. Los pares agrupados son `grey-ring`+`grey-x2`,
`grey-checkers`+`x-pink` y `burst-teal`+`grey-checkers2`, además de los
clústeres del Elevator, Profils y Actualités.

### Desfases de 1-2px entre formas de un mismo grupo

Varias parejas venían del Figma con 1 o 2px de diferencia por redondeo. Cuando
son dos formas **del mismo alto puestas una al lado de la otra**, eso es
redondeo y no diseño: se alinean por arriba (`grey-ring`+`grey-x2`,
`grey-checkers`+`x-pink`, `burst-teal`+`grey-checkers2`).

Ojo con no "corregir" las que no lo son: `stripes-pink`+`wave-green` y
`triangles-green`+`stripes-pink-2` tienen alturas distintas y **están alineadas
abajo** a propósito; `grey-circle`+`grey-x3` lo están arriba. Antes de tocar,
conviene mirar si el desfase de arriba y el de abajo son iguales (redondeo) o si
uno de los dos da cero (alineación intencional).

## Dónde se mide la posición de las formas

Las formas se posicionan contra la **costura de color** entre bandas (donde el
fondo pasa de blanco a gris), no contra la caja del `<section>`: no coinciden,
porque algunas bandas arrancan con un tramo del color de la anterior. En Figma
pasa lo mismo — el frame de cada banda empieza antes que su cambio de color —
así que comparar `y` de frame contra `top` de sección da diferencias de 25-30px
y las formas quedan flotando lejos de la costura.

Para medirlo: se detectan las costuras en las dos capturas (la fila donde cambia
el color de fondo dominante) y se compara la distancia de cada forma a la
costura más cercana. Las bandas del prototipo no miden igual que las de Figma
(Vidéo +25px, Actualités +28px), así que anclar por la costura de arriba o por
la de abajo **no** da lo mismo: hay que usar la que la forma toca en el diseño
(`--y` si va pegada arriba, `--b` con `is-bottom` si va pegada abajo).

## Detalles de interacción y ritmo

- **Barra de herramientas.** El grupo de accesibilidad (contraste y A+/A−) y
  el selector de idioma llevan 18px extra cada uno: con el `gap` parejo de la
  barra, los tres grupos se leían como uno solo.
- **Flechas del carrusel.** Se centran contra el carrusel mediante
  `bottom: calc(100% + var(--space-10) + var(--news-card-h) / 2 - 22px)`, es
  decir subiendo desde el borde de la fila de controles. Venían con `top: 627px`
  y `603px` —coordenadas calcadas del artboard, distintas entre sí— y se
  descolgaban cada vez que cambiaba el alto de las tarjetas. El alto vive en el
  token `--news-card-h`, que usa también `.news-card`, así que ahora se acompañan
  solas. La separación lateral es
  `min(70px, (100vw - var(--container)) / 2 - 16px)` — 26px de aire hasta la
  tarjeta, iguales de los dos lados; antes eran 51px a la izquierda y 81px a la
  derecha, valores calcados, que dejaban apenas 7px. El `min()` las frena
  cuando el margen lateral se achica, así no se salen de la ventana entre
  1400px y 1512px, que es el rango donde siguen estando fuera del flujo.
- **Chevrons del nav.** 9×5px (antes 10×6).
- **Bandeaux con degradado.** Al pasar el puntero la foto crece 7% en 620ms,
  con `transform-origin: right center` — está anclada a la derecha, así que
  creciendo desde ahí el encuadre no se corre y el degradado sigue entrando
  sobre la misma zona. El bandeau ya recortaba con `overflow: hidden`.
- **Bajada de las tarjetas de actualidad.** Cortada a dos líneas con
  `line-clamp`, que agrega puntos suspensivos. Con tres líneas se pegaba al
  «Lire la suite». Cuando llegue el texto definitivo conviene escribirlo para
  que entre en dos líneas y no dependa del corte.

## Espesor de las flechas

Todas las flechas del sitio —los 25 CTA, «En savoir plus», «Lire la suite» y
las del carrusel— salen del mismo archivo, `assets/icons/arrow-up.svg`, que
venía sin `stroke-width` y por lo tanto usaba el valor por defecto de 1. A 16px
se veían lavadas. Ahora está en **1.5**, y el chevron del nav en **1.3** (su
viewBox es más chico, así que proporcionalmente ya era más grueso).

Se cambia en el SVG y no por CSS: los iconos se usan como máscara, así que el
`stroke` del archivo es lo único que define el espesor.

Queda una inconsistencia anterior sin resolver: `calendar.svg` tiene
`stroke-width="2"` mientras que `mail`, `phone`, `location-marker` y
`speakerphone` no lo declaran y quedan en 1.

## Iconos de las tarjetas de servicio

Los nueve iconos van como **máscara CSS** y no como `<img>`: son de un solo
color plano, así que enmascararlos permite animarles el color. En reposo se ven
igual que antes — ocho de los nueve ya coincidían exactamente con el acento de
su tarjeta, y el noveno difería en un matiz de turquesa imperceptible.

Al pasar el puntero el icono crece a 1.14 y el color se oscurece. El tono de
llegada se calcula con `color-mix(in srgb, var(--accent) 80%, #000)`: ese 80% es
el único número a tocar si se quiere más o menos marcado. Se mezcla con **negro
y no con un azul de tinta** — mezclados con azul, los acentos cálidos se van a
marrón.

La flecha del «En savoir plus» también se corre 5px. Ese movimiento ya existía
en `.link-arrow:hover`, pero sólo se disparaba al pasar por encima de la flecha
misma; como la tarjeta entera es el enlace, ahora acompaña al hover de la
tarjeta.

Una trampa: las rutas de los iconos están en `components.css` y no en el
marcado. Una `url()` dentro de una custom property se resuelve contra la hoja
que la usa, no contra el documento, así que puestas en el HTML terminaban
apuntando a `/css/assets/…` y las máscaras quedaban vacías (el icono se veía
como un cuadrado de color).

## El video del hero al scrollear

`initHeroParallax()` le hace un acercamiento —hasta 30%— con una deriva hacia
abajo, de modo que el video queda por detrás del movimiento de la página. El
recorrido se mide contra el alto del hero, así que lo que se ve es sólo el
primer tramo: con un 10% el efecto era imperceptible.

Dos decisiones que importan:

- **En reposo vale 1 y 0.** El encuadre de arranque, que se ajustó a mano y
  costó varias vueltas, queda exactamente igual: la animación sólo existe una
  vez que empezás a scrollear.
- **La deriva se calcula contra el sobrante que deja el zoom**, nunca por
  encima. Por eso no hace falta agrandar la caja del video —que cambiaría el
  encuadre— y aun así no se llega a ver el borde. `HERO_ZOOM` y `HERO_DRIFT` en
  `main.js` son los dos números a tocar.

No corre en modo exportación ni con movimiento reducido.

## Los estados de hover

Las cinco superficies que se levantan al pasar el puntero —botones, tarjetas de
servicio, de perfil, de actualidad y bandeaux— usan `--dur-hover` (460ms) y
`--ease-hover`, no `--ease-out`. `--ease-out` es una curva que arranca muy
rápido, y con ella el levantarse y la aparición de la sombra se sentían secos.

Las fotos que hacen zoom al pasar el puntero necesitan que **su propio marco**
recorte, no sólo la tarjeta: `.news-card__media` no tenía `overflow: hidden` y
la foto crecía por encima de la fecha y el título en lugar de quedar contenida.

## El revelado se anima con `translate`, no con `transform`

`.js [data-reveal].is-visible { transform: none }` son tres clases de
especificidad; `.service-card:hover { transform: translateY(-6px) }`, dos. El
estado final del revelado le ganaba al hover, así que **el levantarse de las
tarjetas al pasar el puntero no se aplicaba** en nada que se hubiera revelado al
scrollear — tarjetas de servicio, de actualidad y bandeaux.

El sistema usa ahora `translate` y `scale`, que son propiedades propias e
independientes de `transform`. Regla general: en este proyecto `transform` queda
reservado para los estados de interacción, y las entradas se animan con
`translate`/`scale`. Lo mismo vale para las formas decorativas, donde `transform`
lo ocupa el parallax.

### Entrada de los bandeaux de perfiles

Llevan `data-reveal="banner"`: tres tiempos encadenados en vez de un fade
parejo — el bandeau entra desde abajo con una escala mínima, la foto se asienta
desde un zoom del 10% y el texto con la flecha llegan 240ms después. El zoom de
la foto sólo se declara mientras no entró; dejarlo puesto en `scale: 1` al
terminar le ganaría por especificidad al `scale` del hover y lo anularía.

## Entrada del texto: línea por línea, con máscara

El hero (título y párrafo) y el texto del elevator llevan `data-lines`. Cada
línea entra deslizándose desde abajo detrás de una máscara, 120ms después de la
anterior. `data-lines-delay` retrasa el bloque entero, que es lo que ordena la
cascada del hero (volanta → título → párrafo → botón).

El corte de línea lo decide el navegador y cambia con el ancho, así que no hay
marcado por línea: `initLineReveal()` envuelve cada palabra, las agrupa por
`offsetTop` y recién entonces rearma el bloque con una máscara por línea. Se
rehace en `resize`.

Cuatro cosas que costaron y conviene no deshacer:

- **Se mide después de que cargó la tipografía.** Open Sans carga asincrónica y,
  medido con la de respaldo, el agrupado sale mal: una máscara termina
  conteniendo dos líneas. Con máscara el texto está oculto hasta que entra, así
  que esperar no deja nada a la vista; hay un tope de 1,5s por las dudas.
- **Ninguna palabra se puede partir** (`.word { white-space: nowrap }`). El
  navegador cortaba «psycho-pédagogie» por el guion; además, una palabra a
  caballo entre dos líneas tiene un solo `offsetTop` y rompía el agrupado.
- **Se anota qué palabra venía con espacio delante.** Si no, al rearmar se
  inventa un espacio donde no lo había y el punto final queda separado del
  `</strong>` que lo precede.
- **La máscara lleva `padding-bottom` con margen negativo que lo compensa.** El
  alto de línea del título es 1.08 y `overflow: hidden` recortaba la 'p' de
  «développement».

Al rearmar, un `<strong>` que cruza un corte se parte en dos. Es equivalente:
acá sólo aporta el peso tipográfico.

## Entrada de las formas al hacer scroll

Cada forma entra cuando su grupo cruza el cuarto inferior de la pantalla: se
desplaza 64px desde el borde al que está anclada —las de la derecha desde la
derecha, las de abajo desde abajo— mientras se desvanece desde opacidad 0, en
800ms con ease-out. Las que van juntas en un `.deco-cluster` entran una después
de otra, cada 150ms.

Los números: la distancia en las clases `.from-*` de `base.css`, el escalonado
en `DECO_IN_STEP` de `main.js`, la duración en el token `--dur-deco` y el punto
de disparo en el `rootMargin` del observador.

Dos decisiones que conviene no deshacer:

- **Se oculta la pieza, no el grupo.** El `.deco-cluster` queda visible y lo que
  se anima son sus hijos, que es lo que permite escalonarlos entre sí. El
  parallax, en cambio, sigue moviendo el grupo entero: por eso uno usa
  `translate` y el otro `transform`, que son propiedades distintas y se componen
  sin pisarse.
- **El observador mira el grupo, no la pieza.** Así las formas que van juntas
  arrancan todas en el mismo punto del scroll y la diferencia entre ellas la da
  el delay, no la posición.

Y dos trampas ya pagadas:

- **La dirección va en clases, no en una custom property.** Chrome no vuelve a
  evaluar una propiedad que está en transición cuando cambia la variable de la
  que depende, así que el desplazamiento quedaba siempre en cero. Es el mismo
  problema que había aparecido con el color del conmutador de versiones.
- **La clase `js` se agrega en el script del `<head>`, no en `main.js`.** El
  módulo está diferido y se aplicaba después del primer pintado, así que todo lo
  que el CSS oculta para animarlo alcanzaba a verse y se desvanecía a la vista.

### Cómo verificar una animación (y cómo no)

Ninguna de las dos superficies automáticas sirve:

- Con `--virtual-time-budget`, Chrome headless dispara el IntersectionObserver
  de forma errática: leer estilos computados desde una página sonda da
  resultados que se contradicen entre corridas.
- El panel del navegador integrado está *throttled*: las transiciones quedan
  congeladas, y se lee el estado final aplicado en las clases junto con el valor
  inicial en el estilo computado. Confunde bastante.

Lo que sí sirve: capturas headless con distintos presupuestos de tiempo (se ve
la forma aparecer entre una y otra), revisar en el panel que las clases y los
delays sean los correctos —eso no depende del render—, y comparar el render de
`?export=2` contra el anterior, que debe dar cero diferencias porque en ese modo
la animación no corre.

## Parallax de las formas: el recorrido se mide por forma

Las bandas recortan con `overflow: hidden` y muchas formas del diseño van
pegadas a la costura entre bandas. Si se desplaza la capa `.deco` entera, esas
formas se salen de la banda y quedan **rebanadas al scrollear**. Por eso
`initDecoParallax()` mide, forma por forma, cuánto le sobra hasta el borde de su
banda y limita ahí el recorrido: la que está al ras no se mueve, la que tiene
aire flota los 26px completos. Si se agregan formas nuevas no hay que tocar
nada, se mide sola (y se vuelve a medir en `resize`).

En modo `?export=…` el parallax no corre, si no la referencia que se compara
contra Figma sale corrida.

## Cosas a tener en cuenta si se re-exportan assets del Figma

- Los SVG exportados traen un rect opaco de fondo y otro del tamaño del
  artboard; hay que sacarlos, pero **sin tocar los que están dentro de un
  `<clipPath>`** o la forma desaparece entera. El color de ese rect de fondo es
  el del canvas de la página, así que **cambia si alguien cambia el fondo del
  Figma** (era `#1E1E1E`, ahora `#F5F5F5`): conviene detectarlo por posición —
  es siempre el primer `<rect>`, antes del primer `<g>`, con las medidas exactas
  del root — y no por color.
- El export recorta a la **tinta visible** (`absoluteRenderBounds`), no a la caja
  del frame (`absoluteBoundingBox`). Cuando la forma no llega a los bordes de su
  frame, el SVG sale más chico: hay que leer las dos cajas y recalcular `--w`,
  `--h` y el anclaje (`--rx` / `--b`) contra las de render, o la forma aparece
  encogida y corrida. Pasó con `chevrons-teal` (246×246 → 246×122) y
  `grey-bigcircle` (502×505 → 317×364).
- Al traer de vuelta formas que el cliente reacomodó en Figma **no alcanza con
  importar las posiciones**: si además editó la forma (relleno, trazo,
  geometría), hay que re-exportar el SVG. Reutilizar el archivo local viejo
  porque el nombre coincide pierde esas ediciones en silencio.
- Algunos nodos arrastran el `filter` de drop-shadow del grupo padre — al logo
  le venía la sombra de la barra de navegación. Conviene revisar `<filter>`.
- Los iconos de instancia traen un `<rect x="0.5" y="0.5" width="23" ...>` con
  el contorno de la caja: se ve como un cuadrado alrededor del icono.
- Ojo con los glifos chicos dentro de viewBox grandes (chevron, lupa): hay que
  usarlos a tamaño natural, no estirarlos con `contain`.
