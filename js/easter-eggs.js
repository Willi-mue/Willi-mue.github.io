// Matrix rain + toast, triggered from the terminal (`matrix`, `sudo hire willi`).
window.EasterEggs = (() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>{}[]=/*+$#';
  let running = null;

  function toast(text, icon = '🏆') {
    const el = document.createElement('div');
    el.className = 'egg-toast';
    el.setAttribute('role', 'status');
    const badge = document.createElement('span');
    badge.className = 'egg-toast-icon';
    badge.textContent = icon;
    const label = document.createElement('span');
    label.textContent = text;
    el.append(badge, label);
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 500);
    }, 3800);
  }

  function matrix(duration = 7000) {
    if (running) return running;

    const canvas = document.createElement('canvas');
    canvas.className = 'matrix-rain';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const size = 16;
    let columns = [];
    let rafId = 0;
    let last = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Array.from({ length: Math.ceil(canvas.width / size) }, () => Math.random() * -60);
    }

    function draw(now) {
      rafId = requestAnimationFrame(draw);
      if (now - last < 45) return;
      last = now;
      ctx.fillStyle = 'rgba(5, 8, 15, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `600 ${size}px "JetBrains Mono", monospace`;
      columns.forEach((y, i) => {
        const ch = CHARS[(Math.random() * CHARS.length) | 0];
        ctx.fillStyle = Math.random() > 0.96 ? '#f6f8fc' : i % 5 === 0 ? '#a78bfa' : '#2dd4cb';
        ctx.fillText(ch, i * size, y * size);
        columns[i] = y * size > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
      });
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(() => canvas.classList.add('show'));
    if (!reduceMotion) rafId = requestAnimationFrame(draw);

    running = new Promise((resolve) => {
      const stop = () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', onKey);
        canvas.removeEventListener('pointerdown', stop);
        canvas.classList.remove('show');
        setTimeout(() => {
          cancelAnimationFrame(rafId);
          window.removeEventListener('resize', resize);
          canvas.remove();
          running = null;
          resolve();
        }, 600);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') stop();
      };
      const timer = setTimeout(stop, duration);
      window.addEventListener('keydown', onKey);
      canvas.addEventListener('pointerdown', stop);
    });
    return running;
  }

  return { matrix, toast };
})();
