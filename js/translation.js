let translations = {}; 
let currentLang = localStorage.getItem('lang') || 'de';
const btnLang = document.getElementById('toggle-lang');

async function fetchTranslations(lang) {
  const basePath = `../translation/${lang}/`;
  const files = [
    'main-page.json',
    'blog-minecraft-server.json',
    'blog-discord-bot-server.json',
    'blog-discord-webpage.json',
    'blog-game-jam.json'
  ];
  const result = {};

  for (const file of files) {
    try {
      const res = await fetch(basePath + file);
      if (!res.ok) throw new Error(`Fehler beim Laden von ${file}`);
      const data = await res.json();
      Object.assign(result, data);
    } catch (err) {
      console.error(err);
    }
  }

  return result;
}

async function updateTexts(lang) {
  translations = await fetchTranslations(lang);

  if (!translations || Object.keys(translations).length === 0) {
    console.warn("Keine Übersetzungen geladen.");
    return;
  }

  currentLang = lang;
  localStorage.setItem('lang', lang);
  btnLang.textContent = currentLang === 'de' ? 'EN' : 'DE';

  // Alle Elemente mit data-i18n Attribut finden und übersetzen
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = translations[key];
    if (translation !== undefined) {
      // Spezialfälle: Links, Buttons, Bilder etc.
      const tag = el.tagName.toLowerCase();

      if (tag === 'a' && el.hasAttribute('data-i18n-href')) {
        // href separat ersetzen (wird unten nochmal behandelt)
        el.textContent = translation;
      } else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        el.value = translation;
      } else if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  // Links href separat ersetzen, falls data-i18n-href vorhanden
  document.querySelectorAll('[data-i18n-href]').forEach(el => {
    const key = el.getAttribute('data-i18n-href');
    const translation = translations[key];
    if (translation !== undefined) {
      el.href = translation;
    }
  });

  // Optional: Falls du noch weitere dynamische Sachen hast, z.B. loadProjects
  if (typeof loadProjects === 'function') {
    await loadProjects(lang, false, translations);
  }
}

// Initiale Texte laden
document.addEventListener('DOMContentLoaded', () => {
  updateTexts(currentLang);
});

// Sprachwechsel durch Button
btnLang.addEventListener('click', async () => {
  const newLang = currentLang === 'de' ? 'en' : 'de';
  await updateTexts(newLang);
});
