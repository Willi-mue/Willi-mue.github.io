const btnTheme = document.getElementById('toggle-theme');

function applyTheme(theme) {
  body.setAttribute('data-theme', theme);
  btnTheme.innerHTML = window.Icons.svg(theme === 'dark' ? 'sun' : 'moon');
  localStorage.setItem('theme', theme);
}

// Switches theme with a circular wipe that grows out of `origin` (viewport coords).
// Falls back to an instant switch without View Transitions or with reduced motion.
function setTheme(theme, origin) {
  if (theme !== 'dark' && theme !== 'light') return;
  if (theme === body.getAttribute('data-theme')) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduceMotion) {
    applyTheme(theme);
    return;
  }

  const x = origin ? origin.x : window.innerWidth / 2;
  const y = origin ? origin.y : window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(() => applyTheme(theme));
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
}

window.setTheme = setTheme;

applyTheme(localStorage.getItem('theme') || 'light');

btnTheme.addEventListener('click', () => {
  const rect = btnTheme.getBoundingClientRect();
  const next = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  setTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
});
