let translations = {};
let currentLang = localStorage.getItem("lang") || "de";
const btnLang = document.getElementById("toggle-lang");

async function fetchTranslations(lang) {
  const basePath = `../translation/${lang}/`;
  const files = [
    "main-page.json",
    "blog-minecraft-server.json",
    "blog-discord-bot-server.json",
    "blog-discord-webpage.json",
    "blog-game-jam.json",
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
  localStorage.setItem("lang", lang);
  btnLang.textContent = currentLang === "de" ? "EN" : "DE";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translation = translations[key];
    if (translation !== undefined) {
      const tag = el.tagName.toLowerCase();

      if (tag === "a" && el.hasAttribute("data-i18n-href")) {
        el.textContent = translation;
      } else if (tag === "input" || tag === "textarea" || tag === "select") {
        el.value = translation;
      } else if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    const translation = translations[key];
    if (translation) el.innerHTML = translation;
  });

  if (typeof loadProjects === "function") {
    await loadProjects(lang, false, translations);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateTexts(currentLang);
});

btnLang.addEventListener("click", async () => {
  const newLang = currentLang === "de" ? "en" : "de";
  await updateTexts(newLang);
});
