import http from 'node:http';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN env var is required');

const PORT = process.env.PORT || 3000;

// Railway sets RAILWAY_PUBLIC_DOMAIN automatically when a domain is enabled.
// You can also override by setting WEBHOOK_URL explicitly.
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook`
    : null);

const API = `https://api.telegram.org/bot${TOKEN}`;

async function registerWebhook() {
  const res = await fetch(`${API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: WEBHOOK_URL }),
  });
  const data = await res.json();
  console.log('setWebhook:', JSON.stringify(data));
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text) return;

  console.log(`[${msg.chat.id}] ${msg.from?.username ?? 'unknown'}: ${msg.text}`);

  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: msg.chat.id,
      text: `hi you said ${msg.text}`,
    }),
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(200).end('ok');
    return;
  }

  let body = '';
  req.on('data', chunk => (body += chunk));
  req.on('end', async () => {
    try {
      const update = JSON.parse(body);
      await handleUpdate(update);
      res.writeHead(200).end('ok');
    } catch (err) {
      console.error('Update error:', err.message);
      res.writeHead(500).end('error');
    }
  });
});

server.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);
  if (WEBHOOK_URL) {
    await registerWebhook();
  } else {
    console.warn('No WEBHOOK_URL or RAILWAY_PUBLIC_DOMAIN set — webhook not registered');
  }
});
