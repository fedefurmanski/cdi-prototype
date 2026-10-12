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

  // En celular la tarjeta activa va centrada, con las vecinas asomando a los
  // dos lados: el CSS lo pide con `--center: 1`. La primera, en cambio, va
  // alineada con el margen del contenido —y la siguiente asoma más— y la
  // última, contra el margen derecho, para que no sobre espacio al final.
  const offset = () => {
    if (getComputedStyle(track).getPropertyValue('--center').trim() !== '1') return 0;
    const card = cards[0];
    if (!card || index === 0) return 0;
    const libre = viewport.clientWidth - card.getBoundingClientRect().width;
    return index === pages - 1 ? libre : libre / 2;
  };

  const position = (extra = 0) => offset() - index * step() + extra;

  function go(nextIndex) {
    index = Math.max(0, Math.min(nextIndex, pages - 1));
    track.style.transform = `translate3d(${position()}px, 0, 0)`;
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

  // Deslizar con el dedo: la tira acompaña al dedo y, al soltar, pasa a la
  // tarjeta de al lado si el gesto pasó los 40px, o vuelve a su lugar. Sólo
  // cuenta si el gesto es más horizontal que vertical; si no, es scroll.
  let gesto = null;
  viewport.addEventListener(
    'touchstart',
    (event) => {
      const t = event.touches[0];
      gesto = { x: t.clientX, y: t.clientY, dx: 0, horizontal: null };
    },
    { passive: true },
  );
  viewport.addEventListener(
    'touchmove',
    (event) => {
      if (!gesto) return;
      const t = event.touches[0];
      const dx = t.clientX - gesto.x;
      const dy = t.clientY - gesto.y;
      if (gesto.horizontal === null && Math.hypot(dx, dy) > 8) {
        gesto.horizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (!gesto.horizontal) return;
      gesto.dx = dx;
      track.style.transition = 'none';
      track.style.transform = `translate3d(${position(dx)}px, 0, 0)`;
    },
    { passive: true },
  );
  const soltar = () => {
    if (!gesto) return;
    const { dx, horizontal } = gesto;
    gesto = null;
    track.style.transition = '';
    if (horizontal && Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    else go(index);
  };
  viewport.addEventListener('touchend', soltar);
  viewport.addEventListener('touchcancel', soltar);

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

  // En celular el panel ocupa el resto de la pantalla: mide dónde termina la
  // barra (cambia según cuánto del header se ve) y deja quieta la página de
  // atrás.
  const medir = () => {
    nav.style.setProperty('--menu-top', `${nav.getBoundingClientRect().bottom}px`);
  };

  const setOpen = (open) => {
    if (open) medir();
    else document.dispatchEvent(new CustomEvent('cdi:nav-close'));
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  window.addEventListener('resize', () => {
    if (nav.classList.contains('is-open')) medir();
  });

  // Con el menú hamburguesa, la barra de accesibilidad (contraste, tamaño,
  // idiomas, Facile à lire, Intranet) se muda al pie del menú, como en
  // cdi.lu; al volver a desktop vuelve a su lugar. Los botones se llevan sus
  // eventos consigo.
  const toolbar = document.querySelector('.toolbar');
  const herramientas = toolbar?.querySelector('.toolbar__inner');
  const panel = nav.querySelector(':scope > nav');
  const ubicarHerramientas = (enDesktop) => {
    if (!herramientas || !panel) return;
    const destino = enDesktop ? toolbar : panel;
    if (herramientas.parentElement !== destino) destino.appendChild(herramientas);
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
  ubicarHerramientas(desktop.matches);
  desktop.addEventListener('change', (event) => {
    ubicarHerramientas(event.matches);
    if (event.matches) setOpen(false);
  });
}

/**
 * El header aparece al scrollear hacia arriba y se va al bajar.
 *
 * El «cuánto se ve» lo resuelve el CSS con un `top` negativo —sólo queda la
 * barra de navegación—; acá sólo se decide si está o no. Dos cuidados:
 * un umbral de 6px para que el temblor del trackpad no lo haga parpadear, y
 * nunca esconderlo con el menú desplegado o con el foco dentro, que sería
 * hacer desaparecer lo que la persona está usando.
 */
function initHeadroom() {
  const header = document.querySelector('.header');
  if (!header) return;

  const UMBRAL = 6;
  // Por debajo de esto estamos en la cabecera: se muestra entera y quieta.
  const TOPE = 120;

  let ultimo = window.scrollY;
  let pedido = false;

  const revisar = () => {
    pedido = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - ultimo;

    header.classList.toggle('is-stuck', y > TOPE);

    if (Math.abs(delta) < UMBRAL) return;
    ultimo = y;

    const retenido =
      header.querySelector('.nav.is-open') ||
      header.querySelector('.nav__item.is-open') ||
      header.contains(document.activeElement);

    header.classList.toggle('is-hidden', delta > 0 && y > TOPE && !retenido);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (pedido) return;
      pedido = true;
      requestAnimationFrame(revisar);
    },
    { passive: true },
  );

  revisar();
}

/**
 * Menú desplegable de la navegación.
 *
 * Con ratón abre al pasar por encima y cierra con un respiro de 120 ms, para
 * que el recorrido diagonal hasta el panel no lo apague a mitad de camino. Sin
 * hover —táctil, o la nav apilada— el primer toque abre y el segundo navega.
 *
 * El panel cerrado no se oculta con `hidden`: eso cortaría la transición. Lo
 * saca de foco y del lector `inert`, y de la vista el `visibility` del CSS.
 */
function initDropdown() {
  const items = [...document.querySelectorAll('[data-dropdown]')];
  if (!items.length) return;

  const ancha = window.matchMedia('(min-width: 1081px)');
  const conRaton = window.matchMedia('(hover: hover)');

  items.forEach((item) => {
    const enlace = item.querySelector('.nav__link');
    const panel = item.querySelector('.dropdown');
    if (!enlace || !panel) return;

    let cierre;
    const abrir = (v) => {
      clearTimeout(cierre);
      item.classList.toggle('is-open', v);
      enlace.setAttribute('aria-expanded', String(v));
      panel.toggleAttribute('inert', !v);
    };

    abrir(false);

    // En celular el desplegable es una segunda pantalla del menú: arriba,
    // «← Retour» y el nombre de la sección (el CSS la muestra sólo ahí).
    const cabeza = document.createElement('div');
    cabeza.className = 'dropdown__head';
    const volver = document.createElement('button');
    volver.type = 'button';
    volver.className = 'dropdown__back';
    const flecha = document.createElement('span');
    flecha.className = 'icon icon--arrow';
    flecha.setAttribute('aria-hidden', 'true');
    volver.append(flecha, 'Retour');
    const titulo = document.createElement('p');
    titulo.className = 'dropdown__title';
    titulo.textContent = enlace.textContent.trim();
    cabeza.append(volver, titulo);
    panel.querySelector('.dropdown__inner')?.prepend(cabeza);

    volver.addEventListener('click', () => {
      abrir(false);
      enlace.focus({ preventScroll: true });
    });

    // Al cerrar el menú entero, también se cierra la segunda pantalla.
    document.addEventListener('cdi:nav-close', () => abrir(false));

    item.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && ancha.matches) abrir(true);
    });

    item.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || !ancha.matches) return;
      clearTimeout(cierre);
      cierre = setTimeout(() => abrir(false), 120);
    });

    enlace.addEventListener('click', (e) => {
      if (ancha.matches && conRaton.matches) return;
      if (item.classList.contains('is-open')) return;
      e.preventDefault();
      abrir(true);
      // En celular la segunda pantalla arranca arriba y el foco va a
      // «Retour», que es lo primero de ella.
      if (!ancha.matches) {
        const menu = item.closest('nav');
        if (menu) menu.scrollTop = 0;
        volver.focus({ preventScroll: true });
      }
    });

    // El foco por teclado abre; al salir del item, cierra. `relatedTarget` es
    // quien recibe el foco: en `focusout`, `activeElement` todavía es el viejo.
    item.addEventListener('focusin', () => {
      if (ancha.matches) abrir(true);
    });

    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) abrir(false);
    });

    document.addEventListener('click', (e) => {
      if (!item.contains(e.target)) abrir(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !item.classList.contains('is-open')) return;
      abrir(false);
      enlace.focus();
    });
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

