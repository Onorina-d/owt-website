/**
 * Homepage behaviour. Everything here is progressive enhancement: the page is
 * complete and usable without JavaScript.
 */

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerWide = window.matchMedia('(min-width: 1024px) and (pointer: fine)');

export function initSite() {
  // first screen: needed right away
  initLazyImages();
  initReveals();
  initHeroSlides();
  initMenu();
  initScrollScene();
  initHashLanding();
  initVideoDialog();
  initRequestModal();
  initForm();
  // below the fold: wait until the main thread is free
  const later = () => {
    initDirections();
    initHorizontalProjects();
    initActiveNav();
    initSubNav();
    initProjectFilter();
    initProcess();
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(later, { timeout: 1200 });
  else window.setTimeout(later, 300);
}

/* ---------------------------------------------------------------- reveals */

function initReveals() {
  const targets = $$('[data-reveal], [data-lines], [data-wipe]');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  // A fully clipped element has no visible area, so wipes are observed via their parent.
  const marks = new Map<Element, Element[]>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          marks.get(e.target)?.forEach((el) => el.classList.add('is-in'));
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  targets.forEach((el) => {
    const observed = el.hasAttribute('data-wipe') && el.parentElement ? el.parentElement : el;
    marks.set(observed, [...(marks.get(observed) ?? []), el]);
    io.observe(observed);
  });
}

/* ------------------------------------------------------------- hero slides */

function initHeroSlides() {
  const hero = $('[data-hero]');
  if (!hero) return;
  const slides = $$('[data-slide]', hero);
  const bars = $$('[data-bar]', hero);
  const indexEl = $('[data-slide-index]', hero);
  const captionEl = $('[data-slide-caption]', hero);
  if (slides.length < 2) return;

  const duration = 7000;
  let current = 0;
  let timer = 0;
  let running = false;

  const restartBar = (bar: HTMLElement) => {
    bar.classList.remove('is-active');
    void bar.offsetWidth; // restart CSS animation
    bar.classList.add('is-active');
  };

  const go = (next: number) => {
    const prev = current;
    current = next;
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === current);
      s.classList.toggle('is-prev', i === prev);
    });
    bars.forEach((b, i) => {
      b.classList.toggle('is-done', i < current);
      b.classList.remove('is-active');
    });
    restartBar(bars[current]);
    if (indexEl) indexEl.textContent = String(current + 1).padStart(2, '0');
    if (captionEl) {
      captionEl.classList.add('is-swapping');
      window.setTimeout(() => {
        captionEl.textContent = slides[current].dataset.caption ?? '';
        captionEl.classList.remove('is-swapping');
      }, 380);
    }
  };

  // The sequence starts when the visitor engages (scroll, pointer, touch, key)
  // or after a quiet pause. Until then the first frame holds still: the first
  // screen is complete at once, and slide 2 is only downloaded when it will be
  // shown. Each next slide is fetched while the current one is on screen.
  const ready = new Set<number>([0]);
  const fetchSlide = (i: number) => {
    if (i >= slides.length || ready.has(i)) return;
    const pic = slides[i].querySelector<HTMLElement>('picture[data-deferred]');
    void promotePicture(pic).then(() => ready.add(i));
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(function tick() {
      const next = (current + 1) % slides.length;
      if (!ready.has(next)) {
        fetchSlide(next);
        timer = window.setTimeout(tick, 600);
        return;
      }
      go(next);
      fetchSlide(next + 1);
      schedule();
    }, duration);
  };

  let engaged = false;
  let visible = true;
  const start = () => {
    if (running || !engaged || !visible || document.hidden) return;
    running = true;
    hero.removeAttribute('data-paused');
    restartBar(bars[current]);
    schedule();
  };
  const stop = () => {
    running = false;
    window.clearTimeout(timer);
    hero.setAttribute('data-paused', '');
  };

  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reduceMotion.matches || saveData) return;

  const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
  const engage = () => {
    if (engaged) return;
    engaged = true;
    events.forEach((ev) => window.removeEventListener(ev, engage));
    hero.setAttribute('data-playing', '');
    fetchSlide(1);
    start();
  };
  events.forEach((ev) => window.addEventListener(ev, engage, { passive: true, once: true }));
  const fallback = () => window.setTimeout(engage, 12000);
  if (document.readyState === 'complete') fallback();
  else window.addEventListener('load', fallback, { once: true });

  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0.2 },
  ).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

