// Runs as one of the first elements in <body> (before any content is parsed),
// so theme, language and the animation start state are in place before the
// first paint — otherwise a cached reload briefly flashes the wrong state.
const body = document.body;

const lang = localStorage.getItem('lang') || 'de';
const theme = localStorage.getItem('theme') || 'light';

document.documentElement.lang = lang;
document.body.dataset.theme = theme;

// Hides reveal targets until js/animations.js (loaded at the end of <body>)
// animates them in; animations.js sets the same class again.
document.documentElement.classList.add('anim-ready');

// Safety net: if animations.js never runs, show main/footer anyway.
setTimeout(() => document.documentElement.classList.add('anim-live'), 3000);