// `?popup=off` lo saca puntualmente, para mirar la página sin él.
// TODO: apagado mientras se trabaja la versión mobile (12/10); volver a true
// antes de mandarle el prototipo al cliente. `?popup=on` lo muestra igual.
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

  // Oculto salvo que se pida con `?switch=on`. Es una herramienta para mostrar
  // las variantes, no parte de la página: en el link que ve el cliente estorba.
  // Las variantes siguen eligiéndose por URL (`?profiles=`, `?intranet=`)
  // aunque el conmutador no esté a la vista.
  if (new URLSearchParams(location.search).get('switch') !== 'on') {
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
  // Un grupo sólo declara que sus hijos entran; el escalonado no se calcula
  // acá sino al revelar (ver más abajo), que es cuando se sabe quiénes entran
  // juntos.
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    // El valor del atributo elige el gesto de los hijos: `data-reveal-group`
    // a secas es `up`; `data-reveal-group="rise"` los sube con un poco de
    // escala, que es como entran las tarjetas.
    const gesto = group.dataset.revealGroup || 'up';
    [...group.children].forEach((child) => {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', gesto);
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
      // Lo que entra en la misma tanda se escalona; lo que entra solo no
      // espera a nadie. Calcularlo acá y no de antemano es lo que hace que una
      // tarjeta a la que se llega scrolleando aparezca en el acto, y que las
      // que se ven de entrada lo hagan una detrás de otra.
      const nuevos = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      if (!nuevos.length) return;
      nuevos.sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );
      nuevos.forEach((el, i) => {
        // Un retardo escrito en el marcado manda: está puesto a propósito.
        if (!el.style.getPropertyValue('--reveal-delay')) {
          el.style.setProperty('--reveal-delay', `${Math.min(i, STAGGER_MAX) * STAGGER_MS}ms`);
        }
        el.classList.add('is-visible');
        observer.unobserve(el);
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

/**
 * Carrusel de la aproximación: una diapositiva a la vista, con los pasos
 * numerados abajo.
 *
 * Es un `tablist` de verdad —flechas para moverse, Inicio y Fin para los
 * extremos— y no avanza solo: el contenido es largo y nadie quiere que se lo
 * cambien mientras lee.
 */
function initStepper() {
  document.querySelectorAll('[data-stepper]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const paneles = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const fotos = [...root.querySelectorAll('[data-media]')];
    // Los rótulos del índice viven fuera del botón —el control es el número—
    // así que se marcan por posición, igual que las fotos.
    const nombres = [...root.querySelectorAll('[data-name]')];
    if (!tabs.length || paneles.some((p) => !p)) return;

    // El fondo toma el color del paso activo, muy diluido. El color va como
    // valor literal en `data-tint` y no como variable: una propiedad en
    // transición no se re-evalúa cuando cambia la custom property de la que
    // depende, y el fondo se quedaría en el primer color.
    const tiñe = root.hasAttribute('data-tint-bg');
    const pintar = (tab) => {
      const tono = tab.dataset.tint;
      if (!tiñe || !tono) return;
      root.style.backgroundColor = `${tono}14`;
      root.style.borderColor = tono;
    };

    // Al cambiar de paso, el texto que entra se rehace línea por línea, como el
    // del hero.
    //
    // Quitar y reponer `is-in` con un reflujo en el medio **no alcanza**: al
    // quitarlo, la línea no vuelve de un salto a su sitio de partida, sino que
    // arranca la transición de vuelta. El reflujo la encuentra recién salida,
    // o sea todavía en cero, y reponer la clase la anima de cero a cero: no se
    // ve nada. Hay que apagar la transición para que el regreso sea
    // instantáneo y volver a encenderla antes de reponer la clase: el
    // navegador decide si anima mirando el estilo *posterior* al cambio, así
    // que alcanza con que la transición esté puesta ahí.
    //
    // Si el despiece todavía no está hecho —espera a que carguen las fuentes—
    // no se hace nada: de eso ya se ocupa el observador de `initLineReveal`.
    const relanzarLineas = (panel) => {
      panel.querySelectorAll('[data-lines].lines-ready').forEach((bloque) => {
        const lineas = [...bloque.querySelectorAll('.line__in')];
        // Se apaga con `transition-property` y no con el atajo `transition`:
        // el atajo resetea también el `transition-delay`, que es donde vive el
        // escalonado de línea a línea, y al reponerlo se perdía —las líneas
        // entraban todas juntas—.
        lineas.forEach((l) => {
          l.style.transitionProperty = 'none';
        });
        bloque.classList.remove('is-in');
        void bloque.offsetWidth;
        lineas.forEach((l) => {
          l.style.transitionProperty = '';
        });
        bloque.classList.add('is-in');
      });
    };

    // En celular la caja de los textos toma el alto del paso activo, con una
    // transición (ver `.steps__panels` en interior.css): con el alto del más
    // largo, a los pasos cortos les sobraba aire al pie. En desktop sigue
    // midiendo lo del más largo y no salta.
    const caja = root.querySelector('.steps__panels');
    const celular = window.matchMedia('(max-width: 760px)');
    const ajustar = (i) => {
      if (!caja || i < 0) return;
      caja.style.height = celular.matches ? `${paneles[i].offsetHeight}px` : '';
    };

    const mostrar = (i, mover) => {
      pintar(tabs[i]);
      relanzarLineas(paneles[i]);
      ajustar(i);
      tabs.forEach((tab, j) => {
        const activo = i === j;
        tab.setAttribute('aria-selected', String(activo));
        tab.tabIndex = activo ? 0 : -1;
        // `inert` y no `hidden`: el panel tiene que seguir ocupando su celda
        // —el alto lo fija el más largo— pero sin recibir foco ni ser leído.
        if (activo) paneles[j].removeAttribute('inert');
        else paneles[j].setAttribute('inert', '');
        if (fotos[j]) {
          fotos[j].style.opacity = activo ? '1' : '0';
          fotos[j].toggleAttribute('aria-hidden', !activo);
        }
        if (nombres[j]) nombres[j].classList.toggle('is-on', activo);
      });
      if (mover) tabs[i].focus();
    };

    // Las flechas de la foto recorren los pasos en círculo.
    const actual = () => tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    root.querySelectorAll('[data-approach]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const paso = btn.dataset.approach === 'next' ? 1 : -1;
        mostrar((actual() + paso + tabs.length) % tabs.length, false);
      });
    });

    // En celular no hay flechas: se pasa de paso deslizando la foto, con el
    // mismo umbral que el carrusel de noticias.
    const escena = root.querySelector('.approach__stage');
    if (escena) {
      let gesto = null;
      escena.addEventListener(
        'touchstart',
        (event) => {
          const t = event.touches[0];
          gesto = { x: t.clientX, y: t.clientY, dx: 0, horizontal: null };
        },
        { passive: true },
      );
      escena.addEventListener(
        'touchmove',
        (event) => {
          if (!gesto) return;
          const t = event.touches[0];
          const dx = t.clientX - gesto.x;
          const dy = t.clientY - gesto.y;
          if (gesto.horizontal === null && Math.hypot(dx, dy) > 8) {
            gesto.horizontal = Math.abs(dx) > Math.abs(dy);
          }
          if (gesto.horizontal) gesto.dx = dx;
        },
        { passive: true },
      );
      const soltar = () => {
        if (!gesto) return;
        const { dx, horizontal } = gesto;
        gesto = null;
        if (horizontal && Math.abs(dx) > 40) {
          mostrar((actual() + (dx < 0 ? 1 : -1) + tabs.length) % tabs.length, false);
        }
      };
      escena.addEventListener('touchend', soltar);
      escena.addEventListener('touchcancel', () => {
        gesto = null;
      });
    }

    const inicial = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    pintar(tabs[inicial >= 0 ? inicial : 0]);

    // El alto se vuelve a medir si cambia el del texto (las fuentes, el A+, el
    // ancho de la pantalla) o si se pasa de celular a desktop.
    if (caja) {
      const remedir = () => ajustar(actual() >= 0 ? actual() : 0);
      new ResizeObserver(remedir).observe(caja.parentElement);
      paneles.forEach((p) => new ResizeObserver(remedir).observe(p));
      celular.addEventListener('change', remedir);
      remedir();
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => mostrar(i, false));
      tab.addEventListener('keydown', (e) => {
        const ultimo = tabs.length - 1;
        let destino = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') destino = i === ultimo ? 0 : i + 1;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') destino = i === 0 ? ultimo : i - 1;
        if (e.key === 'Home') destino = 0;
        if (e.key === 'End') destino = ultimo;
        if (destino === null) return;
        e.preventDefault();
        mostrar(destino, true);
      });
    });
  });
}

