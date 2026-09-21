// Detail-page extras for posts/*.html: header badge stagger and a
// table of contents with scroll spy. Does nothing on pages without .post-article.
(() => {
  const article = document.querySelector('.post-article');
  if (!article) return;

  /* ---------- Header badges pop in one after another ---------- */
  document.querySelectorAll('.post-badges .badge').forEach((badge, i) => badge.style.setProperty('--i', i));

  /* ---------- Table of contents ---------- */
  const list = document.querySelector('.post-toc ol');
  const headings = [...article.querySelectorAll('section > h2')];
  if (!list || !headings.length) return;

  const sections = headings.map((h2) => h2.parentElement);
  const links = headings.map((h2, i) => {
    const section = sections[i];
    if (!section.id) section.id = `section-${i + 1}`;

    const a = document.createElement('a');
    a.href = `#${section.id}`;
    a.textContent = h2.textContent.trim();
    // Same key as the heading, so the language toggle updates the TOC as well.
    if (h2.dataset.i18n) {
      a.dataset.i18n = h2.dataset.i18n;
      if (h2.hasAttribute('data-i18n-html')) a.setAttribute('data-i18n-html', '');
    }

    const li = document.createElement('li');
    li.append(a);
    list.append(li);
    return a;
  });

  // Active entry = last section whose top has passed the upper third of the viewport.
  let queued = false;
  function spy() {
    queued = false;
    const line = window.innerHeight * 0.35;
    let active = 0;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top < line) active = i;
    });
    links.forEach((a, i) => a.classList.toggle('is-active', i === active));
  }

  window.addEventListener('scroll', () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(spy);
    }
  }, { passive: true });
  window.addEventListener('resize', spy);
  spy();
})();