/* ------------------------------------------------------- on-demand images */

/** Moves held sources (data-srcset / data-src) into place; resolves when loaded. */
function promotePicture(pic: HTMLElement | null) {
  return new Promise<void>((resolve) => {
    if (!pic || !pic.hasAttribute('data-deferred')) return resolve();
    const img = pic.querySelector<HTMLImageElement>('img');
    pic.querySelectorAll<HTMLSourceElement>('source[data-srcset]').forEach((source) => {
      source.srcset = source.dataset.srcset!;
      source.removeAttribute('data-srcset');
    });
    pic.removeAttribute('data-deferred');
    if (!img || !img.dataset.src) return resolve();
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
}

/**
 * Lazy images load when they are about one screen away — not the ~2500 px
 * native lazy loading uses on slow connections. Horizontal margin covers the
 * pinned project reel, whose frames sit to the right of the viewport.
 */
function initLazyImages() {
  const pics = $$('picture[data-lazy][data-deferred]');
  if (!pics.length) return;
  if (!('IntersectionObserver' in window)) {
    pics.forEach((p) => void promotePicture(p));
    return;
  }
  // observe the nearest ancestor that is not clipped by a wipe (a clipped element has no area yet)
  const frameOf = (p: HTMLElement) => {
    let el: HTMLElement | null = p.parentElement;
    while (el && el.hasAttribute('data-wipe')) el = el.parentElement;
    return el ?? p;
  };
  const byFrame = new Map(pics.map((p) => [frameOf(p), p]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        void promotePicture(byFrame.get(e.target as HTMLElement) ?? null);
      }
    },
    { rootMargin: '75% 150% 75% 150%' },
  );
  byFrame.forEach((_, frame) => io.observe(frame));
}

/* -------------------------------------------------------------- directions */

function initDirections() {
  const root = $('[data-dirs]');
  if (!root) return;
  const frames = $$('[data-dir-frame]', root);
  const items = $$('[data-dir]', root);
  const indexEl = $('[data-dir-index]', root);
  const specEl = $('[data-dir-spec]', root);
  let active = 0;

  const fetchFrame = (i: number) => {
    if (i < frames.length) void promotePicture(frames[i].querySelector<HTMLElement>('picture[data-deferred]'));
  };
  const activate = (i: number) => {
    fetchFrame(i);
    fetchFrame(i + 1);
    if (i === active) return;
    const prev = active;
    active = i;
    frames.forEach((f, k) => {
      f.classList.toggle('is-active', k === i);
      f.classList.toggle('is-prev', k === prev);
    });
    if (indexEl) indexEl.textContent = String(i + 1).padStart(2, '0');
    if (specEl) {
      specEl.classList.add('is-swapping');
      window.setTimeout(() => {
        specEl.textContent = items[i].dataset.spec ?? '';
        specEl.classList.remove('is-swapping');
      }, 300);
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) activate(items.indexOf(e.target as HTMLElement));
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  items.forEach((el) => io.observe(el));
}

/* ------------------------------------------------- pinned horizontal reel */

const hscroll = {
  enabled: false,
  section: null as HTMLElement | null,
  track: null as HTMLElement | null,
  viewport: null as HTMLElement | null,
  progress: null as HTMLElement | null,
  maxX: 0,
};

function initHorizontalProjects() {
  hscroll.section = $('[data-hscroll]');
  if (!hscroll.section) return;
  hscroll.track = $('[data-hscroll-track]', hscroll.section);
  hscroll.viewport = $('[data-hscroll-viewport]', hscroll.section);
  hscroll.progress = $('[data-hscroll-progress]', hscroll.section);
  reelNear = watchNear(hscroll.section, '25% 0px', () => updateScene());

  const measure = () => {
    const { section, track, viewport } = hscroll;
    if (!section || !track || !viewport) return;
    const want = finePointerWide.matches && !reduceMotion.matches;
    document.documentElement.classList.toggle('hscroll-on', want);
    hscroll.enabled = want;
    track.style.transform = '';
    if (want) {
      hscroll.maxX = Math.max(0, track.scrollWidth - viewport.clientWidth);
      section.style.height = `${window.innerHeight + hscroll.maxX}px`;
    } else {
      hscroll.maxX = 0;
      section.style.height = '';
    }
    updateScene();
  };

  measure();
  window.addEventListener('resize', debounce(measure, 150));
  finePointerWide.addEventListener('change', measure);
  reduceMotion.addEventListener('change', measure);
  window.addEventListener('load', measure);

}

/* --------------------------------------------- scroll-linked scene values */

/**
 * “Is this element near the screen?” answered by IntersectionObserver, so
 * scroll handlers never read geometry of far-away sections (which would force
 * the browser to lay out content it is deliberately skipping).
 */
function watchNear(el: Element | null, margin: string, onChange?: (near: boolean) => void) {
  const state = { near: false };
  if (!el) return state;
  new IntersectionObserver(([e]) => {
    if (state.near === e.isIntersecting) return;
    state.near = e.isIntersecting;
    onChange?.(state.near);
  }, { rootMargin: margin }).observe(el);
  return state;
}


let words: HTMLElement[] = [];
let wordsEl: HTMLElement | null = null;
let heroEl: HTMLElement | null = null;
let headerEl: HTMLElement | null = null;
let dockEl: HTMLElement | null = null;
let overEl: HTMLElement | null = null;
let lastY = 0;
const dockBlockers = new Set<Element>();
let wordsNear = { near: false };
let reelNear = { near: false };

function initScrollScene() {
  heroEl = $('[data-hero]');
  headerEl = $('[data-header]');
  wordsEl = $('[data-words]');
  words = wordsEl ? $$('.w', wordsEl) : [];
  dockEl = $('[data-dock]');
  // the dark area the header floats over (home hero or a dark page head)
  overEl = $('[data-header-over]');
  // the phone dock steps aside where a form / CTA / footer already offers the same actions
  const stops = $$('.contact__body, [data-dock-stop], footer');
  if (stops.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.isIntersecting ? dockBlockers.add(e.target) : dockBlockers.delete(e.target);
        updateScene();
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    stops.forEach((el) => io.observe(el));
  }
  wordsNear = watchNear(wordsEl, '50% 0px', () => updateScene());

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateScene();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  // First read after the first paint: reading geometry during module start-up
  // would force the browser's initial layout synchronously inside our script.
  requestAnimationFrame(() => requestAnimationFrame(updateScene));
}

function updateScene() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const motion = !reduceMotion.matches;

  // Hero hand-off
  if (heroEl && motion) heroEl.style.setProperty('--p', clamp(y / heroEl.offsetHeight).toFixed(4));

  // Header: transparent over the dark head, solid after; hides on scroll down
  const h = overEl ? overEl.offsetHeight : 0;
  if (headerEl) {
    const menuOpen = document.documentElement.classList.contains('menu-open');
    if (headerEl.dataset.tone === 'over') {
      // Home hero: transparent for the whole cinematic opening.
      // Inner dark heads: an ink bar as soon as content scrolls under the header.
      const state = y > h - 80 ? 'solid' : heroEl || y < 24 ? 'top' : 'ink';
      if (headerEl.dataset.state !== state) headerEl.dataset.state = state;
    }
    const hideFrom = Math.max(h * 0.6, 240);
    const goingDown = y > lastY + 2;
    const goingUp = y < lastY - 2;
    let hidden = headerEl.dataset.hidden === 'true';
    if (!menuOpen && goingDown && y > hideFrom) hidden = true;
    else if (goingUp || y < hideFrom) hidden = false;
    // write only on change: every attribute/class write invalidates style
    if ((headerEl.dataset.hidden === 'true') !== hidden) {
      headerEl.dataset.hidden = String(hidden);
      document.documentElement.classList.toggle('header-visible', !hidden);
    }
  }

  // Mobile dock
  if (dockEl) {
    const blocked = dockBlockers.size > 0;
    const show = y > Math.max(h * 0.75, 320) && !blocked;
    if (dockEl.classList.contains('is-visible') !== show) dockEl.classList.toggle('is-visible', show);
  }
  lastY = y;

  // Statement words light up
  if (wordsEl && words.length) {
    if (!motion) {
      words.forEach((w) => w.style.setProperty('--o', '1'));
    } else if (wordsNear.near) {
      // only touch the ~30 word spans while the statement is near the viewport
      const r = wordsEl.getBoundingClientRect();
      {
        const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3));
        const n = words.length;
        words.forEach((w, i) => {
          const o = 0.16 + 0.84 * clamp(p * n * 1.15 - i);
          w.style.setProperty('--o', o.toFixed(3));
        });
      }
    }
  }

  // Pinned reel
  if (hscroll.enabled && hscroll.section && hscroll.track && reelNear.near) {
    const r = hscroll.section.getBoundingClientRect();
    const dist = hscroll.section.offsetHeight - vh;
    const p = dist > 0 ? clamp(-r.top / dist) : 0;
    hscroll.track.style.transform = `translate3d(${(-p * hscroll.maxX).toFixed(1)}px,0,0)`;
    hscroll.progress?.style.setProperty('--hp', p.toFixed(4));
  }
}