/**
 * Cifras que cuentan hacia arriba al entrar en pantalla.
 *
 * El número final ya está en el marcado: si el JS no corre, se lee igual. Acá
 * sólo se reemplaza mientras dura la animación.
 */
function initCounters() {
  const cifras = [...document.querySelectorAll('[data-count]')];
  if (!cifras.length) return;

  // En modo exportación no cuenta: la captura agarraría un número a mitad de
  // camino en vez del definitivo.
  if (document.documentElement.classList.contains('is-export')) return;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido || !('IntersectionObserver' in window)) return;

  const contar = (el) => {
    const destino = Number(el.dataset.count);
    if (!Number.isFinite(destino)) return;
    const duracion = 1800;

    // La cifra entra con el fundido de su caja (data-reveal). Si cuenta a la
    // par, para cuando se ve entera ya va por el 95% y se lee como texto fijo
    // (MarkUp #43): arranca recién cuando la caja está casi visible.
    const caja = el.closest('[data-reveal]');
    const retardo = parseFloat(caja?.style.getPropertyValue('--reveal-delay')) || 0;
    const espera = caja ? retardo + 450 : 0;

    const arrancar = () => {
      const inicio = performance.now();
      const paso = (ahora) => {
        const t = Math.min(1, (ahora - inicio) / duracion);
        // Desacelera al final, igual que el resto de las animaciones.
        const suave = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(destino * suave));
        if (t < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    };

    el.textContent = '0';
    window.setTimeout(arrancar, espera);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        contar(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -20% 0px', threshold: 0 }
  );

  cifras.forEach((el) => observer.observe(el));
}

/**
 * Barra lateral de las páginas interiores: marca en qué sección está el lector.
 *
 * Se queda con la sección visible que esté más arriba, y no con la última que
 * entró: al scrollear hacia arriba, si no, queda marcada la de abajo.
 */
/* --------------------------------------------------------------------------
   Búsqueda
   La lupa abre, debajo del menú, un panel con un campo grande: sin escribir
   muestra búsquedas frecuentes; al escribir, las páginas del sitio que
   coinciden, cada una con el color de su sección. Es para el prototipo: el
   índice es una lista fija y no hay página de resultados (Enter va al
   primero). En celular el panel ocupa la pantalla, como el menú. Se cierra
   con la misma lupa —que pasa a ser una X—, con Escape o tocando afuera.
   El panel se arma acá para no repetirlo en el marcado de cada página.
   -------------------------------------------------------------------------- */

const PAGINAS = [
  ['Qui sommes-nous ?', 'a-propos-qui-sommes-nous.html', 'a-propos', 'À propos'],
  ['Le trouble du développement intellectuel', 'a-propos-trouble.html', 'a-propos', 'À propos'],
  ['Notre philosophie', 'a-propos-philosophie.html', 'a-propos', 'À propos'],
  ['Notre approche', 'a-propos-approche.html', 'a-propos', 'À propos'],
  ['Les publics cibles', 'a-propos-publics.html', 'a-propos', 'À propos'],
  ['Le CDI en chiffres', 'a-propos-chiffres.html', 'a-propos', 'À propos'],
  ['Notre équipe', 'a-propos-equipe.html', 'a-propos', 'À propos'],
  ['Nos annexes', 'a-propos-annexes.html', 'a-propos', 'À propos'],
  ['Annexe Clervaux', 'a-propos-annexe-clervaux.html', 'a-propos', 'Nos annexes'],
  ['Annexe Kannercampus Belval', 'a-propos-annexe-belval.html', 'a-propos', 'Nos annexes'],
  ['Annexe Differdange', 'a-propos-annexe-differdange.html', 'a-propos', 'Nos annexes'],
  ['Annexe Echternach', 'a-propos-annexe-echternach.html', 'a-propos', 'Nos annexes'],
  ['Annexe Luxembourg', 'a-propos-annexe-luxembourg.html', 'a-propos', 'Nos annexes'],
  ['Annexe Kannerinsel Berchem', 'a-propos-annexe-berchem.html', 'a-propos', 'Nos annexes'],
  ['Annexe Warken', 'a-propos-annexe-warken.html', 'a-propos', 'Nos annexes'],
  ['Diagnostic spécialisé', 'index.html#services', 'parents', 'Services'],
  ['Conseils aux familles', 'index.html#services', 'parents', 'Services'],
  ['Enseignement pour les élèves', 'index.html#services', 'parents', 'Services'],
  ['Thérapie et rééducation', 'index.html#services', 'parents', 'Services'],
  ['Recherche et documentation', 'index.html#services', 'professionnels', 'Services'],
  ['Conseils aux professionnels', 'index.html#services', 'professionnels', 'Services'],
  ['Enseignement aux élèves', 'index.html#services', 'professionnels', 'Services'],
  ['Service Leichte Sprache', 'index.html#services', 'professionnels', 'Services'],
  ['Formation des enseignants', 'index.html#services', 'professionnels', 'Services'],
  ['Nos actualités', 'index.html', 'actualites', 'Actualités'],
  ['Contactez nous', '#', 'contact', 'Contact'],
].map(([titulo, url, seccion, rubro]) => ({ titulo, url, seccion, rubro }));

const FRECUENTES = ['Diagnostic', 'Annexes', 'Leichte Sprache', 'Équipe', 'Formation'];

// Sin acentos y en minúscula, letra por letra, para que «equipe» encuentre
// «équipe» y la posición de lo encontrado sirva para resaltarlo en el
// original.
const plano = (texto) =>
  [...texto].map((c) => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()[0] || c).join('');

function initSearch() {
  const boton = document.querySelector('[data-action="search"]');
  const nav = document.querySelector('.nav');
  if (!boton || !nav) return;

  const panel = document.createElement('div');
  panel.className = 'search';
  panel.id = 'busqueda';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Recherche');
  panel.innerHTML = `
    <div class="search__inner container">
      <form class="search__form" role="search">
        <label class="visually-hidden" for="busqueda-campo">Rechercher sur le site</label>
        <span class="icon icon--search" aria-hidden="true"></span>
        <input class="search__input" id="busqueda-campo" type="search" placeholder="Rechercher sur le site…" autocomplete="off" />
      </form>
      <p class="search__label"></p>
      <ul class="search__chips"></ul>
      <ul class="search__results"></ul>
      <p class="visually-hidden" aria-live="polite" data-estado></p>
    </div>`;
  nav.append(panel);

  const campo = panel.querySelector('.search__input');
  const rotulo = panel.querySelector('.search__label');
  const chips = panel.querySelector('.search__chips');
  const lista = panel.querySelector('.search__results');
  const estado = panel.querySelector('[data-estado]');

  boton.setAttribute('aria-controls', panel.id);
  boton.setAttribute('aria-expanded', 'false');

  FRECUENTES.forEach((termino) => {
    const li = document.createElement('li');
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'search__chip';
    chip.textContent = termino;
    chip.addEventListener('click', () => {
      campo.value = termino;
      pintar();
      campo.focus();
    });
    li.append(chip);
    chips.append(li);
  });

  const resaltar = (titulo, consulta) => {
    const i = plano(titulo).indexOf(consulta);
    if (i < 0) return document.createTextNode(titulo);
    const frag = document.createDocumentFragment();
    const marca = document.createElement('mark');
    marca.textContent = titulo.slice(i, i + consulta.length);
    frag.append(titulo.slice(0, i), marca, titulo.slice(i + consulta.length));
    return frag;
  };

  function pintar() {
    const consulta = plano(campo.value.trim());
    lista.replaceChildren();
    if (!consulta) {
      rotulo.textContent = 'Recherches fréquentes';
      chips.hidden = false;
      estado.textContent = '';
      return;
    }
    chips.hidden = true;
    const hallados = PAGINAS.filter(
      (p) => plano(p.titulo).includes(consulta) || plano(p.rubro).includes(consulta),
    ).slice(0, 8);
    rotulo.textContent = hallados.length
      ? `${hallados.length} résultat${hallados.length > 1 ? 's' : ''}`
      : `Aucun résultat pour « ${campo.value.trim()} »`;
    estado.textContent = rotulo.textContent;
    hallados.forEach((p, i) => {
      const li = document.createElement('li');
      li.dataset.section = p.seccion;
      li.style.setProperty('--i', i);
      const a = document.createElement('a');
      a.href = p.url;
      const punto = document.createElement('span');
      punto.className = 'search__dot';
      punto.setAttribute('aria-hidden', 'true');
      const titulo = document.createElement('span');
      titulo.className = 'search__title';
      titulo.append(resaltar(p.titulo, consulta));
      const rubro = document.createElement('span');
      rubro.className = 'search__where';
      rubro.textContent = p.rubro;
      a.append(punto, titulo, rubro);
      li.append(a);
      lista.append(li);
    });
  }

  const abierta = () => panel.classList.contains('is-open');

  const abrir = (si) => {
    if (si) {
      // El menú y la búsqueda no conviven: si el menú está abierto, se cierra.
      if (nav.classList.contains('is-open')) nav.querySelector('[data-action="nav-toggle"]')?.click();
      nav.style.setProperty('--search-top', `${nav.getBoundingClientRect().bottom}px`);
    }
    panel.classList.toggle('is-open', si);
    panel.toggleAttribute('inert', !si);
    boton.setAttribute('aria-expanded', String(si));
    document.documentElement.classList.toggle('is-search-open', si);
    if (si) {
      pintar();
      // Después de la transición de entrada: con el panel todavía invisible el
      // foco no siempre se queda.
      setTimeout(() => campo.focus({ preventScroll: true }), 60);
    }
  };

  abrir(false);
  pintar();

  boton.addEventListener('click', () => abrir(!abierta()));
  campo.addEventListener('input', pintar);

  panel.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const primero = lista.querySelector('a');
    if (primero) location.href = primero.getAttribute('href');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !abierta()) return;
    abrir(false);
    boton.focus();
  });

  document.addEventListener('click', (e) => {
    if (abierta() && !panel.contains(e.target) && !boton.contains(e.target)) abrir(false);
  });

  // Si se abre el menú, la búsqueda se cierra.
  nav.querySelector('[data-action="nav-toggle"]')?.addEventListener('click', () => {
    if (abierta()) abrir(false);
  });
}

