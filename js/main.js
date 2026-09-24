/* ==========================================================================
   CDI — Comportamiento de la home
   Módulos chicos e independientes. Cada uno se inicializa solo si su marcado
   existe, así se pueden mover de página sin tocar nada más.
   ========================================================================== */

// La clase `js` la pone el script del <head>, antes del primer pintado. Acá se
// reafirma por si ese script no corrió (el CSS la usa para no ocultar nada).
document.documentElement.classList.add('js');

// `?export=1` prepara la página para exportarla como referencia de diseño:
// oculta la capa decorativa (en Figma esas formas van como vectores editables)
// y fija el hero al alto del artboard en vez del alto del viewport.
// `1` = referencia para Figma (sin formas); `2` = igual pero con las formas,
// para comparar el sitio contra la maqueta.
const modoExport = new URLSearchParams(location.search).get('export');
if (modoExport === '1' || modoExport === '2') {
  document.documentElement.classList.add('is-export');
  if (modoExport === '1') document.documentElement.classList.add('is-export-nodeco');
}

/* --------------------------------------------------------------------------
   Carrusel de actualidades
   El track es un grid de columnas fijas; se desplaza con transform, que es la
   propiedad barata de animar y la que después va a tomar el timeline de GSAP.
   -------------------------------------------------------------------------- */

function initNewsCarousel(root) {
  const track = root.querySelector('[data-carousel="track"]');
  const viewport = root.querySelector('[data-carousel="viewport"]');
  const dotsHost = root.querySelector('[data-carousel="dots"]');
  const prev = root.querySelector('[data-carousel="prev"]');
  const next = root.querySelector('[data-carousel="next"]');
  if (!track || !viewport) return;

  const cards = [...track.children];
  let pages = 1;
  let index = 0;

  // Cuántas tarjetas entran lo decide el CSS (`--per-view` cambia por
  // breakpoint); acá sólo se lee, para no duplicar los cortes en dos lugares.
  const perView = () => {
    const value = parseInt(getComputedStyle(track).getPropertyValue('--per-view'), 10);
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  // El paso es el ancho real de una tarjeta más el gap, medido del layout.
  const step = () => {
    const card = cards[0];
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  };

  function renderDots() {
    if (!dotsHost) return;
    dotsHost.replaceChildren();
    for (let i = 0; i < pages; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'news__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Page ${i + 1} sur ${pages}`);
      dot.setAttribute('aria-current', String(i === index));
      dot.addEventListener('click', () => go(i));
      dotsHost.append(dot);
    }
  }

  function go(nextIndex) {
    index = Math.max(0, Math.min(nextIndex, pages - 1));
    track.style.transform = `translate3d(${-index * step()}px, 0, 0)`;
    dotsHost?.querySelectorAll('.news__dot').forEach((dot, i) => {
      dot.setAttribute('aria-current', String(i === index));
    });
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === pages - 1;
  }

  // Al cambiar el ancho cambian las tarjetas visibles, y con ellas el número
  // de páginas: se recalcula todo y se reencuadra sobre la tarjeta actual.
  function layout() {
    const visible = Math.min(perView(), cards.length);
    const nextPages = Math.max(1, cards.length - visible + 1);
    if (nextPages !== pages) {
      pages = nextPages;
      index = Math.min(index, pages - 1);
      renderDots();
    }
    go(index);
  }

  prev?.addEventListener('click', () => go(index - 1));
  next?.addEventListener('click', () => go(index + 1));

  // Navegación por teclado dentro del carrusel.
  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') go(index + 1);
    if (event.key === 'ArrowLeft') go(index - 1);
  });

  let frame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layout);
  });

  pages = Math.max(1, cards.length - Math.min(perView(), cards.length) + 1);
  renderDots();
  go(0);
}

/* --------------------------------------------------------------------------
   Menú principal en pantallas angostas
   El panel lo abre una clase en `.nav`; el CSS decide a partir de qué ancho
   existe. En desktop el botón está oculto y la nav se muestra siempre.
   -------------------------------------------------------------------------- */

