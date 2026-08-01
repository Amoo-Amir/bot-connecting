const GAMES = {
  shabtaaz: { 
    name: "شب‌تاز", 
    emoji: "🚀", 
    url: "https://betaz.amirmahdiamirmahdi774.workers.dev",
    desc: "دونده‌ی سه‌بعدی غروب با تم ایرانی"
  },
  shooter: { 
    name: "شوتر فارسی", 
    emoji: "🔫", 
    url: "https://telegram-persian-shooter.amirmahdiamirmahdi774.workers.dev",
    desc: "یک بازی اکشن و هیجان‌انگیز"
  }
};

export default {
  // ✅ دقت کنید: env فقط و فقط در داخل این تابع تعریف شده است
  async fetch(request, env, ctx) {
    const BOT_TOKEN = env.BOT_TOKEN; 
    const url = new URL(request.url);
    
    if (url.pathname === "/webhook") {
      const update = await request.json();
      
      // ۱. دریافت امتیاز از بازی
      if (update.message && update.message.web_app_data) {
        const chatId = update.message.chat.id;
        const userName = update.message.from.first_name || "کاربر";
        let data;
        
        try {
          data = JSON.parse(update.message.web_app_data.data);
        } catch (e) {
          data = { game: "unknown", score: update.message.web_app_data.data };
        }

        const gameInfo = GAMES[data.game] || { name: "بازی", emoji: "🎮" };
        const text = `🏆 <b>${userName}</b> در بازی <b>${gameInfo.name} ${gameInfo.emoji}</b>\nبه رکورد <b>${data.score}</b> امتیاز رسید!\n\n🔥 آیا می‌توانید رکورد او را بشکنید؟`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: `🎮 بازی مجدد ${gameInfo.name}`, web_app: { url: gameInfo.url } },
              { text: "📜 لیست همه بازی‌ها", callback_data: "list_games" }
            ]
          ]
        };

        await sendTelegramRequest(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        return new Response("OK");
      }

      // ۲. دستور /start
      if (update.message && update.message.text === "/start") {
        const chatId = update.message.chat.id;
        const userName = update.message.from.first_name || "دوست عزیز";
        
        let gamesText = `سلام ${userName}! 👋\nبه آرکید فارسی خوش آمدید.\n\nبازی مورد نظر خود را انتخاب کنید:\n\n`;
        const keyboard = { inline_keyboard: [] };

        for (const [key, game] of Object.entries(GAMES)) {
          gamesText += `${game.emoji} <b>${game.name}</b>\n${game.desc}\n\n`;
          keyboard.inline_keyboard.push([
            { text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }
          ]);
        }

        await sendTelegramRequest(BOT_TOKEN, "sendMessage", {
          chat_id: chatId,
          text: gamesText,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        return new Response("OK");
      }

      // ۳. دکمه لیست بازی‌ها
      if (update.callback_query && update.callback_query.data === "list_games") {
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        
        const keyboard = { inline_keyboard: [] };
        for (const [key, game] of Object.entries(GAMES)) {
          keyboard.inline_keyboard.push([
            { text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }
          ]);
        }

        await sendTelegramRequest(BOT_TOKEN, "editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "🎮 لیست بازی‌های موجود:\nیکی را انتخاب کنید!",
          reply_markup: keyboard
        });
        
        await sendTelegramRequest(BOT_TOKEN, "answerCallbackQuery", { callback_query_id: update.callback_query.id });
        return new Response("OK");
      }

      return new Response("OK");
    }

    return new Response("Persian Games Bot is running!");
  }
};

async function sendTelegramRequest(token, method, data) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}