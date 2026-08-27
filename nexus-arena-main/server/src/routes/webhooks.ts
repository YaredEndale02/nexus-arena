import { Router } from 'express';

const router = Router();
const TELEGRAM_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

router.post('/', async (req, res) => {
  const { message } = req.body;

  if (message && message.text) {
    const chatId = message.chat.id;
    const text = message.text.toLowerCase();

    if (text === '/start' || text === '/myid' || text === '/id') {
      const reply = `<b>Welcome to ADWA ARENA!</b>\n\nYour unique Chat ID is:\n<code>${chatId}</code>\n\nCopy this ID and paste it into your ADWA ARENA Settings to enable notifications. 🚀`;
      
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: reply,
            parse_mode: 'HTML',
          }),
        });
      } catch (err) {
        console.error('Failed to send Telegram reply:', err);
      }
    }
  }

  // Always return 200 to Telegram so it doesn't keep retrying
  res.status(200).send('OK');
});

export default router;
