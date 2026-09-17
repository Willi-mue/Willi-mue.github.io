let loadedProjectsCount = 0;
const projectsPerLoad = 6;
let allProjects = [];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function loadProjects(currentLang = 'de', loadMore = false, translations = {}) {
  try {
    const container = document.getElementById('projects-grid');
    const loadMoreBtnId = 'load-more-btn';

    if (!loadMore) {
      // Erster Aufruf: Projekte laden und zurücksetzen
      const response = await fetch('data/projects_Willi-Mue.json');
      allProjects = await response.json();

      shuffleArray(allProjects); // Projekte mischen

      loadedProjectsCount = 0;
      container.innerHTML = '';

      // Falls Button schon existiert (z.B. nach Sprache wechseln), entfernen
      const existingBtn = document.getElementById(loadMoreBtnId);
      if (existingBtn) existingBtn.remove();
    }

    // Nächste Projekte anzeigen
    const nextProjects = allProjects.slice(loadedProjectsCount, loadedProjectsCount + projectsPerLoad);

    nextProjects.forEach(project => {
      const card = document.createElement('article');
      card.className = 'project-card';

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
      container.appendChild(card);
    });

    loadedProjectsCount += nextProjects.length;

    if (loadedProjectsCount < allProjects.length) {
      let loadMoreBtn = document.getElementById(loadMoreBtnId);
      if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = loadMoreBtnId;
        loadMoreBtn.classList.add('button');
        loadMoreBtn.textContent = currentLang === 'de' ? 'Mehr laden' : 'Load more';
        loadMoreBtn.addEventListener('click', () => loadProjects(currentLang, true, translations));
        container.after(loadMoreBtn);
      }
    } else {
      // Alle Projekte geladen, Button entfernen
      const loadMoreBtn = document.getElementById(loadMoreBtnId);
      if (loadMoreBtn) loadMoreBtn.remove();
    }

    BadgeUtils.applyBadgeStyles(container);
    window.Icons.apply(container);

  } catch (err) {
    console.error('Fehler beim Laden der Projekte:', err);
  }
}