function initNav() {
  const nav = document.querySelector('.nav');
  const toggle = nav?.querySelector('[data-action="nav-toggle"]');
  if (!nav || !toggle) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Si el viewport vuelve a desktop, el panel no debe quedar "abierto".
  const desktop = window.matchMedia('(min-width: 1081px)');
  desktop.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/* --------------------------------------------------------------------------
   Vídeo y botones de play
   El vídeo del hero pesa ~6 MB: sólo se descarga si vale la pena. En pantallas
   angostas, o si se pidió menos movimiento, se queda el poster y el vídeo se
   carga recién al tocar play.
   -------------------------------------------------------------------------- */

const MIN_AUTOPLAY_WIDTH = 900;

// El <source> lleva `data-src` para que el navegador no descargue nada hasta
// que lo decidamos acá.
function attachSource(video) {
  const source = video.querySelector('source[data-src]');
  if (!source) return;
  source.src = source.dataset.src;
  source.removeAttribute('data-src');
  video.load();
}

function initVideo() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = window.innerWidth >= MIN_AUTOPLAY_WIDTH;

  document.querySelectorAll('video[data-autoplay]').forEach((video) => {
    if (reduced || !wide) return;
    attachSource(video);
    video.play().catch(() => {
      /* autoplay bloqueado: queda el poster y el botón de play */
    });
  });

  document.querySelectorAll('.play-btn[data-player]').forEach((button) => {
    const video = document.querySelector(button.dataset.player);
    if (!video) return;

    const sync = () => {
      const playing = !video.paused && !video.ended;
      button.setAttribute('aria-pressed', String(playing));
      button.classList.toggle('is-playing', playing);
    };

    // Sin ninguna fuente que reproducir el botón se deja a la vista —está en el
    // diseño— pero deshabilitado, para que no sea un control muerto.
    const hasSource = () => !!video.querySelector('source');
    button.disabled = !hasSource();
    video.addEventListener('error', () => { button.disabled = true; }, true);

    button.addEventListener('click', async () => {
      attachSource(video);
      if (video.paused) {
        try {
          await video.play();
        } catch {
          /* el archivo no existe, o el navegador lo bloqueó */
        }
      } else {
        video.pause();
      }
      sync();
    });

    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
  });
}

/* --------------------------------------------------------------------------
   Popup de evento
   Se abre al cargar la página. `REMEMBER_DISMISSAL` en false hace que aparezca
   en cada visita — que es lo que se quiere mientras se revisa el sitio. Para
   producción, ponerlo en true: entonces se muestra una sola vez por evento.
   -------------------------------------------------------------------------- */

// Desactivado mientras se revisan los cambios: estorba para iterar rápido.
// Ponelo en true (o `?popup=on`) para volver a verlo.
const POPUP_ENABLED = false;

const REMEMBER_DISMISSAL = false;
const POPUP_KEY = 'cdi:event-popup';
const POPUP_DELAY = 600;

function initEventPopup() {
  const dialog = document.querySelector('.event-popup');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  // Identifica el evento concreto, para que un evento nuevo vuelva a mostrarse
  // aunque el anterior ya se haya descartado.
  const eventId = dialog.querySelector('time')?.dateTime || 'default';

  const seen = () => {
    if (!REMEMBER_DISMISSAL) return false;
    try {
      return localStorage.getItem(POPUP_KEY) === eventId;
    } catch {
      return false;
    }
  };

  const remember = () => {
    if (!REMEMBER_DISMISSAL) return;
    try {
      localStorage.setItem(POPUP_KEY, eventId);
    } catch {
      /* storage bloqueado: se vuelve a mostrar en la próxima visita */
    }
  };

  dialog.querySelector('[data-action="close-popup"]')?.addEventListener('click', () => {
    dialog.close();
  });

  // Clic fuera de la tarjeta: el <dialog> ocupa sólo la tarjeta, así que un
  // clic cuyo punto cae fuera de su caja es un clic en el backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) dialog.close();
  });

  dialog.addEventListener('close', remember);

  const forced = new URLSearchParams(location.search).get('popup');
  if (forced === 'off') return;
  if (!POPUP_ENABLED && forced !== 'on') return;
  if (seen()) return;
  window.setTimeout(() => {
    dialog.showModal();
    // El foco va al diálogo y no al botón de cerrar: se mantiene la trampa de
    // foco y el cierre con Escape, sin el anillo de foco encima de la cruz.
    dialog.focus();
  }, POPUP_DELAY);
}