/* ----------------------------------------------------------- process line */

/**
 * The process line follows scroll through a soft spring (lerp), so it draws
 * slowly and evenly even when the visitor scrolls in jumps. Each station
 * activates once the drawn line reaches its centre.
 */
function initProcess() {
  const root = $('[data-process]');
  if (!root) return;
  const steps = $$('[data-step]', root);
  const dots = $$('[data-step-dot]', root);
  if (!steps.length) return;

  const horizontalMq = window.matchMedia('(min-width: 1024px)');
  let thresholds: number[] = [];
  let span = 1; // track length in px
  let start = 0; // first dot centre, px from the container edge
  let target = 0;
  let current = 0;
  let raf = 0;

  const paint = () => {
    root.style.setProperty('--pp', current.toFixed(4));
    steps.forEach((step, i) => {
      const reached = i === 0 ? current > 0.004 : current >= thresholds[i] - 0.003;
      step.classList.toggle('is-active', reached);
    });
  };

  const measure = () => {
    const horizontal = horizontalMq.matches;
    const box = root.getBoundingClientRect();
    const centres = dots.map((d) => {
      const r = d.getBoundingClientRect();
      return horizontal ? r.left + r.width / 2 - box.left : r.top + r.height / 2 - box.top;
    });
    start = centres[0];
    const end = centres[centres.length - 1];
    span = Math.max(1, end - start);
    thresholds = centres.map((c) => (c - start) / span);
    const size = horizontal ? box.width : box.height;
    root.style.setProperty('--track-start', `${start}px`);
    root.style.setProperty('--track-end', `${size - end}px`);
  };

  const computeTarget = () => {
    const vh = window.innerHeight;
    const box = root.getBoundingClientRect();
    if (horizontalMq.matches) {
      // draws while the steps travel from 80% to 30% of the viewport height
      return clamp((vh * 0.8 - box.top) / (vh * 0.5));
    }
    // vertical: the tip of the line follows a reading line at 62% of the viewport
    return clamp((vh * 0.62 - (box.top + start)) / span);
  };

  const tick = () => {
    const diff = target - current;
    if (Math.abs(diff) < 0.0008) {
      current = target;
      paint();
      raf = 0;
      return;
    }
    current += diff * 0.055;
    paint();
    raf = requestAnimationFrame(tick);
  };

  const update = () => {
    if (reduceMotion.matches) {
      current = target = 1;
      paint();
      return;
    }
    target = computeTarget();
    if (!raf) raf = requestAnimationFrame(tick);
  };

  // measure lazily, the first time the block approaches the screen
  let measured = false;
  const near = watchNear(root, '50% 0px', (isNear) => {
    if (!isNear) return;
    if (!measured) {
      measure();
      measured = true;
    }
    update();
  });
  current = 0;
  paint();
  window.addEventListener('scroll', () => near.near && measured && update(), { passive: true });
  window.addEventListener(
    'resize',
    debounce(() => {
      if (!measured) return;
      measure();
      update();
    }, 150),
  );
  const remeasure = () => {
    if (!measured) return;
    measure();
    update();
  };
  horizontalMq.addEventListener('change', remeasure);
  reduceMotion.addEventListener('change', update);
  document.fonts?.ready.then(remeasure);
}

