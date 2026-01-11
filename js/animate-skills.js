const skillBars = document.querySelectorAll('.skill-bar');

function revealSkills() {
  skillBars.forEach(bar => {
    const top = bar.getBoundingClientRect().top;
    if (top < window.innerHeight) {
      bar.classList.add('visible');
    }
  });
}

window.addEventListener('scroll', revealSkills);
window.addEventListener('load', revealSkills);