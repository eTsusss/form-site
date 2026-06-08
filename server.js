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
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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

app.post('/api/submit', async (req, res) => {
  const { company, contact, phone, area, comments } = req.body;

  const errors = validateForm({ company, contact, phone, area });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  if (!process.env.RECIPIENT_EMAIL || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({
      success: false,
      errors: ['Сервер не настроен. Заполните файл .env'],
    });
  }

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
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Заявка успешно отправлена!' });
  } catch (err) {
    console.error('Ошибка отправки email:', err.message);
    res.status(500).json({
      success: false,
      errors: ['Не удалось отправить заявку. Попробуйте позже.'],
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
