const fs = require('fs');
const path = require('path');

require('dotenv').config();

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');
const accessKey = process.env.WEB3FORMS_ACCESS_KEY;

if (!accessKey) {
  console.error('Ошибка: задайте WEB3FORMS_ACCESS_KEY в .env или в Environment Variables на Render');
  process.exit(1);
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidPattern.test(accessKey.trim())) {
  console.error('Ошибка: WEB3FORMS_ACCESS_KEY должен быть UUID вида xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  console.error('Сейчас указано:', JSON.stringify(accessKey));
  process.exit(1);
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir, { recursive: true });

for (const file of fs.readdirSync(publicDir)) {
  if (file === 'config.example.js') continue;
  fs.copyFileSync(path.join(publicDir, file), path.join(distDir, file));
}

const configJs = `window.WEB3FORMS_ACCESS_KEY = ${JSON.stringify(accessKey.trim())};\n`;
fs.writeFileSync(path.join(distDir, 'config.js'), configJs);

console.log('Сборка завершена: папка dist/ готова');
