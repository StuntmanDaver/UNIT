const form = document.querySelector('form[name="launch-updates"]');

if (form) {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.textContent = 'Sending';
      button.disabled = true;
    }
  });
}
