import 'dotenv/config';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let lastUpdateId = 0;

async function pollTelegram() {
  if (!TELEGRAM_TOKEN) {
    console.warn("Telegram Token missing in server/.env. Polling disabled.");
    return;
  }

  // console.log("Telegram Polling started...");

  while (true) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
      const data = await response.json();

      if (!data.ok) {
        console.error("Telegram Polling returned error:", data);
      }

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.toLowerCase();

            if (text === '/start' || text === '/myid' || text === '/id') {
              const reply = `<b>Welcome to ArenaX!</b>\n\nYour unique Chat ID is:\n<code>${chatId}</code>\n\nCopy this ID and paste it into your ArenaX Settings to enable notifications. 🚀`;
              
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: reply,
                  parse_mode: 'HTML',
                }),
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Telegram Polling error:", err);
      // Wait a bit before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

export { pollTelegram };