/* ------------------------------------------------------------ hash landing */

/**
 * Arriving from another page with a #fragment (e.g. /kontakty/?topic=…#request):
 * scroll once fonts and layout have settled, so the target is really on screen.
 */
function initHashLanding() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const go = () => target.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
  requestAnimationFrame(go);
  document.fonts?.ready.then(() => requestAnimationFrame(go));
}

/* ----------------------------------------------------------- page sub-nav */

function initSubNav() {
  const links = $$<HTMLAnchorElement>('[data-subnav-link]');
  if (!links.length) return;
  const map = new Map<Element, HTMLAnchorElement>();
  links.forEach((a) => {
    const el = document.getElementById(a.hash.slice(1));
    if (el) map.set(el, a);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((l) => l.removeAttribute('aria-current'));
        const a = map.get(e.target);
        if (a) {
          a.setAttribute('aria-current', 'true');
          a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
      }
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  map.forEach((_, el) => io.observe(el));
}

/* -------------------------------------------------------- project filter */

function initProjectFilter() {
  const root = $('[data-project-filter]');
  if (!root) return;
  const buttons = $$<HTMLButtonElement>('[data-filter]', root);
  const items = $$('[data-project-item]');
  const countEl = $('[data-project-count]');
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter!;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      items.forEach((item) => {
        const match = f === 'all' || (item.dataset.directions ?? '').split(' ').includes(f);
        item.hidden = !match;
        if (match) {
          // keep the staggered rhythm on the visible items only
          item.classList.toggle('is-offset', shown % 2 === 1);
          shown++;
          item.classList.remove('is-in');
          requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('is-in')));
        }
      });
      if (countEl) countEl.textContent = String(shown).padStart(2, '0');
    }),
  );
}

