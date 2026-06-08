const form = document.getElementById('requestForm');
const messageEl = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');

let web3formsKey = undefined;

async function getWeb3FormsKey() {
  if (web3formsKey !== undefined) return web3formsKey;
  try {
    const config = await fetch('/api/config').then((r) => r.json());
    web3formsKey = config.web3formsKey || null;
  } catch {
    web3formsKey = null;
  }
  return web3formsKey;
}

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

function getFormData() {
  return {
    company: form.company.value.trim(),
    contact: form.contact.value.trim(),
    phone: form.phone.value.trim(),
    area: form.area.value.trim(),
    comments: form.comments.value.trim() || '—',
  };
}

function validateClientForm(data) {
  const errors = [];
  if (!data.company) errors.push('Укажите название компании');
  if (!data.contact) errors.push('Укажите контактное лицо');
  if (!data.phone) errors.push('Укажите номер телефона');
  if (!data.area) errors.push('Укажите желаемую площадь');
  if (data.phone && data.phone.replace(/\D/g, '').length < 10) {
    errors.push('Номер телефона указан некорректно');
  }
  return errors;
}

async function sendViaWeb3Forms(formData) {
  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: key,
      subject: `Новая заявка от ${formData.company}`,
      from_name: 'Форма заявки',
      name: formData.contact,
      message: [
        `Название компании: ${formData.company}`,
        `Контактное лицо: ${formData.contact}`,
        `Номер телефона: ${formData.phone}`,
        `Желаемая площадь: ${formData.area}`,
        `Доп. комментарии: ${formData.comments}`,
      ].join('\n'),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Проверьте ключ Web3Forms и домен сайта');
  }
}

async function sendViaServer(formData) {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Ошибка сервера. Попробуйте позже.');
  }

  if (!result.success) {
    throw new Error(result.errors?.join('. ') || 'Произошла ошибка');
  }

  return result.message;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const formData = getFormData();
  const errors = validateClientForm(formData);
  if (errors.length > 0) {
    showMessage(errors.join('. '), 'error');
    return;
  }

  setLoading(true);

  try {
    const key = await getWeb3FormsKey();
    if (key) {
      await sendViaWeb3Forms(formData);
      showMessage('Заявка успешно отправлена!', 'success');
      form.reset();
    } else {
      const message = await sendViaServer(formData);
      showMessage(message, 'success');
      form.reset();
    }
  } catch (err) {
    showMessage(err.message || 'Не удалось отправить заявку.', 'error');
  } finally {
    setLoading(false);
  }
});
