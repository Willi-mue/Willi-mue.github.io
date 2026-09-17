const btnTheme = document.getElementById('toggle-theme');

const savedTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', savedTheme);
btnTheme.innerHTML = window.Icons.svg(savedTheme === 'dark' ? 'sun' : 'moon');

btnTheme.addEventListener('click', () => {
  if (body.getAttribute('data-theme') === 'light') {
    body.setAttribute('data-theme', 'dark');
    btnTheme.innerHTML = window.Icons.svg('sun');
    localStorage.setItem('theme', 'dark');
  } else {
    body.setAttribute('data-theme', 'light');
    btnTheme.innerHTML = window.Icons.svg('moon');
    localStorage.setItem('theme', 'light');
  }
});