/* ------------------------------------------------------------- active nav */

function initActiveNav() {
  const links = $$<HTMLAnchorElement>('[data-nav-link]');
  const map = new Map<Element, HTMLAnchorElement>();
  links.forEach((a) => {
    const target = document.getElementById(a.hash.slice(1));
    if (target) map.set(target, a);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const a = map.get(e.target);
        if (!a) continue;
        if (e.isIntersecting) {
          links.forEach((l) => l.removeAttribute('aria-current'));
          a.setAttribute('aria-current', 'true');
        } else if (a.getAttribute('aria-current')) {
          a.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  map.forEach((_, section) => io.observe(section));
}

/* ------------------------------------------------------------- mobile menu */

function initMenu() {
  const menu = $('[data-menu]');
  const openBtn = $<HTMLButtonElement>('[data-menu-open]');
  const closeBtn = $<HTMLButtonElement>('[data-menu-close]');
  if (!menu || !openBtn || !closeBtn) return;
  const root = document.documentElement;

  const open = () => {
    menu.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => menu.classList.add('is-open'));
    });
    root.classList.add('menu-open');
    openBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus({ preventScroll: true });
  };
  const close = (restoreFocus = true) => {
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    openBtn.setAttribute('aria-expanded', 'false');
    const done = () => {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    };
    if (reduceMotion.matches) done();
    else window.setTimeout(done, 820);
    if (restoreFocus) openBtn.focus({ preventScroll: true });
  };

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', () => close());
  $$('[data-menu-link]', menu).forEach((a) => a.addEventListener('click', () => close(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) close();
  });
  // Keep focus inside the open menu
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = $$<HTMLElement>('a[href], button', menu);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

/* ------------------------------------------------------------ video dialog */

function initVideoDialog() {
  const dialog = $<HTMLDialogElement>('[data-video-dialog]');
  if (!dialog) return;
  const frame = $('[data-video-frame]', dialog)!;
  const tabs = $$<HTMLButtonElement>('[data-video-tab]', dialog);

  const load = (id: string) => {
    frame.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    iframe.title = 'OWT — YouTube';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    frame.append(iframe);
    tabs.forEach((t) => t.setAttribute('aria-current', String(t.dataset.videoTab === id)));
  };

  document.addEventListener('click', (e) => {
    const trigger = (e.target as Element).closest<HTMLElement>('[data-video-open]');
    if (!trigger) return;
    e.preventDefault();
    load(trigger.dataset.videoOpen!);
    dialog.showModal();
  });
  tabs.forEach((t) => t.addEventListener('click', () => load(t.dataset.videoTab!)));
  $('[data-video-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    frame.innerHTML = '';
  });
}