/* --------------------------------------------------------------------------
   Barra de accesibilidad
   Contraste y tamaño de texto se guardan en localStorage para que la elección
   sobreviva a la navegación. El escalado cuelga de `font-size` en <html>, así
   que cualquier medida en rem acompaña el cambio.
   -------------------------------------------------------------------------- */

const A11Y_KEY = 'cdi:a11y';
const FONT_STEPS = [1, 1.12, 1.25];

function readPrefs() {
  try {
    return { contrast: false, fontStep: 0, ...JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') };
  } catch {
    return { contrast: false, fontStep: 0 };
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(prefs));
  } catch {
    /* modo privado o storage bloqueado: la preferencia vale sólo por esta visita */
  }
}

function initA11yToolbar() {
  const controls = document.querySelectorAll(
    '[data-action="contrast"], [data-action="font-up"], [data-action="font-down"]'
  );
  if (!controls.length) return;

  const prefs = readPrefs();

  // `?contrast=on` y `?fs=0|1|2` fuerzan el estado: sirven para QA y capturas.
  const qs = new URLSearchParams(location.search);
  if (qs.get('contrast') === 'on') prefs.contrast = true;
  const fs = Number(qs.get('fs'));
  if (Number.isInteger(fs) && fs >= 0 && fs < FONT_STEPS.length) prefs.fontStep = fs;

  const apply = () => {
    const root = document.documentElement;
    root.classList.toggle('is-high-contrast', prefs.contrast);
    root.style.setProperty('--fs-scale', String(FONT_STEPS[prefs.fontStep]));
    // Los botones informan si todavía queda recorrido.
    document.querySelector('[data-action="font-up"]')
      ?.toggleAttribute('disabled', prefs.fontStep >= FONT_STEPS.length - 1);
    document.querySelector('[data-action="font-down"]')
      ?.toggleAttribute('disabled', prefs.fontStep <= 0);
    writePrefs(prefs);
  };

  document.querySelector('[data-action="contrast"]')?.addEventListener('click', () => {
    prefs.contrast = !prefs.contrast;
    apply();
  });

  document.querySelector('[data-action="font-up"]')?.addEventListener('click', () => {
    prefs.fontStep = Math.min(prefs.fontStep + 1, FONT_STEPS.length - 1);
    apply();
  });

  document.querySelector('[data-action="font-down"]')?.addEventListener('click', () => {
    prefs.fontStep = Math.max(prefs.fontStep - 1, 0);
    apply();
  });

  apply();
}

/* --------------------------------------------------------------------------
   Conmutador de versiones
   Cambia la variante en vivo, la recuerda para la próxima visita y la deja
   escrita en la URL, así un link concreto abre siempre la misma versión.
   El valor inicial lo fija el script en línea del <head>, antes de pintar.
   -------------------------------------------------------------------------- */

