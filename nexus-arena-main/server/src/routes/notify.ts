import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { chatId, message } = req.body as { chatId?: string; message?: string };

  if (!chatId || !message) {
    res.status(400).json({ error: 'chatId and message are required' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(503).json({ error: 'Telegram notifications not configured on this server' });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      res.status(502).json({ error: 'Telegram API error', detail: body });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Telegram notify error:', err);
    res.status(500).json({ error: 'Internal error sending Telegram message' });
  }
});

export default router;
