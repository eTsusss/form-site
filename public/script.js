const form = document.getElementById('requestForm');
const messageEl = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.hidden = false;
}

function hideMessage() {
  messageEl.hidden = true;
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Отправка...' : 'Отправить заявку';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const formData = {
    company: form.company.value,
    contact: form.contact.value,
    phone: form.phone.value,
    area: form.area.value,
    comments: form.comments.value,
  };

  setLoading(true);

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      showMessage(result.message, 'success');
      form.reset();
    } else {
      showMessage(result.errors?.join('. ') || 'Произошла ошибка', 'error');
    }
  } catch {
    showMessage('Не удалось отправить заявку. Проверьте подключение к интернету.', 'error');
  } finally {
    setLoading(false);
  }
});
