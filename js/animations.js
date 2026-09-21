// Motion layer: hero particle field, scroll reveals, text scramble, typewriter,
// skill ring count-up and card tilt. Everything degrades to static content when
// the user prefers reduced motion or this script doesn't run.
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  root.classList.add('anim-ready');

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Set by js/boot.js on the main page; resolves once the boot screen lifts.
  const bootReady = window.bootReady || Promise.resolve();

  /* ---------- Scroll progress + hero parallax ---------- */
  const heroLayout = document.querySelector('.hero-layout');
  // On detail pages the strip shows how far the article itself has been read.
  const postArticle = document.querySelector('.post-article');
  let scrollQueued = false;

  function onScroll() {
    scrollQueued = false;
    let progress = 1;
    if (postArticle) {
      const rect = postArticle.getBoundingClientRect();
      progress = (window.innerHeight - rect.top) / rect.height;
    } else {
      const max = root.scrollHeight - window.innerHeight;
      if (max > 0) progress = window.scrollY / max;
    }
    root.style.setProperty('--scroll-progress', Math.min(Math.max(progress, 0), 1).toFixed(4));

    if (heroLayout && !reduceMotion) {
      const y = Math.min(window.scrollY, 900);
      heroLayout.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
      heroLayout.style.opacity = Math.max(0, 1 - y / 650).toFixed(3);
    }
  }

  window.addEventListener('scroll', () => {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Text scramble ("decrypt") ---------- */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#$01';

  function scramble(el, duration = 900, fontWaited = false) {
    if (reduceMotion || el.children.length || el.dataset.scrambling) return;
    const target = el.textContent.trim().replace(/\s+/g, ' ');
    if (!target) return;

    // The cell widths below are measured once. Measured in the fallback font, they
    // would re-wrap the heading as soon as the web font arrives (a big layout shift),
    // so wait for the heading's own font first.
    const cs = getComputedStyle(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (!fontWaited && !document.fonts.check(font, target)) {
      const retry = () => scramble(el, duration, true);
      document.fonts.load(font, target).then(retry, retry);
      return;
    }

    el.dataset.scrambling = '1';

    // Random glyphs are wider/narrower than the real letters, which would re-wrap
    // multi-line headings on every frame. So every character gets its own cell,
    // pinned to the width it has in the real text, and words never break apart.
    const cells = [];
    el.textContent = '';
    target.split(' ').forEach((word, w) => {
      if (w) el.append(' ');
      const wordEl = document.createElement('span');
      wordEl.style.whiteSpace = 'nowrap';
      for (const ch of word) {
        const cell = document.createElement('span');
        cell.style.display = 'inline-block';
        cell.textContent = ch;
        wordEl.append(cell);
        cells.push(cell);
      }
      el.append(wordEl);
    });
    const widths = cells.map((cell) => cell.getBoundingClientRect().width);
    cells.forEach((cell, i) => {
      cell.style.width = `${widths[i]}px`;
    });

    const start = performance.now();
    let written = null;

    const frame = (now) => {
      // Someone else (e.g. the language toggle) replaced the text: stop quietly.
      if (written !== null && el.textContent !== written) {
        delete el.dataset.scrambling;
        return;
      }
      const progress = Math.min((now - start) / duration, 1);
      const settled = Math.floor(progress * target.length);
      let out = '';
      let k = 0;
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === ' ') {
          out += ' ';
          continue;
        }
        const glyph = i < settled ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        cells[k++].textContent = glyph;
        out += glyph;
      }
      written = out;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = target;
        delete el.dataset.scrambling;
      }
    };
    requestAnimationFrame(frame);
  }

  const title = document.querySelector('header h1');
  if (title) {
    bootReady.then(() => scramble(title, 1100));
    if (finePointer) title.addEventListener('mouseenter', () => scramble(title, 600));
  }

  /* ---------- Hero typewriter ---------- */
  const typed = document.querySelector('.hero-typed');
  const rolesSource = document.getElementById('hero-roles');

  if (typed && rolesSource) {
    const roles = () => rolesSource.textContent.split('|').map((s) => s.trim()).filter(Boolean);

    (async () => {
      await bootReady;
      await sleep(900);
      for (let i = 0; ; i++) {
        const list = roles();
        const word = list[i % list.length];
        if (reduceMotion) {
          typed.textContent = word;
          await sleep(2600);
          continue;
        }
        for (let n = 1; n <= word.length; n++) {
          typed.textContent = word.slice(0, n);
          await sleep(45 + Math.random() * 70);
        }
        await sleep(1900);
        for (let n = word.length - 1; n >= 0; n--) {
          typed.textContent = word.slice(0, n);
          await sleep(25);
        }
        await sleep(350);
      }
    })();
  }

  /* ---------- Particle / code-glyph field on dark surfaces ---------- */
  const TOKENS = ['{ }', '</>', '=>', '&&', '0x1F', 'fn()', '[ ]', '::', '//', '#!', '$_', '!=', 'git', 'ssh'];

  function particleField(surface, density) {
    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    surface.prepend(canvas);

    const ctx = canvas.getContext('2d');
    const pointer = { x: -1e4, y: -1e4, active: false };
    let width = 0;
    let height = 0;
    let nodes = [];
    let colors = ['#2dd4cb', '#a78bfa'];
    let visible = false;
    let rafId = 0;

    // Read from the surface itself: the light theme overrides the glow colors on .glow-surface
    function readColors() {
      const styles = getComputedStyle(surface);
      colors = [
        styles.getPropertyValue('--hero-glow-1').trim() || colors[0],
        styles.getPropertyValue('--hero-glow-2').trim() || colors[1],
      ];
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = surface.clientWidth;
      height = surface.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColors();

      const count = Math.round(Math.min(95, (width * height) / density));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.4 + 0.7,
        color: i % 3 === 0 ? 1 : 0,
        token: i % 7 === 0 ? TOKENS[(Math.random() * TOKENS.length) | 0] : null,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const LINK = 125;
      const REACH = 170;

      for (const n of nodes) {
        if (pointer.active) {
          const dx = n.x - pointer.x;
          const dy = n.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REACH && dist > 0.1) {
            const push = (1 - dist / REACH) * 0.9;
            n.x += (dx / dist) * push;
            n.y += (dy / dist) * push;
          }
        }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK) {
            ctx.globalAlpha = (1 - dist / LINK) * 0.28;
            ctx.strokeStyle = colors[a.color];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (pointer.active) {
          const dist = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (dist < REACH + 60) {
            ctx.globalAlpha = (1 - dist / (REACH + 60)) * 0.55;
            ctx.strokeStyle = colors[0];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const n of nodes) {
        ctx.fillStyle = colors[n.color];
        if (n.token) {
          ctx.globalAlpha = 0.42;
          ctx.fillText(n.token, n.x, n.y);
        } else {
          ctx.globalAlpha = 0.75;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (pointer.active) {
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
        glow.addColorStop(0, colors[0]);
        glow.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = glow;
        ctx.fillRect(pointer.x - 220, pointer.y - 220, 440, 440);
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function setRunning(run) {
      cancelAnimationFrame(rafId);
      if (run) rafId = requestAnimationFrame(loop);
    }

    surface.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    surface.addEventListener('pointerleave', () => {
      pointer.active = false;
    });

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setRunning(visible && !document.hidden);
    }).observe(surface);

    document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));
    new ResizeObserver(resize).observe(surface);
    new MutationObserver(readColors).observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    resize();
  }

  if (!reduceMotion) {
    document.querySelectorAll('.glow-surface').forEach((surface) => {
      particleField(surface, surface.tagName === 'FOOTER' ? 22000 : 13000);
    });
  }

  /* ---------- Skill ring count-up ---------- */
  function countUp(el, target, delay) {
    if (reduceMotion) return;
    const duration = 1400;
    const start = performance.now() + delay;
    el.textContent = '0%';
    const tick = (now) => {
      const p = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = `${Math.round(target * eased)}%`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 3D tilt + cursor spotlight ---------- */
  function attachTilt(el, strength = 7) {
    if (!finePointer || reduceMotion || el.dataset.tilt) return;
    el.dataset.tilt = '1';
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      el.style.transform =
        `perspective(900px) rotateX(${((0.5 - y) * strength).toFixed(2)}deg) ` +
        `rotateY(${((x - 0.5) * strength).toFixed(2)}deg) translateY(-4px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  }

  function attachMagnet(el) {
    if (!finePointer || reduceMotion) return;
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  }

  document.querySelectorAll('.blog-post').forEach((el) => attachTilt(el));
  document.querySelectorAll('.post-next').forEach((el) => attachTilt(el, 4));
  document.querySelectorAll('.hero-media').forEach((el) => attachTilt(el, 12));
  document.querySelectorAll('.hero-cta .button, .contact-list a, .contact-list button').forEach(attachMagnet);

  /* ---------- Scroll reveals ---------- */
  const REVEAL = [
    ['.main-sections', 'left'],
    ['.section-intro', 'up'],
    ['.project-filters', 'up'],
    ['.about-panel', 'left'],
    ['.about-me p', 'up'],
    ['.skill-group h3', 'up'],
    ['.skill-ring-tile', 'pop'],
    ['.project-card', 'up'],
    ['#load-more-btn', 'up'],
    ['.blog-post', 'up'],
    ['footer h2', 'up'],
    ['#contact-intro', 'up'],
    ['.contact-list li', 'pop'],
    ['.post-fact', 'pop'],
    ['article > :not(section)', 'up'],
    ['article section > *', 'up'],
    ['.post-nav > *', 'up'],
  ];

  function onReveal(el) {
    const delay = parseInt(el.style.getPropertyValue('--reveal-delay'), 10) || 0;

    if (el.matches('.main-sections, footer h2, article h2')) {
      setTimeout(() => scramble(el, 700), delay);
    }

    if (el.matches('.skill-ring-tile')) {
      const pct = el.querySelector('.skill-ring-pct');
      const value = parseFloat(getComputedStyle(el).getPropertyValue('--pct'));
      if (pct && !Number.isNaN(value)) countUp(pct, value, delay);
    }

    el.querySelectorAll('.badge').forEach((badge, i) => badge.style.setProperty('--i', i));

    // Once played, retire the reveal so re-inserting the element (e.g. project filter) doesn't replay it.
    setTimeout(() => el.setAttribute('data-reveal', 'done'), delay + 1600);
  }

  const observer = new IntersectionObserver((entries) => {
    let batch = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);
      el.style.setProperty('--reveal-delay', `${Math.min(batch++, 10) * 70}ms`);
      el.classList.add('is-visible');
      onReveal(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  function registerReveals(scope = document) {
    REVEAL.forEach(([selector, variant]) => {
      scope.querySelectorAll(selector).forEach((el) => {
        if (el.hasAttribute('data-reveal') || el.closest('header')) return;
        el.setAttribute('data-reveal', variant);
        observer.observe(el);
        if (el.matches('.project-card')) attachTilt(el);
      });
    });
  }

  registerReveals();

  // Project cards are rendered asynchronously (and re-rendered on language toggle).
  const projectsGrid = document.getElementById('projects-grid');
  if (projectsGrid) {
    new MutationObserver(() => registerReveals(projectsGrid.parentElement)).observe(
      projectsGrid.parentElement,
      { childList: true, subtree: true },
    );
  }

  /* ---------- A little something for the devtools crowd ---------- */
  console.log(
    '%c<willi-mue />',
    'font: 700 22px "JetBrains Mono", monospace; color: #2dd4cb; text-shadow: 0 0 12px #2dd4cb66;',
  );
  console.log(
    '%cNeugierig? / Curious? → https://github.com/Willi-mue',
    'font: 500 12px "JetBrains Mono", monospace; color: #a78bfa;',
  );
})();