/* --------------------------------------------------------------------------
   Servicios: en celular, las 4 primeras y «Afficher les 5 autres services»
   Las nueve apiladas hacían la home larguísima. El botón se agrega acá y el
   CSS esconde el resto sólo en celular, así que sin JS —o en desktop— se ven
   todas. Las que aparecen entran con el revelado de siempre.
   -------------------------------------------------------------------------- */

function initServicesMore() {
  const grilla = document.querySelector('.services__grid');
  if (!grilla) return;
  const VISIBLES = 4;
  const resto = grilla.children.length - VISIBLES;
  if (resto < 1) return;

  const caja = document.createElement('div');
  caja.className = 'services__more';
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'services__more-btn';
  boton.setAttribute('aria-controls', grilla.id || '');
  boton.setAttribute('aria-expanded', 'false');
  const texto = document.createElement('span');
  // La flecha va dentro de un círculo de color: el link se nota más al pie
  // de la lista.
  const circulo = document.createElement('span');
  circulo.className = 'services__more-circle';
  circulo.setAttribute('aria-hidden', 'true');
  const flecha = document.createElement('span');
  flecha.className = 'icon icon--chevron';
  circulo.append(flecha);
  boton.append(texto, circulo);
  caja.append(boton);
  grilla.after(caja);

  const pintar = (abierto) => {
    boton.setAttribute('aria-expanded', String(abierto));
    texto.textContent = abierto ? 'Afficher moins' : `Afficher les ${resto} autres services`;
    grilla.classList.toggle('is-expanded', abierto);
  };

  boton.addEventListener('click', () => {
    const abrir = boton.getAttribute('aria-expanded') !== 'true';
    pintar(abrir);
    // Al plegar, la lista se acorta por encima del botón: se lo trae a la
    // vista para no dejar a la persona en otra sección.
    if (!abrir) boton.scrollIntoView({ block: 'nearest' });
  });

  pintar(false);
}

