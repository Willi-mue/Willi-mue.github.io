const btnTheme = document.getElementById('toggle-theme');

const savedTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', savedTheme);
btnTheme.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

btnTheme.addEventListener('click', () => {
  if (body.getAttribute('data-theme') === 'light') {
    body.setAttribute('data-theme', 'dark');
    btnTheme.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    body.setAttribute('data-theme', 'light');
    btnTheme.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
});

