let loadedProjectsCount = 0;
const projectsPerLoad = 6;
let allProjects = [];
let activeFilter = null;
// Cards are reused across filter changes so images don't reload and FLIP can track them.
let cardCache = new Map();
let renderState = { currentLang: 'de', translations: {} };

// Build/tooling "languages" GitHub reports that aren't worth a filter chip.
const FILTER_IGNORE = ['Makefile', 'Batchfile', 'CMake', 'Dockerfile', 'Procfile'];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function filteredProjects() {
  if (!activeFilter) return allProjects;
  return allProjects.filter(p => p.languages && Object.prototype.hasOwnProperty.call(p.languages, activeFilter));
}

function createCard(project) {
  const { currentLang, translations } = renderState;
  const card = document.createElement('article');
  card.className = 'project-card';
  card.dataset.key = project.name;

  if (project.image) {
    const media = document.createElement('div');
    media.className = 'project-media';
    const img = document.createElement('img');
    img.src = project.image;
    img.alt = `${project.name} Bild`;
    img.loading = 'lazy';
    media.appendChild(img);
    card.appendChild(media);
  }

  const body = document.createElement('div');
  body.className = 'project-body';

  const title = document.createElement('h2');
  title.textContent = project.name;
  body.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'project-desc';
  if (currentLang === 'de') {
    desc.textContent = project.translation || 'Keine Beschreibung verfügbar.';
  } else {
    desc.textContent = project.description || 'No description available.';
  }
  body.appendChild(desc);

  const badgeWrapper = document.createElement('div');
  badgeWrapper.className = 'badge-wrapper';

  if (project.languages && typeof project.languages === 'object') {
    const sortedLanguages = Object.entries(project.languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);

    sortedLanguages.forEach(lang => {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = lang;
      badgeWrapper.appendChild(badge);
    });

    if (sortedLanguages.length) {
      card.style.setProperty('--tag-color', BadgeUtils.colorFor(sortedLanguages[0]));
    }
  }

  body.appendChild(badgeWrapper);

  const link = document.createElement('a');
  link.href = project.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'project-link';
  link.innerHTML = `<span class="icon" data-icon="arrow-square-out"></span><span>${translations['project-github-link']}</span>`;
  body.appendChild(link);

  card.appendChild(body);
  return card;
}

function cardFor(project) {
  if (!cardCache.has(project.name)) cardCache.set(project.name, createCard(project));
  return cardCache.get(project.name);
}

function updateLoadMoreButton(container, total) {
  const loadMoreBtnId = 'load-more-btn';
  let loadMoreBtn = document.getElementById(loadMoreBtnId);

  if (loadedProjectsCount < total) {
    if (!loadMoreBtn) {
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.id = loadMoreBtnId;
      loadMoreBtn.classList.add('button');
      loadMoreBtn.addEventListener('click', () => loadProjects(renderState.currentLang, true, renderState.translations));
      container.after(loadMoreBtn);
    }
    loadMoreBtn.textContent = renderState.currentLang === 'de' ? 'Mehr laden' : 'Load more';
  } else if (loadMoreBtn) {
    loadMoreBtn.remove();
  }
}

function renderFilters() {
  const bar = document.getElementById('project-filters');
  if (!bar) return;

  const counts = {};
  allProjects.forEach(p => Object.keys(p.languages || {}).forEach(lang => {
    if (!FILTER_IGNORE.includes(lang)) counts[lang] = (counts[lang] || 0) + 1;
  }));
  const langs = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  if (activeFilter && !counts[activeFilter]) activeFilter = null;

  const allLabel = renderState.translations['main-page.filter-all'] || (renderState.currentLang === 'de' ? 'Alle' : 'All');
  const chips = [{ lang: null, label: allLabel, count: allProjects.length }]
    .concat(langs.map(lang => ({ lang, label: lang, count: counts[lang] })));

  bar.replaceChildren(...chips.map(({ lang, label, count }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.dataset.lang = lang || '';
    chip.setAttribute('aria-pressed', String(lang === activeFilter));
    if (lang) {
      chip.style.setProperty('--tag-color', BadgeUtils.colorFor(lang));
      chip.innerHTML = window.Icons.svg(BadgeUtils.getLanguageIconKey(lang));
    }
    const text = document.createElement('span');
    text.textContent = label;
    const num = document.createElement('span');
    num.className = 'filter-count';
    num.textContent = count;
    chip.append(text, num);
    chip.addEventListener('click', () => applyFilter(lang));
    return chip;
  }));
}

// Re-renders the grid for the active filter and animates it FLIP-style:
// leaving cards shrink out, staying cards glide to their new slot, returning cards pop in.
async function applyFilter(lang) {
  if (lang === activeFilter) return;
  activeFilter = lang;
  document.querySelectorAll('#project-filters .filter-chip').forEach(chip => {
    chip.setAttribute('aria-pressed', String(chip.dataset.lang === (lang || '')));
  });

  const container = document.getElementById('projects-grid');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const before = new Map([...container.children].map(el => [el, el.getBoundingClientRect()]));

  const list = filteredProjects();
  const count = Math.min(list.length, Math.max(projectsPerLoad, loadedProjectsCount));
  const next = list.slice(0, count).map(cardFor);
  const nextSet = new Set(next);

  const leaving = [...container.children].filter(el => !nextSet.has(el));
  if (!reduceMotion && leaving.length) {
    await Promise.all(leaving.map(el => el.animate(
      [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.85)' }],
      { duration: 200, easing: 'ease-in', fill: 'forwards' },
    ).finished));
  }
  leaving.forEach(el => el.getAnimations().forEach(a => a.cancel()));

  container.replaceChildren(...next);
  loadedProjectsCount = count;
  updateLoadMoreButton(container, list.length);
  BadgeUtils.applyBadgeStyles(container);
  window.Icons.apply(container);

  if (reduceMotion) return;
  next.forEach((el, i) => {
    const old = before.get(el);
    if (old && !leaving.includes(el)) {
      const now = el.getBoundingClientRect();
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      if (dx || dy) {
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
      }
    } else if (el.classList.contains('is-visible')) {
      // Brand-new cards are picked up by the scroll-reveal in animations.js instead.
      el.animate(
        [{ opacity: 0, transform: 'translateY(20px) scale(0.9)' }, { opacity: 1, transform: 'none' }],
        { duration: 500, delay: i * 50, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
      );
    }
  });
}

async function loadProjects(currentLang = 'de', loadMore = false, translations = {}) {
  try {
    const container = document.getElementById('projects-grid');
    renderState = { currentLang, translations };

    if (!loadMore) {
      // Erster Aufruf (oder Sprachwechsel): Projekte laden und zurücksetzen
      const response = await fetch('data/projects_Willi-Mue.json');
      allProjects = await response.json();

      shuffleArray(allProjects); // Projekte mischen

      loadedProjectsCount = 0;
      cardCache = new Map();
      container.innerHTML = '';
      renderFilters();
    }

    const list = filteredProjects();
    const nextProjects = list.slice(loadedProjectsCount, loadedProjectsCount + projectsPerLoad);
    nextProjects.forEach(project => container.appendChild(cardFor(project)));
    loadedProjectsCount += nextProjects.length;

    updateLoadMoreButton(container, list.length);
    BadgeUtils.applyBadgeStyles(container);
    window.Icons.apply(container);

  } catch (err) {
    console.error('Fehler beim Laden der Projekte:', err);
  }
}
