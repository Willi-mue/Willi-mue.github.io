// Fake boot log shown once per browser session before the page appears.
// Loaded as the first element in <body> so the overlay exists before first paint.
// Other scripts wait on `window.bootReady` before starting their intro animations.
(() => {
  const LINES = [
    ['', 'WILLI-OS 2.0.0 (tty1)'],
    ['OK', 'Mounting /home/willi'],
    ['OK', 'Starting docker.service'],
    ['OK', 'Starting portfolio.service'],
    ['OK', 'Establishing secure tunnel'],
    ['OK', 'Loading skills.db'],
    ['OK', 'Syncing github.com/Willi-mue'],
    ['OK', 'Reached target Portfolio.'],
  ];

  // Timing (ms): pause before the first line, gap between lines, hold after the last line.
  const START_DELAY = 200;
  const LINE_GAP = 260;
  const END_HOLD = 1400;

  let seen = false;
  try {
    seen = sessionStorage.getItem('booted') === '1';
    sessionStorage.setItem('booted', '1');
  } catch (err) {
    // Storage blocked: just show the boot screen every time.
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || reduceMotion || window.location.hash) {
    window.bootReady = Promise.resolve();
    return;
  }

  const root = document.documentElement;
  root.classList.add('booting');

  const screen = document.createElement('div');
  screen.id = 'boot-screen';
  screen.setAttribute('aria-hidden', 'true');
  screen.innerHTML = '<pre class="boot-log"></pre><div class="boot-skip">press any key to skip</div>';
  document.body.prepend(screen);
  const log = screen.querySelector('.boot-log');

  let finished = false;
  let resolveBoot;
  window.bootReady = new Promise((resolve) => {
    resolveBoot = resolve;
  });

  function finish() {
    if (finished) return;
    finished = true;
    window.removeEventListener('keydown', finish);
    screen.removeEventListener('pointerdown', finish);
    screen.classList.add('boot-done');
    root.classList.remove('booting');
    resolveBoot();
    setTimeout(() => screen.remove(), 700);
  }

  window.addEventListener('keydown', finish);
  screen.addEventListener('pointerdown', finish);

  LINES.forEach(([status, text], i) => {
    setTimeout(() => {
      if (finished) return;
      const line = document.createElement('div');
      line.className = 'boot-line';
      if (status) {
        const tag = document.createElement('span');
        tag.className = 'boot-ok';
        tag.textContent = `[  ${status}  ]`;
        line.append(tag, ` ${text}`);
      } else {
        line.className += ' boot-title';
        line.textContent = text;
      }
      log.appendChild(line);
    }, START_DELAY + i * LINE_GAP);
  });

  setTimeout(finish, START_DELAY + LINES.length * LINE_GAP + END_HOLD);
})();