function initVersionSwitch() {
  const root = document.querySelector('[data-version-switch]');
  if (!root) return;

  // `?switch=off` para capturas limpias.
  if (new URLSearchParams(location.search).get('switch') === 'off') {
    root.remove();
    return;
  }

  // Cada grupo del conmutador es un eje independiente: `data-axis` es el nombre
  // del atributo que se escribe en <html> y del parámetro en la URL. Agregar un
  // eje nuevo no necesita tocar este código.
  root.querySelectorAll('[data-axis]').forEach((group) => {
    const axis = group.dataset.axis;
    const options = [...group.querySelectorAll('[data-value]')];

    const apply = (value, fromClick) => {
      document.documentElement.dataset[axis] = value;
      options.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.value === value));
      });

      if (!fromClick) return;

      try {
        localStorage.setItem(`cdi:v2-${axis}`, value);
      } catch {
        /* storage bloqueado: la elección vale sólo por esta visita */
      }

      // Deja la versión en la URL sin ensuciar el historial, para poder pasarla.
      const url = new URL(location.href);
      url.searchParams.set(axis, value);
      history.replaceState(null, '', url);
    };

    options.forEach((button) => {
      button.addEventListener('click', () => apply(button.dataset.value, true));
    });

    const actual = document.documentElement.dataset[axis];
    apply(options.some((b) => b.dataset.value === actual) ? actual : options[0].dataset.value, false);
  });
}

/* --------------------------------------------------------------------------
   Revelado al scroll
   El CSS decide cómo se ve cada elemento; este módulo sólo informa cuándo
   entró en viewport. `data-reveal-group` escalona a los hijos solos.
   -------------------------------------------------------------------------- */

const STAGGER_MS = 90;
const STAGGER_MAX = 6;   // a partir de acá el retardo deja de crecer

function initReveal() {
  // El escalonado se calcula acá y no a mano en el marcado: agregar una
  // tarjeta no obliga a renumerar delays.
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', 'up');
      child.style.setProperty('--reveal-delay', `${Math.min(i, STAGGER_MAX) * STAGGER_MS}ms`);
    });
  });

  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    // Umbral 0: alcanza con que asome un borde. Con un umbral alto, un bloque
    // al final del documento puede no llegar nunca a cumplirlo y quedarse
    // invisible — le pasaba al footer.
    { rootMargin: '0px 0px -8% 0px', threshold: 0 }
  );

  targets.forEach((el) => observer.observe(el));

  // Red de seguridad: si a los 3s no se reveló nada, el observador no está
  // funcionando (pasa en algunos entornos embebidos). Antes que dejar la
  // página en blanco, se muestra todo.
  window.setTimeout(() => {
    const alguno = [...targets].some((el) => el.classList.contains('is-visible'));
    if (alguno) return;
    observer.disconnect();
    targets.forEach((el) => el.classList.add('is-visible'));
  }, 3000);
}

/* --------------------------------------------------------------------------
   Parallax de las formas decorativas
   Las formas se desplazan un poco menos que el scroll, así flotan respecto del
   contenido. El recorrido es corto a propósito: cada capa está recortada por
   su banda y un desplazamiento largo la dejaría fuera.
   -------------------------------------------------------------------------- */

const DECO_SHIFT = 26; // píxeles de recorrido, de punta a punta de la banda

const LINE_STEP = 120; // ms entre una línea y la siguiente

/**
 * Entrada del texto línea por línea.
 *
 * El corte de línea lo decide el navegador y cambia con el ancho, así que no
 * hay marcado por línea: se envuelve cada palabra y después se agrupan por su
 * posición vertical. Envolver palabra por palabra —y no partir el texto— es lo
 * que conserva el `<strong>` que hay en el medio de estos párrafos.
 */
