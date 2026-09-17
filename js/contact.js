const discordBtn = document.getElementById('contact-discord');

if (discordBtn) {
  const label = discordBtn.querySelector('span:not(.icon)');
  const username = discordBtn.dataset.copy;
  const originalText = label.textContent;

  discordBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(username);
    } catch (err) {
      return;
    }

    const copiedText = translations['main-page.contact-discord-copied'] || 'Copied!';
    label.textContent = copiedText;
    discordBtn.classList.add('copied');

    setTimeout(() => {
      label.textContent = translations['main-page.contact-discord'] || originalText;
      discordBtn.classList.remove('copied');
    }, 1500);
  });
}
