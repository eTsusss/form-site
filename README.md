# Форма заявки

Статический сайт с формой. Заявки приходят на email через [Web3Forms](https://web3forms.com).

## Поля формы

- Название компании
- Контактное лицо
- Номер телефона
- Желаемая площадь
- Доп. комментарии

## Локальный просмотр

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env` из `.env.example` и укажите `WEB3FORMS_ACCESS_KEY`.

   Или для быстрого просмотра без сборки:

```bash
copy public\config.example.js public\config.js
```

   Затем вставьте ключ в `public/config.js`.

3. Запустите:

```bash
npm run preview
```

4. Откройте http://localhost:3000

## Деплой на Render Static Site

Static Site **не засыпает** — сайт всегда доступен на бесплатном плане.

### Шаг 1. Удалите старый Web Service (если есть)

Render Dashboard → старый сервис `form-site` → **Settings → Delete Web Service**.

### Шаг 2. Создайте Static Site

1. **New +** → **Static Site**
2. Подключите репозиторий **eTsusss/form-site**
3. Настройки:

| Поле | Значение |
|------|----------|
| **Name** | `form-site` |
| **Branch** | `main` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. **Environment Variables**:

| Key | Value |
|-----|-------|
| `WEB3FORMS_ACCESS_KEY` | ваш ключ из Web3Forms |

5. **Create Static Site**

### Шаг 3. Обновите домен в Web3Forms

1. Откройте [web3forms.com](https://web3forms.com) → форма **final** (или ваша)
2. **Settings** → в поле **Domain** укажите:
   ```
   form-site-1-f2mo.onrender.com
   ```
   (ваш URL Static Site **без** `https://`)
3. Сохраните

> Если после этого всё ещё ошибка 400 — напишите в [поддержку Web3Forms](https://web3forms.com/contact) с просьбой одобрить домен `*.onrender.com`.

### Шаг 4. Проверьте ключ после деплоя

Откройте в браузере: `https://ваш-сайт.onrender.com/config.js`

Должно быть:
```javascript
window.WEB3FORMS_ACCESS_KEY = "f1a9f68d-ae77-437c-bed5-f59544a867e6";
```

Если там `"1"` или другой неверный ключ — исправьте `WEB3FORMS_ACCESS_KEY` на Render и нажмите **Manual Deploy → Clear build cache & deploy**.

### Шаг 5. Проверьте форму

Откройте URL Static Site, отправьте форму — письмо придёт на email, указанный при регистрации Web3Forms.

## Настройка Web3Forms

| Поле | Значение |
|------|----------|
| **Form Name** | любое, например `Заявка` |
| **Domain name** | ваш домен на Render (только домен, без `https://`) |

Ключ Web3Forms публичный — его можно хранить в `config.js` на сайте.

## Обновление сайта

После `git push` Render автоматически пересоберёт Static Site.