function initLineReveal() {
  const bloques = [...document.querySelectorAll('[data-lines]')];
  if (!bloques.length) return;

  // El marcado original se guarda para poder rehacer el despiece: los cortes
  // de línea cambian con el ancho.
  const original = new WeakMap();
  bloques.forEach((b) => original.set(b, b.innerHTML));

  // 1. Cada palabra en su span, sin sacarla del marcado que la envuelve.
  const despiezar = (bloque) => {
    const nodos = [];
    const walker = document.createTreeWalker(bloque, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) nodos.push(n);

    nodos.forEach((nodo) => {
      if (!nodo.nodeValue.trim()) return;
      const frag = document.createDocumentFragment();
      nodo.nodeValue.split(/(\s+)/).forEach((trozo) => {
        if (!trozo) return;
        if (/^\s+$/.test(trozo)) {
          frag.appendChild(document.createTextNode(' '));
          return;
        }
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = trozo;
        frag.appendChild(span);
      });
      nodo.parentNode.replaceChild(frag, nodo);
    });

    // Se anota cuáles venían con espacio delante: al rearmar por líneas hay que
    // reponer el espacio original y no inventar uno (el punto final va pegado
    // al `</strong>` que lo precede).
    bloque.querySelectorAll('.word').forEach((w) => {
      let nodo = w;
      let espacio = false;
      while (nodo && nodo !== bloque) {
        const prev = nodo.previousSibling;
        if (prev) {
          espacio = prev.nodeType === Node.TEXT_NODE && /\s/.test(prev.nodeValue);
          break;
        }
        nodo = nodo.parentNode;
      }
      if (espacio) w.dataset.sp = '1';
    });
  };

  // 2. Agrupar por posición vertical. Vienen en orden de lectura, así que
  //    alcanza con detectar cuándo cambia el `offsetTop`.
  const agrupar = (bloque) => {
    const lineas = [];
    let arriba = null;
    bloque.querySelectorAll('.word').forEach((w) => {
      const top = w.offsetTop;
      if (arriba === null || Math.abs(top - arriba) > 4) {
        lineas.push([]);
        arriba = top;
      }
      lineas[lineas.length - 1].push(w);
    });
    return lineas;
  };

  // 3. Rearmar con una máscara por línea. Si un `<strong>` cruza un corte se
  //    parte en dos, que es equivalente: acá sólo aporta el peso tipográfico.
  const enmascarar = (bloque, lineas) => {
    const base = Number(bloque.dataset.linesDelay || 0);
    const frag = document.createDocumentFragment();

    lineas.forEach((palabras, i) => {
      const linea = document.createElement('span');
      linea.className = 'line';
      const interior = document.createElement('span');
      interior.className = 'line__in';
      interior.style.transitionDelay = `${base + i * LINE_STEP}ms`;
      linea.appendChild(interior);

      const clones = new Map();
      palabras.forEach((w, j) => {
        // Cadena de ancestros entre la palabra y el bloque, para recrearla.
        const cadena = [];
        for (let p = w.parentElement; p && p !== bloque; p = p.parentElement) cadena.unshift(p);

        let destino = interior;
        cadena.forEach((orig) => {
          let clon = clones.get(orig);
          if (!clon || clon.parentElement !== destino) {
            clon = orig.cloneNode(false);
            destino.appendChild(clon);
            clones.set(orig, clon);
          }
          destino = clon;
        });

        if (j > 0 && w.dataset.sp) destino.appendChild(document.createTextNode(' '));
        // Se reusa el span, no su texto: así el `nowrap` sigue valiendo en el
        // marcado final y la línea no se puede volver a partir dentro.
        destino.appendChild(w.cloneNode(true));
      });

      frag.appendChild(linea);
    });

    bloque.replaceChildren(frag);
  };

  const construir = (bloque) => {
    bloque.innerHTML = original.get(bloque);
    despiezar(bloque);
    enmascarar(bloque, agrupar(bloque));
    bloque.classList.add('lines-ready');
  };

  const mostrar = (bloque) => bloque.classList.add('is-in');

  const exportando = document.documentElement.classList.contains('is-export');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const arrancar = () => {
    bloques.forEach(construir);

    if (exportando || reducido || !('IntersectionObserver' in window)) {
      bloques.forEach(mostrar);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          mostrar(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );

    bloques.forEach((bloque) => observer.observe(bloque));

    // Al cambiar el ancho cambian los cortes: se rehace el despiece. Los que ya
    // entraron se rearman directamente en su estado final.
    let pendiente;
    window.addEventListener('resize', () => {
      window.clearTimeout(pendiente);
      pendiente = window.setTimeout(() => {
        bloques.forEach((bloque) => {
          const entrado = bloque.classList.contains('is-in');
          bloque.classList.remove('is-in');
          construir(bloque);
          if (!entrado) return;
          // Sin transición: esto es un reacomodo, no una entrada.
          const interiores = [...bloque.querySelectorAll('.line__in')];
          interiores.forEach((el) => {
            el.style.transition = 'none';
          });
          bloque.classList.add('is-in');
          requestAnimationFrame(() => {
            interiores.forEach((el) => {
              el.style.transition = '';
            });
          });
        });
      }, 180);
    });

    // Misma red de seguridad que el resto de los revelados.
    window.setTimeout(() => {
      if (bloques.some((b) => b.classList.contains('is-in'))) return;
      observer.disconnect();
      bloques.forEach(mostrar);
    }, 3000);
  };

  // Los cortes se miden con la tipografía que se va a ver: Open Sans carga
  // asincrónica y, medidos con la de respaldo, quedan mal armados — una máscara
  // termina conteniendo dos líneas. Con máscara el texto está oculto hasta que
  // entra, así que esperar no deja nada a la vista. El tope es por si la
  // tipografía no llega nunca.
  const fuentes = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fuentes, new Promise((ok) => window.setTimeout(ok, 1500))]).then(arrancar);

}

