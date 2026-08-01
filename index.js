const ADMIN_ID = 1439184445;
const CHANNEL_USERNAME = "miniPersian_Games";

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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ۱. اگر آدرس webhook نبود، یک پیام ساده برگردان (بدون کرش)
    if (url.pathname !== "/webhook") {
      return new Response("✅ Persian Games Bot is running smoothly!");
    }

    // ۲. فقط درخواست‌های POST تلگرام را پردازش کن
    if (request.method !== "POST") {
      return new Response("Only POST requests are allowed.", { status: 405 });
    }

    try {
      // دریافت داده از تلگرام
      const update = await request.json();
      console.log("✅ Update received:", JSON.stringify(update)); // این خط برای دیباگ حیاتی است

      const BOT_TOKEN = env.BOT_TOKEN;
      if (!BOT_TOKEN) {
        console.error("❌ BOT_TOKEN is missing!");
        return new Response("Missing Token", { status: 500 });
      }

      // --- منطق اصلی ربات ---

      // الف) دریافت امتیاز از بازی
      if (update.message && update.message.web_app_data) {
        const chatId = update.message.chat.id;
        const userName = update.message.from.first_name || "کاربر";
        let data;
        try { data = JSON.parse(update.message.web_app_data.data); } 
        catch (e) { data = { game: "unknown", score: update.message.web_app_data.data }; }

        const gameInfo = GAMES[data.game] || { name: "بازی", emoji: "🎮" };
        const text = `🎉 <b>${userName}</b> در بازی <b>${gameInfo.name} ${gameInfo.emoji}</b>\nبه رکورد خیره‌کننده <b>${data.score}</b> امتیاز رسید!\n\n🔥 آیا می‌توانید رکورد او را بشکنید؟`;

        await sendTelegramRequest(BOT_TOKEN, "sendMessage", {
          chat_id: chatId, text: text, parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[
            { text: `🎮 بازی مجدد`, web_app: { url: gameInfo.url } },
            { text: "📜 لیست بازی‌ها", callback_data: "list_games" }
          ]] }
        });
        return new Response("OK");
      }

      // ب) دستور /start
      if (update.message && update.message.text === "/start") {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const userName = update.message.from.first_name || "دوست عزیز";

        // ذخیره در KV (اگر متصل باشد)
        if (env.USER_IDS) {
          await env.USER_IDS.put(userId.toString(), "active");
          console.log("💾 User saved to KV:", userId);
        } else {
          console.warn("⚠️ KV Binding 'USER_IDS' is missing!");
        }

        const isMember = await checkChannelMembership(BOT_TOKEN, userId);
        
        if (isMember) {
          await sendGameMenu(BOT_TOKEN, chatId, userName);
        } else {
          await sendTelegramRequest(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `سلام ${userName}! 👋\nبرای شروع بازی، لطفاً ابتدا در کانال زیر عضو شوید:\n\n@${CHANNEL_USERNAME}\n\nپس از عضویت، روی دکمه "بررسی کن" بزنید.`,
            reply_markup: { inline_keyboard: [
              [{ text: "📢 عضویت در کانال", url: "https://t.me/" + CHANNEL_USERNAME }],
              [{ text: "✅ عضو شدم، بررسی کن", callback_data: "check_membership" }]
            ]}
          });
        }
        return new Response("OK");
      }

      // ج) بررسی عضویت (دکمه)
      if (update.callback_query && update.callback_query.data === "check_membership") {
        const userId = update.callback_query.from.id;
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        
        const isMember = await checkChannelMembership(BOT_TOKEN, userId);
        if (isMember) {
          await sendTelegramRequest(BOT_TOKEN, "editMessageText", {
            chat_id: chatId, message_id: messageId,
            text: "✅ عضویت شما تأیید شد! حالا می‌توانید بازی کنید:",
            reply_markup: { inline_keyboard: [[{ text: "🎮 شروع بازی", callback_data: "list_games" }]] }
          });
        } else {
          await sendTelegramRequest(BOT_TOKEN, "answerCallbackQuery", { 
            callback_query_id: update.callback_query.id, 
            text: "❌ هنوز عضو کانال نشده‌اید!", show_alert: true
          });
        }
        return new Response("OK");
      }

      // د) لیست بازی‌ها
      if (update.callback_query && update.callback_query.data === "list_games") {
        const userId = update.callback_query.from.id;
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;

        const isMember = await checkChannelMembership(BOT_TOKEN, userId);
        if (!isMember) {
          await sendTelegramRequest(BOT_TOKEN, "answerCallbackQuery", { 
            callback_query_id: update.callback_query.id, text: "❌ باید عضو کانال باشید.", show_alert: true
          });
          return new Response("OK");
        }

        let gamesText = `🎮 <b>لیست بازی‌های موجود:</b>\n\n`;
        const keyboard = { inline_keyboard: [] };
        for (const [key, game] of Object.entries(GAMES)) {
          gamesText += `${game.emoji} <b>${game.name}</b>\n${game.desc}\n\n`;
          keyboard.inline_keyboard.push([{ text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }]);
        }

        await sendTelegramRequest(BOT_TOKEN, "editMessageText", {
          chat_id: chatId, message_id: messageId, text: gamesText, parse_mode: "HTML", reply_markup: keyboard
        });
        return new Response("OK");
      }

      // ه) پیام همگانی (Broadcast)
      if (update.message && update.message.text && update.message.text.startsWith("/broadcast ")) {
        const userId = update.message.from.id;
        const chatId = update.message.chat.id;
        
        if (userId === ADMIN_ID) {
          const messageText = update.message.text.substring(11).trim();
          if (!messageText) {
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ متنی برای ارسال بنویسید.\nمثال: `/broadcast سلام!`", parse_mode: "HTML" });
            return new Response("OK");
          }

          await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "⏳ در حال ارسال..." });

          if (!env.USER_IDS) {
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ خطا: KV متصل نشده است. لطفاً از تنظیمات Binding را چک کنید." });
            return new Response("OK");
          }

          try {
            const keys = await env.USER_IDS.list();
            let successCount = 0;
            for (const key of keys.keys) {
              try {
                await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id: key.name, text: messageText, parse_mode: "HTML" });
                successCount++;
                await new Promise(r => setTimeout(r, 50)); // جلوگیری از محدودیت تلگرام
              } catch (e) {}
            }
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: `✅ ارسال شد!\n📤 موفق: ${successCount}` });
          } catch (error) {
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ خطا در دسترسی به لیست کاربران." });
          }
        } else {
          await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ شما دسترسی استفاده از این دستور را ندارید." });
        }
        return new Response("OK");
      }

      return new Response("OK");

    } catch (error) {
      // اگر هر خطای غیرمنتظره‌ای رخ داد، در لاگ ثبت می‌شود
      console.error("❌ CRITICAL ERROR:", error.message);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};

// --- توابع کمکی ---
async function checkChannelMembership(token, userId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=@${CHANNEL_USERNAME}&user_id=${userId}`);
    const data = await res.json();
    if (data.ok) {
      const status = data.result.status;
      return status === 'member' || status === 'administrator' || status === 'creator';
    }
    return false;
  } catch (e) { return false; }
}

async function sendGameMenu(token, chatId, userName) {
  let gamesText = `سلام ${userName}! 👋\nبه آرکید فارسی خوش آمدید.\n\n`;
  const keyboard = { inline_keyboard: [] };
  for (const [key, game] of Object.entries(GAMES)) {
    gamesText += `${game.emoji} <b>${game.name}</b>\n${game.desc}\n\n`;
    keyboard.inline_keyboard.push([{ text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }]);
  }
  await sendTelegramRequest(token, "sendMessage", { chat_id: chatId, text: gamesText, parse_mode: "HTML", reply_markup: keyboard });
}

async function sendTelegramRequest(token, method, data) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
  });
}