/* ---------------------------------------------------------- request modal */

/**
 * Every request CTA (links to #request, elements with data-topic-link) opens
 * the project request modal instead of scrolling to a form. Links stay real
 * links, so without JS — or with a modifier-click — they still work.
 */
function initRequestModal() {
  const dialog = $<HTMLDialogElement>('[data-request-modal]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const form = $<HTMLFormElement>('[data-rm-form]', dialog)!;
  const fieldsBox = $('[data-rm-fields]', dialog)!;
  const success = $('[data-rm-success]', dialog)!;
  const status = $('[data-rm-status]', dialog)!;
  const title = $('#rm-title', dialog)!;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const name = input('name') as HTMLInputElement;
  const phone = input('phone') as HTMLInputElement;
  const email = input('email') as HTMLInputElement;
  const topic = input('topic') as HTMLSelectElement;
  const task = input('task') as HTMLTextAreaElement;
  const fieldOf = (el: Element) => el.closest<HTMLElement>('[data-rm-field]')!;

  const checks: [HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, () => boolean][] = [
    [name, () => name.value.trim().length >= 2],
    [phone, () => isPhoneValid(phone.value)],
    [email, () => !email.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())],
    [topic, () => topic.value !== ''],
    [task, () => task.value.trim().length >= 3],
  ];
  const setState = (el: Element, ok: boolean) => {
    const field = fieldOf(el);
    field.classList.toggle('is-invalid', !ok);
    const err = field.querySelector<HTMLElement>('.err');
    if (err) err.hidden = ok;
    if (ok) el.removeAttribute('aria-invalid');
    else el.setAttribute('aria-invalid', 'true');
  };

  let opener: HTMLElement | null = null;
  const open = (topicId?: string | null) => {
    if (dialog.open) return;
    if (!success.hidden) {
      // a previous request was sent: start fresh
      form.reset();
      success.hidden = true;
      fieldsBox.hidden = false;
      checks.forEach(([el]) => setState(el, true));
      fieldOf(phone).classList.remove('is-valid');
    }
    if (topicId && [...topic.options].some((o) => o.value === topicId)) topic.value = topicId;
    dialog.classList.remove('is-closing');
    lockScroll(true);
    dialog.showModal();
    // keyboard / mouse users start typing at once; on touch screens don't pop the keyboard up
    if (finePointerWide.matches) name.focus();
    else title.focus();
  };
  const close = () => {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    const done = () => {
      dialog.classList.remove('is-closing');
      dialog.close();
    };
    if (reduceMotion.matches) return done();
    dialog.classList.add('is-closing');
    window.setTimeout(done, 240);
  };
  dialog.addEventListener('close', () => {
    lockScroll(false);
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  // Escape → animated close
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // click outside the panel (on the dialog / backdrop)
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  $$('[data-rm-close]', dialog).forEach((b) => b.addEventListener('click', close));

  // Scroll lock: html.modal-open stops wheel/keyboard scrolling; touch and wheel
  // on the backdrop are also cancelled explicitly (iOS ignores overflow on <html>).
  const panel = $('[data-rm-panel]', dialog)!;
  const blockOutside = (e: Event) => {
    if (dialog.open && !panel.contains(e.target as Node)) e.preventDefault();
  };
  // attached only while the modal is open: permanent non-passive listeners would slow every scroll
  const lockScroll = (on: boolean) => {
    const fn = on ? document.addEventListener : document.removeEventListener;
    fn.call(document, 'touchmove', blockOutside, { passive: false } as AddEventListenerOptions);
    fn.call(document, 'wheel', blockOutside, { passive: false } as AddEventListenerOptions);
    document.documentElement.classList.toggle('modal-open', on);
  };

  // Triggers — capture phase, so other handlers see the click as handled
  document.addEventListener(
    'click',
    (e) => {
      const me = e as MouseEvent;
      if (me.defaultPrevented || me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
      const el = (e.target as Element).closest<HTMLElement>('a[href*="#request"], [data-topic-link]');
      if (!el || dialog.contains(el)) return;
      let topicId = el.dataset.topicLink || null;
      if (!topicId && el instanceof HTMLAnchorElement) topicId = new URL(el.href).searchParams.get('topic');
      e.preventDefault();
      opener = el;
      open(topicId);
    },
    true,
  );

  // live feedback
  phone.addEventListener('input', () => {
    const atEnd = phone.selectionStart === phone.value.length;
    const next = formatPhone(phone.value);
    if (atEnd && next !== phone.value) phone.value = next;
    const ok = isPhoneValid(phone.value);
    fieldOf(phone).classList.toggle('is-valid', ok);
    if (ok && fieldOf(phone).classList.contains('is-invalid')) setState(phone, true);
  });
  checks.forEach(([el, valid]) => {
    if (el === phone) return;
    const ev = el instanceof HTMLSelectElement ? 'change' : 'input';
    el.addEventListener(ev, () => {
      if (fieldOf(el).classList.contains('is-invalid') && valid()) setState(el, true);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let firstBad: HTMLElement | null = null;
    const errors: string[] = [];
    for (const [el, valid] of checks) {
      const ok = valid();
      setState(el, ok);
      if (!ok) {
        firstBad ??= el;
        errors.push(fieldOf(el).querySelector('.err')?.textContent ?? '');
      }
    }
    if (firstBad) {
      firstBad.focus();
      status.textContent = errors.join('. ');
      return;
    }
    // Interface-only stage: nothing is sent yet.
    form.classList.add('is-sending');
    window.setTimeout(() => {
      form.classList.remove('is-sending');
      fieldsBox.hidden = true;
      success.hidden = false;
      success.focus();
      status.textContent = success.querySelector('p')?.textContent ?? '';
    }, 600);
  });
}

/* ------------------------------------------------------------ phone input */

const digitsOf = (v: string) => v.replace(/\D/g, '');

/** Formats a Ukrainian number as +38 0XX XXX XX XX; foreign numbers are left as typed. */
function formatPhone(raw: string) {
  if (raw.trim().startsWith('+') && !raw.trim().startsWith('+3')) return raw;
  let d = digitsOf(raw);
  if (!d) return '';
  if (d.startsWith('380')) d = d.slice(2);
  else if (d.startsWith('38')) d = d.slice(2);
  else if (!d.startsWith('0')) d = `0${d}`;
  d = d.slice(0, 10);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  return `+38 ${parts.join(' ')}`;
}

function isPhoneValid(value: string) {
  const v = value.trim();
  const d = digitsOf(v);
  if (v.startsWith('+38')) return d.length === 12 && d[2] === '0';
  return d.length >= 10 && d.length <= 15;
}

/* -------------------------------------------------------------------- form */

function initForm() {
  const form = $<HTMLFormElement>('[data-form]');
  if (!form) return;
  const fields = $('[data-form-fields]', form)!;
  const success = $('[data-form-success]', form)!;
  const status = $('[data-form-status]', form)!;
  const phone = $<HTMLInputElement>('input[name="phone"]', form)!;
  const errTopic = $('[data-error="topic"]', form)!;
  const errPhone = $('[data-error="phone"]', form)!;
  const phoneField = $('[data-field="phone"]', form)!;
  const topicGroup = $('[data-field="topic"]', form)!;

  // Contextual CTAs pre-select the topic
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return; // handled by the request modal
    const link = (e.target as Element).closest<HTMLElement>('[data-topic-link]');
    if (!link) return;
    const topic = link.dataset.topicLink;
    if (topic) {
      const radio = $<HTMLInputElement>(`input[name="topic"][value="${topic}"]`, form);
      if (radio) {
        radio.checked = true;
        errTopic.hidden = true;
        topicGroup.classList.remove('is-invalid');
      }
    }
    if (finePointerWide.matches) window.setTimeout(() => phone.focus({ preventScroll: true }), 900);
  });

  // Arriving from another page with ?topic=… pre-selects the subject
  const fromUrl = new URLSearchParams(window.location.search).get('topic');
  if (fromUrl) {
    const radio = $<HTMLInputElement>(`input[name="topic"][value="${CSS.escape(fromUrl)}"]`, form);
    if (radio) radio.checked = true;
  }

  const phoneValid = () => isPhoneValid(phone.value);

  phone.addEventListener('input', () => {
    const atEnd = phone.selectionStart === phone.value.length;
    const next = formatPhone(phone.value);
    if (atEnd && next !== phone.value) phone.value = next;
    phoneField.classList.toggle('is-valid', phoneValid());
    if (!errPhone.hidden && phoneValid()) {
      errPhone.hidden = true;
      phoneField.classList.remove('is-invalid');
      phone.removeAttribute('aria-invalid');
    }
  });
  form.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).name === 'topic') {
      errTopic.hidden = true;
      topicGroup.classList.remove('is-invalid');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = form.querySelector<HTMLInputElement>('input[name="topic"]:checked');
    const okTopic = Boolean(topic);
    const okPhone = phoneValid();
    errTopic.hidden = okTopic;
    topicGroup.classList.toggle('is-invalid', !okTopic);
    errPhone.hidden = okPhone;
    phoneField.classList.toggle('is-invalid', !okPhone);
    if (!okPhone) phone.setAttribute('aria-invalid', 'true');
    if (!okTopic || !okPhone) {
      (okTopic ? phone : form.querySelector<HTMLInputElement>('input[name="topic"]'))?.focus();
      status.textContent = [!okTopic && errTopic.textContent, !okPhone && errPhone.textContent].filter(Boolean).join('. ');
      return;
    }

    // Interface-only stage: no data leaves the browser yet.
    form.classList.add('is-sending');
    window.setTimeout(() => {
      form.classList.remove('is-sending');
      fields.hidden = true;
      success.hidden = false;
      success.focus();
      status.textContent = success.querySelector('p')?.textContent ?? '';
    }, 700);
  });

  $('[data-form-reset]', form)?.addEventListener('click', () => {
    form.reset();
    phoneField.classList.remove('is-valid', 'is-invalid');
    success.hidden = true;
    fields.hidden = false;
    phone.focus();
  });
}

/* ----------------------------------------------------------------- helpers */

function debounce<T extends (...a: never[]) => void>(fn: T, ms: number) {
  let t = 0;
  return (...args: Parameters<T>) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}
