const body = document.body;

const lang = localStorage.getItem('lang') || 'de';
const theme = localStorage.getItem('theme') || 'light';

document.documentElement.lang = lang;
document.body.dataset.theme = theme;
