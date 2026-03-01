const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN env var is required');

const API = `https://api.telegram.org/bot${TOKEN}`;

let offset = 0;

async function poll() {
  const res = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30`);
  if (!res.ok) throw new Error(`Telegram API error: ${res.status}`);
  const { result = [] } = await res.json();

  for (const update of result) {
    offset = update.update_id + 1;
    const msg = update.message;
    if (!msg?.text) continue;

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
}

(async () => {
  console.log('Telegram test bot started (long polling)');
  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error('Poll error:', err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
})();
