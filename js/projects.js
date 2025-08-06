let loadedProjectsCount = 0;
const projectsPerLoad = 4;
let allProjects = [];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function loadProjects(currentLang = 'de', loadMore = false, translations = {}) {
  try {
    const container = document.getElementById('projects');
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
      const flipCard = document.createElement('article');
      flipCard.className = 'flip-card';

      const inner = document.createElement('div');
      inner.className = 'card-inner';

      const front = document.createElement('div');
      front.className = 'card-front';

      if (project.image) {
        const img = document.createElement('img');
        img.src = project.image;
        img.alt = `${project.name} Bild`;
        front.appendChild(img);
      }

      const title = document.createElement('h2');
      title.textContent = project.name;
      front.appendChild(title);

      const badgeWrapper = document.createElement('div');
      badgeWrapper.className = 'badge-wrapper';

      if (project.languages && typeof project.languages === 'object') {
        const sortedLanguages = Object.entries(project.languages)
          .sort((a, b) => b[1] - a[1])
          .map(([lang]) => lang);

        sortedLanguages.forEach(lang => {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = `${BadgeUtils.getLanguageIcon(lang)} ${lang}`;
          badgeWrapper.appendChild(badge);
        });
      }

      front.appendChild(badgeWrapper);

      const back = document.createElement('div');
      back.className = 'card-back';

      const backTitle = document.createElement('h3');
      backTitle.textContent = translations['project-more-info'];
      back.appendChild(backTitle);

      const desc = document.createElement('p');
      const descKey = `project-${project.name}-desc`;
      if (currentLang === 'de') {
        desc.textContent = project.translation || translations[descKey] || 'Keine Beschreibung verfügbar.';
      } else {
        desc.textContent = project.description || translations[descKey] || 'No description available.';
}


      back.appendChild(desc);

      const link = document.createElement('a');
      link.href = project.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = translations['project-github-link'];
      back.appendChild(link);

      inner.appendChild(front);
      inner.appendChild(back);
      flipCard.appendChild(inner);
      container.appendChild(flipCard);
    });

    loadedProjectsCount += nextProjects.length;

    if (loadedProjectsCount < allProjects.length) {
      let loadMoreBtn = document.getElementById(loadMoreBtnId);
      if (!loadMoreBtn) {
        loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = loadMoreBtnId;
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

  } catch (err) {
    console.error('Fehler beim Laden der Projekte:', err);
  }
}
