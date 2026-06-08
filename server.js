require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function createTransporter() {
  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: isSecure,
    requireTLS: !isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    tls: {
      minVersion: 'TLSv1.2',
    },
  });
}

function getSendErrorMessage(err) {
  const msg = err?.message || '';
  const response = err?.response || '';

  if (msg.includes('ETIMEDOUT') || msg.includes('ETIMEOUT') || msg.includes('ECONNREFUSED')) {
    return 'Render на бесплатном плане блокирует SMTP. Добавьте WEB3FORMS_ACCESS_KEY на Render (см. README).';
  }
  if (response.includes('535') || msg.includes('535')) {
    return 'Mail.ru требует пароль для внешнего приложения. Создайте его в настройках почты.';
  }
  if (msg.includes('EAUTH') || msg.includes('Authentication')) {
    return 'Неверный логин или пароль SMTP.';
  }

  return msg || 'Не удалось отправить заявку.';
}

async function sendViaBrevo(mailOptions) {
  const senderEmail = process.env.SENDER_EMAIL || process.env.RECIPIENT_EMAIL;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Форма заявки', email: senderEmail },
      to: [{ email: process.env.RECIPIENT_EMAIL }],
      subject: mailOptions.subject,
      textContent: mailOptions.text,
      htmlContent: mailOptions.html,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Ошибка Brevo: ${response.status}`);
  }
}

async function sendEmail(mailOptions, formData) {
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(mailOptions);
  }

  const transporter = createTransporter();
  return transporter.sendMail(mailOptions);
}

function validateForm(data) {
  const errors = [];

  if (!data.company?.trim()) errors.push('Укажите название компании');
  if (!data.contact?.trim()) errors.push('Укажите контактное лицо');
  if (!data.phone?.trim()) errors.push('Укажите номер телефона');
  if (!data.area?.trim()) errors.push('Укажите желаемую площадь');

  const phoneDigits = data.phone?.replace(/\D/g, '') || '';
  if (data.phone?.trim() && phoneDigits.length < 10) {
    errors.push('Номер телефона указан некорректно');
  }

  return errors;
}

app.get('/api/config', (_req, res) => {
  res.json({
    web3formsKey: process.env.WEB3FORMS_ACCESS_KEY || null,
  });
});

app.post('/api/submit', async (req, res) => {
  const { company, contact, phone, area, comments } = req.body;

  const errors = validateForm({ company, contact, phone, area });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const hasWeb3Forms = Boolean(process.env.WEB3FORMS_ACCESS_KEY);
  const hasBrevo = Boolean(process.env.BREVO_API_KEY && process.env.RECIPIENT_EMAIL);
  const hasSmtp = Boolean(
    process.env.RECIPIENT_EMAIL && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  if (!hasBrevo && !hasSmtp) {
    return res.status(500).json({
      success: false,
      errors: ['Сервер не настроен. Добавьте WEB3FORMS_ACCESS_KEY (см. README).'],
    });
  }

  const formData = {
    company: company.trim(),
    contact: contact.trim(),
    phone: phone.trim(),
    area: area.trim(),
    comments: comments?.trim() || '—',
  };

  const mailOptions = {
    from: `"Форма заявки" <${process.env.SMTP_USER}>`,
    to: process.env.RECIPIENT_EMAIL,
    subject: `Новая заявка от ${company.trim()}`,
    text: [
      'Новая заявка с сайта',
      '',
      `Название компании: ${company.trim()}`,
      `Контактное лицо: ${contact.trim()}`,
      `Номер телефона: ${phone.trim()}`,
      `Желаемая площадь: ${area.trim()}`,
      `Доп. комментарии: ${comments?.trim() || '—'}`,
    ].join('\n'),
    html: `
      <h2>Новая заявка с сайта</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;">
        <tr><td style="padding:8px 16px 8px 0;color:#666;">Название компании</td><td style="padding:8px 0;"><strong>${escapeHtml(company.trim())}</strong></td></tr>
        <tr><td style="padding:8px 16px 8px 0;color:#666;">Контактное лицо</td><td style="padding:8px 0;">${escapeHtml(contact.trim())}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;color:#666;">Номер телефона</td><td style="padding:8px 0;">${escapeHtml(phone.trim())}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;color:#666;">Желаемая площадь</td><td style="padding:8px 0;">${escapeHtml(area.trim())}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;color:#666;vertical-align:top;">Доп. комментарии</td><td style="padding:8px 0;">${escapeHtml(comments?.trim() || '—')}</td></tr>
      </table>
    `,
  };

  try {
    await sendEmail(mailOptions, formData);
    res.json({ success: true, message: 'Заявка успешно отправлена!' });
  } catch (err) {
    console.error('Ошибка отправки email:', err.message);
    if (err.response) console.error('SMTP response:', err.response);
    res.status(500).json({
      success: false,
      errors: [getSendErrorMessage(err)],
    });
  }
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
