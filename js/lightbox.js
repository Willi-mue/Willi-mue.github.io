// Click-to-enlarge for images inside articles (blog posts).
(() => {
  const images = [...document.querySelectorAll('article img')];
  if (!images.length) return;

  const closeLabel = () => (document.documentElement.lang === 'en' ? 'Close' : 'Schließen');

  let overlay, viewImg, caption, prevBtn, nextBtn, closeBtn;
  let index = 0;
  let opener = null;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.hidden = true;

    viewImg = document.createElement('img');
    viewImg.className = 'lightbox-img';

    caption = document.createElement('p');
    caption.className = 'lightbox-caption';

    closeBtn = button('lightbox-btn lightbox-close', '×', closeLabel(), close);
    prevBtn = button('lightbox-btn lightbox-prev', '‹', '←', () => step(-1));
    nextBtn = button('lightbox-btn lightbox-next', '›', '→', () => step(1));

    overlay.append(viewImg, caption, closeBtn, prevBtn, nextBtn);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === viewImg) close();
    });
    document.body.appendChild(overlay);
  }

  function button(cls, text, label, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', onClick);
    return b;
  }

  function show(i) {
    index = (i + images.length) % images.length;
    const img = images[index];
    viewImg.src = img.currentSrc || img.src;
    viewImg.alt = img.alt;
    caption.textContent = images.length > 1 ? `${img.alt} (${index + 1}/${images.length})` : img.alt;
  }

  function step(dir) {
    if (images.length > 1) show(index + dir);
  }

  function open(i) {
    if (!overlay) build();
    opener = document.activeElement;
    closeBtn.setAttribute('aria-label', closeLabel());
    prevBtn.hidden = nextBtn.hidden = images.length < 2;
    show(i);
    overlay.hidden = false;
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(() => overlay.classList.add('show'));
    closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    overlay.classList.remove('show');
    overlay.hidden = true;
    document.body.classList.remove('lightbox-open');
    document.removeEventListener('keydown', onKey);
    if (opener && opener.focus) opener.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') {
      // Focus trap: only the visible buttons are reachable.
      const focusable = [closeBtn, prevBtn, nextBtn].filter((b) => !b.hidden);
      const pos = focusable.indexOf(document.activeElement);
      const next = (pos + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      focusable[next].focus();
      e.preventDefault();
    }
  }

  images.forEach((img, i) => {
    img.classList.add('zoomable');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.addEventListener('click', () => open(i));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(i);
      }
    });
  });
})();