const DECO_IN_STEP = 150; // ms de diferencia entre formas de una misma banda

/**
 * Entrada de las formas decorativas: cada una aparece desplazándose desde el
 * borde al que está anclada, escalonadas dentro de su banda.
 */
const HERO_ZOOM = 0.3; // cuánto se acerca el video a lo largo del hero
const HERO_DRIFT = 0.9; // qué parte del sobrante del zoom usa para desplazarse

/**
 * El video del hero se acerca lentamente al scrollear y deriva hacia abajo, de
 * modo que queda por detrás del movimiento de la página.
 *
 * La deriva se calcula contra el sobrante que deja el zoom, nunca por encima:
 * así no se llega a ver el borde del video. Y como en reposo el zoom es 1 y la
 * deriva 0, el encuadre de arranque no cambia — que es el que se ajustó a mano.
 */
function initHeroParallax() {
  if (document.documentElement.classList.contains('is-export')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hero = document.querySelector('.hero');
  const video = hero && hero.querySelector('.hero__video');
  if (!video) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const box = hero.getBoundingClientRect();
    if (box.bottom < 0) return;

    const avance = Math.min(1, Math.max(0, -box.top / box.height));
    const zoom = 1 + avance * HERO_ZOOM;
    const sobrante = ((zoom - 1) / 2) * box.height;

    video.style.setProperty('--hero-zoom', zoom.toFixed(4));
    video.style.setProperty('--hero-shift', `${(sobrante * HERO_DRIFT).toFixed(1)}px`);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

function initDecoReveal() {
  const capas = [...document.querySelectorAll('.deco')];
  if (!capas.length) return;

  // Cada pieza entra por separado: un `.deco-cluster` se anima por dentro, no
  // como bloque, así las formas que van juntas se escalonan entre sí.
  const piezasDe = (hijo) =>
    hijo.classList.contains('deco-cluster') ? [...hijo.children] : [hijo];

  // El escalonado se resuelve acá y corre a lo largo de toda la banda: el delay
  // va en el estilo en línea, no en una custom property, porque la propiedad
  // animada no se re-evaluaría.
  const todas = [];
  capas.forEach((capa) => {
    let i = 0;
    [...capa.children].forEach((hijo) => {
      piezasDe(hijo).forEach((el) => {
        el.style.transitionDelay = `${i * DECO_IN_STEP}ms`;
        i += 1;
        todas.push(el);
      });
    });
  });

  const mostrar = (hijo) => piezasDe(hijo).forEach((el) => el.classList.add('is-in'));

  const exportando = document.documentElement.classList.contains('is-export');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (exportando || reducido || !('IntersectionObserver' in window)) {
    todas.forEach((el) => el.classList.add('is-in'));
    return;
  }

  // El desplazamiento sale del anclaje: las de la derecha entran desde la
  // derecha, las de abajo desde abajo. Dentro de un grupo, el anclaje es el del
  // grupo — las piezas no lo llevan.
  capas.forEach((capa) => {
    [...capa.children].forEach((hijo) => {
      const cls = hijo.classList;
      let desde = 'from-left';
      if (cls.contains('is-right')) desde = 'from-right';
      else if (cls.contains('is-bottom')) desde = 'from-below';
      else if (cls.contains('is-center')) desde = 'from-above';
      piezasDe(hijo).forEach((el) => el.classList.add(desde));
    });
  });

  // Se observa el grupo, no la pieza: así las formas que van juntas arrancan
  // todas en el mismo punto del scroll y el escalonado lo da el delay.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        mostrar(entry.target);
        observer.unobserve(entry.target);
      });
    },
    // Un cuarto de pantalla de margen: si dispara al ras del borde inferior, la
    // animación se consume mientras la forma todavía está fuera de vista y el
    // efecto no se llega a ver.
    { rootMargin: '0px 0px -25% 0px', threshold: 0 }
  );

  capas.forEach((capa) => [...capa.children].forEach((hijo) => observer.observe(hijo)));

  // Misma red de seguridad que el resto de los revelados: si a los 3s no entró
  // ninguna, el observador no está funcionando y se muestran todas.
  window.setTimeout(() => {
    if (todas.some((el) => el.classList.contains('is-in'))) return;
    observer.disconnect();
    todas.forEach((el) => el.classList.add('is-in'));
  }, 3000);
}

function initDecoParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.classList.contains('is-export')) return;

  // La banda recorta con `overflow: hidden`, y muchas formas del diseño van
  // pegadas a la costura entre bandas. Si se desplaza la capa entera, esas
  // formas se salen de la banda y quedan rebanadas. Por eso el recorrido se
  // mide forma por forma: cada una sólo se mueve lo que le sobra hasta el
  // borde, y la que está al ras no se mueve nada.
  const shapes = [];
  document.querySelectorAll('.deco').forEach((layer) => {
    const section = layer.parentElement;
    layer.querySelectorAll(':scope > *').forEach((el) => {
      shapes.push({ el, layer, section, room: 0 });
    });
  });
  if (!shapes.length) return;

  // Se mide con `offsetTop`/`offsetHeight` y no con `getBoundingClientRect`:
  // la entrada de las formas las desplaza con `translate`, y el rect lo
  // incluiría. La posición de layout es la que corresponde acá.
  const measure = () => {
    shapes.forEach((s) => {
      const arriba = s.el.offsetTop;
      const abajo = s.layer.offsetHeight - (arriba + s.el.offsetHeight);
      s.room = Math.max(0, Math.min(DECO_SHIFT, arriba, abajo));
    });
  };

  let ticking = false;

  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    shapes.forEach((s) => {
      if (!s.room) return;
      const box = s.section.getBoundingClientRect();
      if (box.bottom < -200 || box.top > vh + 200) return;
      // -1 cuando la banda entra por abajo, +1 cuando sale por arriba
      const progress = (vh / 2 - (box.top + box.height / 2)) / (vh / 2 + box.height / 2);
      s.el.style.setProperty('--deco-shift', `${(progress * s.room).toFixed(1)}px`);
    });
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  const onResize = () => {
    shapes.forEach((s) => s.el.style.removeProperty('--deco-shift'));
    measure();
    onScroll();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  measure();
  update();
}

/* -------------------------------------------------------------------------- */

const news = document.querySelector('.news');
if (news) initNewsCarousel(news);
initNav();
initVideo();
initEventPopup();
initVersionSwitch();
initA11yToolbar();
initReveal();
initLineReveal();
initDecoReveal();
initDecoParallax();
initHeroParallax();
