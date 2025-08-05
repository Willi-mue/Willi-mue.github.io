window.BadgeUtils = (() => {
    const languageIcons = {
    Python: '🐍',
    JavaScript: '✨',
    TypeScript: '🔷',
    Java: '☕',
    'C++': ' ',
    'C#': ' ',
    Go: '🐹',
    Rust: '⚙️',
    HTML: '🌐',
    CSS: '🎨',
    Shell: '🖥️',
    PHP: '🐘',
    Ruby: '💎',
    Swift: '🕊️',
    Kotlin: '🧡',
    Docker: '🐳',
    GDScript: '🎮',
    Makefile: '🛠️',
    Batchfile: '📄',
    };

    const languageColors = {
    Python: '#3572A5',
    JavaScript: '#bea909',
    TypeScript: '#3178c6',
    Java: '#ec8611',
    'C++': '#f34b7d',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#e7864e',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#5fc022',
    PHP: '#4F5D95',
    Ruby: '#701516',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Docker: '#2496ED',
    GDScript: '#478CBF',
    Makefile: '#346e04ff',   
    Batchfile: '#45a306ff',      
    };

  function lightenColor(color, luminosity = 0.8) {
    color = color.replace(/[^0-9a-f]/gi, '');
    if (color.length < 6) {
      color = color[0]+color[0]+color[1]+color[1]+color[2]+color[2];
    }
    let newColor = "#", c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(color.substr(i*2,2), 16);
      c = Math.min(255, Math.floor(c + (255 - c) * luminosity));
      newColor += ("00" + c.toString(16)).substr(-2);
    }
    return newColor;
  }

  function applyBadgeStyles(root = document) {
    const badges = root.querySelectorAll('.badge');
    badges.forEach(badge => {
      const text = badge.textContent.trim();
      // Falls das Icon schon da ist, entfernen, nur Sprache behalten
      const label = text.replace(/^.*? /, ''); 
      const icon = languageIcons[label] || '💻';
      const baseColor = languageColors[label] || '#888888';
      const bgColor = lightenColor(baseColor, 0.8);

      badge.textContent = `${icon} ${label}`;
      badge.style.backgroundColor = bgColor;
      badge.style.color = baseColor;
    });
  }

  // Direkt beim Laden die statischen Badges stylen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyBadgeStyles());
  } else {
    applyBadgeStyles();
  }

  return {
    lightenColor,
    applyBadgeStyles,
    getLanguageIcon: (lang) => languageIcons[lang] || '💻'
  };
})();
