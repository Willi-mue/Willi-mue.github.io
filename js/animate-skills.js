function animateSkillBars() {
  const bars = document.querySelectorAll('.skill-bar');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.4
  });

  bars.forEach(bar => observer.observe(bar));
}

document.addEventListener('DOMContentLoaded', animateSkillBars);