/* --------------------------------------------------------------------------
   Submenú plegable en celular
   Apilado, el submenú de la sección se reduce a un botón que dice dónde se
   está —«À propos · Qui sommes-nous ?»— y despliega la lista. Y al final de
   la página va el acceso a la siguiente de la sección. Los dos se arman acá
   con lo que ya está en el submenú, así no hay que repetirlo en el marcado
   de cada página; el CSS los muestra sólo en celular.
   -------------------------------------------------------------------------- */

function initSubnavToggle() {
  const wrap = document.querySelector('.subnav-wrap');
  const lista = wrap?.querySelector('.subnav');
  if (!wrap || !lista) return;

  const seccion = wrap.querySelector('.subnav__eyebrow strong')?.textContent.trim();
  const actual = lista.querySelector('a[aria-current="page"]')?.textContent.trim();
  if (!lista.id) lista.id = 'subnav-lista';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'subnav__toggle';
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-controls', lista.id);

  const texto = document.createElement('span');
  const fuerte = document.createElement('strong');
  fuerte.textContent = seccion || '';
  texto.append(fuerte);
  if (actual) {
    const pagina = document.createElement('span');
    pagina.className = 'subnav__toggle-page';
    pagina.textContent = actual;
    texto.append(' · ', pagina);
  }

  const flecha = document.createElement('span');
  flecha.className = 'icon icon--chevron';
  flecha.setAttribute('aria-hidden', 'true');

  boton.append(texto, flecha);
  wrap.insertBefore(boton, lista);

  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') !== 'true';
    boton.setAttribute('aria-expanded', String(abierto));
    wrap.classList.toggle('is-open', abierto);
  });

  // La página siguiente; después de la última, vuelta a la primera. Si la
  // página ya trae su propio acceso (las annexes llevan a la annexe
  // siguiente), se respeta ése.
  const columna = document.querySelector('.interior__main');
  if (!columna || columna.querySelector('.next-page')) return;
  const enlaces = [...lista.querySelectorAll('a')];
  const indice = enlaces.findIndex((a) => a.getAttribute('aria-current') === 'page');
  if (indice < 0 || enlaces.length < 2) return;
  const ultima = indice === enlaces.length - 1;
  const siguiente = enlaces[ultima ? 0 : indice + 1];

  const acceso = document.createElement('a');
  acceso.className = 'next-page';
  acceso.href = siguiente.getAttribute('href');

  const textos = document.createElement('span');
  const rotulo = document.createElement('span');
  rotulo.className = 'next-page__label';
  rotulo.textContent = ultima ? 'Retour au début' : 'Page suivante';
  // Qué número es la página que viene y cuántas tiene la sección: «2/8».
  const numero = (ultima ? 0 : indice + 1) + 1;
  const cuenta = document.createElement('span');
  cuenta.className = 'next-page__count';
  const visible = document.createElement('span');
  visible.setAttribute('aria-hidden', 'true');
  visible.textContent = `${numero}/${enlaces.length}`;
  const leido = document.createElement('span');
  leido.className = 'visually-hidden';
  leido.textContent = `, page ${numero} sur ${enlaces.length}`;
  cuenta.append(visible, leido);
  rotulo.append(cuenta);
  const titulo = document.createElement('span');
  titulo.className = 'next-page__title';
  titulo.textContent = siguiente.textContent.trim();
  textos.append(rotulo, titulo);

  const flechita = document.createElement('span');
  flechita.className = 'icon icon--arrow icon--md';
  flechita.setAttribute('aria-hidden', 'true');

  acceso.append(textos, flechita);
  columna.append(acceso);
}

