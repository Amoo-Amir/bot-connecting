// توکن ربات خود را از @BotFather بگیرید و اینجا بگذارید
// بهتر است در بخش Settings > Variables کلادفلر به عنوان Environment Variable تعریفش کنید
const BOT_TOKEN = env.BOT_TOKEN;

// لیست بازی‌ها (اضافه کردن بازی جدید فقط با اضافه کردن یک خط به این لیست است!)
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
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // دریافت آپدیت‌ها از تلگرام (Webhook)
    if (url.pathname === "/webhook") {
      const update = await request.json();
      
      // ۱. مدیریت دریافت امتیاز از Web App
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
        
        // متن پیام نهایی
        const text = `🏆 <b>${userName}</b> در بازی <b>${gameInfo.name} ${gameInfo.emoji}</b>\nبه رکورد <b>${data.score}</b> امتیاز رسید!\n\n🔥 آیا می‌توانید رکورد او را بشکنید؟`;

        // دکمه‌های زیر پیام
        const keyboard = {
          inline_keyboard: [
            [
              { text: `🎮 بازی مجدد ${gameInfo.name}`, web_app: { url: gameInfo.url } },
              { text: "📜 لیست همه بازی‌ها", callback_data: "list_games" }
            ]
          ]
        };

        await sendTelegramRequest("sendMessage", {
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        
        return new Response("OK");
      }

      // ۲. مدیریت دستور /start
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

        await sendTelegramRequest("sendMessage", {
          chat_id: chatId,
          text: gamesText,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        
        return new Response("OK");
      }

      // ۳. مدیریت کلیک روی دکمه "لیست بازی‌ها"
      if (update.callback_query && update.callback_query.data === "list_games") {
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        
        // ساخت مجدد لیست بازی‌ها (مشابه /start)
        const keyboard = { inline_keyboard: [] };
        for (const [key, game] of Object.entries(GAMES)) {
          keyboard.inline_keyboard.push([
            { text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }
          ]);
        }

        await sendTelegramRequest("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "🎮 لیست بازی‌های موجود:\nیکی را انتخاب کنید!",
          reply_markup: keyboard
        });
        
        await sendTelegramRequest("answerCallbackQuery", { callback_query_id: update.callback_query.id });
        return new Response("OK");
      }

      return new Response("OK");
    }

    return new Response("Persian Games Bot is running!");
  }
};

// تابع کمکی برای ارسال درخواست به API تلگرام
async function sendTelegramRequest(method, data) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}