function initSubnav() {
  const nav = document.querySelector('.subnav');
  if (!nav || !('IntersectionObserver' in window)) return;

  const enlaces = [...nav.querySelectorAll('a[href^="#"]')];
  const secciones = enlaces
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!secciones.length) return;

  const visibles = new Set();

  const marcar = () => {
    if (!visibles.size) return;
    const arriba = [...visibles].sort((a, b) => a.offsetTop - b.offsetTop)[0];
    enlaces.forEach((a) => {
      const activo = a.getAttribute('href') === `#${arriba.id}`;
      if (activo) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibles.add(entry.target);
        else visibles.delete(entry.target);
      });
      marcar();
    },
    // La franja activa es el tercio superior de la pantalla: es donde está
    // mirando quien lee, no el centro ni el borde.
    { rootMargin: '0px 0px -67% 0px', threshold: 0 }
  );

  secciones.forEach((s) => observer.observe(s));
}

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
          // Sin transición: esto es un reacomodo, no una entrada. Se apaga
          // con `transition-property`, que el atajo se llevaría puesto el
          // `transition-delay` del escalonado.
          const interiores = [...bloque.querySelectorAll('.line__in')];
          interiores.forEach((el) => {
            el.style.transitionProperty = 'none';
          });
          bloque.classList.add('is-in');
          requestAnimationFrame(() => {
            interiores.forEach((el) => {
              el.style.transitionProperty = '';
            });
          });
        });
      }, 180);
    });

    // Red de seguridad: lo que a los tres segundos sigue sin entrar se muestra
    // igual. Antes alcanzaba con que **alguno** hubiera entrado para no hacer
    // nada, y entonces un bloque al que el observador no llegara se quedaba
    // enmascarado —o sea, invisible— para siempre. Con el título entrando
    // siempre primero, la red no se disparaba nunca.
    window.setTimeout(() => {
      bloques
        .filter((b) => !b.classList.contains('is-in'))
        .forEach((b) => {
          observer.unobserve(b);
          mostrar(b);
        });
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
  // Un `.deco-rail` lleva su grupo un nivel más adentro.
  const piezasDe = (hijo) => {
    const grupo = hijo.classList.contains('deco-rail') ? hijo.querySelector('.deco-cluster') : hijo;
    return grupo?.classList.contains('deco-cluster') ? [...grupo.children] : [hijo];
  };

  // El escalonado se resuelve acá y corre a lo largo de toda la banda: el delay
  // va en el estilo en línea, no en una custom property, porque la propiedad
  // animada no se re-evaluaría.
  const todas = [];
  capas.forEach((capa) => {
    // El escalonado se puede acortar por capa con `data-deco-step`: en las
    // páginas interiores hay siete piezas y con el paso de la home la última
    // arrancaba casi un segundo después de la primera.
    const paso = Number(capa.dataset.decoStep) || DECO_IN_STEP;
    let i = 0;
    [...capa.children].forEach((hijo) => {
      piezasDe(hijo).forEach((el) => {
        el.style.transitionDelay = `${i * paso}ms`;
        i += 1;
        todas.push(el);
      });
    });
  });

  // Formas que cruzan el borde entre dos bandas —en color de un lado, en gris
  // del otro— llevan el mismo `data-deco-pair`: entran juntas, con el retraso
  // y la dirección de la primera, así la unión no se separa mientras se mueven.
  const parejas = new Map();
  todas.forEach((el) => {
    const id = el.dataset.decoPair;
    if (!id) return;
    if (!parejas.has(id)) parejas.set(id, []);
    parejas.get(id).push(el);
  });
  parejas.forEach((piezas) => {
    piezas.forEach((el) => { el.style.transitionDelay = piezas[0].style.transitionDelay; });
  });

  const mostrar = (hijo) =>
    piezasDe(hijo).forEach((el) => {
      const pareja = parejas.get(el.dataset.decoPair) || [el];
      pareja.forEach((p) => p.classList.add('is-in'));
    });

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
  const DIRECCIONES = ['from-left', 'from-right', 'from-below', 'from-above'];
  parejas.forEach((piezas) => {
    const desde = DIRECCIONES.find((d) => piezas[0].classList.contains(d));
    piezas.slice(1).forEach((el) => {
      el.classList.remove(...DIRECCIONES);
      el.classList.add(desde);
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

/* --------------------------------------------------------------------------
   Volver arriba
   El botón aparece recién pasada una pantalla de scroll: antes no hay adónde
   volver. Con movimiento reducido el salto es directo.
   -------------------------------------------------------------------------- */

function initBackToTop() {
  const btn = document.querySelector('[data-action="back-to-top"]');
  if (!btn) return;

  const update = () => {
    btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
  };

  btn.addEventListener('click', () => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    // El foco vuelve al principio con el scroll —al logo y no al «Aller au
    // contenu», que se haría visible—: si no, el siguiente Tab seguiría
    // desde el pie.
    document.querySelector('.nav a')?.focus({ preventScroll: true });
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* --------------------------------------------------------------------------
   Plan de acceso de una annexe
   Leaflet con fondos de OpenStreetMap en gris —sin cookies— y el marcador
   de la marca. Sin rueda del mouse: la página se scrollea por encima del mapa sin
   quedar atrapada; se acerca con los botones o con dos dedos.
   -------------------------------------------------------------------------- */

function initAnnexeMap() {
  const box = document.querySelector('.annexe-map[data-map-lat]');
  if (!box || !window.L) return;

  const punto = [Number(box.dataset.mapLat), Number(box.dataset.mapLng)];
  const mapa = window.L.map(box, { scrollWheelZoom: false, zoomControl: true }).setView(punto, 16);

  // Fondos de OpenStreetMap, aclarados en gris desde el CSS. Sirven para el
  // prototipo; en producción hace falta un proveedor con clave (CARTO,
  // MapTiler, Stadia): la política de uso de OSM no admite tráfico de sitio.
  window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  const icono = window.L.divIcon({
    className: '',
    html: '<span class="annexe-map__pin"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  window.L.marker(punto, { icon: icono, keyboard: false })
    .addTo(mapa)
    .bindTooltip(box.dataset.mapLabel || '', {
      permanent: true,
      direction: 'right',
      offset: [20, 0],
      className: 'annexe-map__label',
    });
}

/* --------------------------------------------------------------------------
   Equipo: fichas sobre la foto de grupo
   El hover y el foco las muestran desde el CSS; el clic las deja abiertas
   —en pantallas táctiles es la única forma— y cierra las demás. Escape o un
   clic fuera las cierran.
   -------------------------------------------------------------------------- */

function initTeam() {
  document.querySelectorAll('[data-team]').forEach((team) => {
    const spots = [...team.querySelectorAll('.team__spot')];

    const close = (spot) => {
      spot.setAttribute('aria-expanded', 'false');
      spot.closest('.team__person').classList.remove('is-open');
    };

    spots.forEach((spot) => {
      spot.addEventListener('click', () => {
        const open = spot.getAttribute('aria-expanded') !== 'true';
        spots.forEach(close);
        if (!open) return;
        spot.setAttribute('aria-expanded', 'true');
        spot.closest('.team__person').classList.add('is-open');
      });
    });

    team.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const abierta = spots.find((s) => s.getAttribute('aria-expanded') === 'true');
      spots.forEach(close);
      abierta?.focus();
    });

    document.addEventListener('click', (event) => {
      if (!team.contains(event.target)) spots.forEach(close);
    });
  });
}

/* -------------------------------------------------------------------------- */

const news = document.querySelector('.news');
if (news) initNewsCarousel(news);
initNav();
initDropdown();
initHeadroom();
initVideo();
initEventPopup();
initVersionSwitch();
initA11yToolbar();
initReveal();
initSearch();
initServicesMore();
initSubnavToggle();
initSubnav();
initStepper();
initCounters();
initLineReveal();
initDecoReveal();
initDecoParallax();
initHeroParallax();
initBackToTop();
initAnnexeMap();
initTeam();
