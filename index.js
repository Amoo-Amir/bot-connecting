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
    const BOT_TOKEN = env.BOT_TOKEN;
    const url = new URL(request.url);
    
    if (url.pathname === "/webhook") {
      const update = await request.json();
      
      // ۱. مدیریت دریافت امتیاز از Web App (اعلام در گروه/پیوی)
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
        
        // متن زیبا و کاربرپسند برای اعلام امتیاز
        const text = `🎉 <b>${userName}</b> در بازی <b>${gameInfo.name} ${gameInfo.emoji}</b>\nبه رکورد خیره‌کننده <b>${data.score}</b> امتیاز رسید!\n\n🔥 آیا می‌توانید رکورد او را بشکنید؟`;

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

      // ۲. مدیریت دستور /start
      if (update.message && update.message.text === "/start") {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const userName = update.message.from.first_name || "دوست عزیز";

        // ذخیره کاربر در KV برای ارسال پیام همگانی در آینده
        if (env.USER_IDS) {
          await env.USER_IDS.put(userId.toString(), "active");
        }

        // بررسی عضویت در کانال
        const isMember = await checkChannelMembership(BOT_TOKEN, userId);

        if (isMember) {
          await sendGameMenu(BOT_TOKEN, chatId, userName);
        } else {
          const keyboard = {
            inline_keyboard: [
              [{ text: "📢 عضویت در کانال بازی‌ها", url: "https://t.me/miniPersian_Games" }],
              [{ text: "✅ عضو شدم، بررسی کن", callback_data: "check_membership" }]
            ]
          };
          await sendTelegramRequest(BOT_TOKEN, "sendMessage", {
            chat_id: chatId,
            text: `سلام ${userName}! 👋\nبرای شروع بازی و دسترسی به تمام بازی‌های ربات، لطفاً ابتدا در کانال زیر عضو شوید:\n\n@miniPersian_Games\n\nپس از عضویت، روی دکمه "بررسی کن" بزنید.`,
            reply_markup: keyboard
          });
        }
        return new Response("OK");
      }

      // ۳. بررسی مجدد عضویت در کانال (دکمه "عضو شدم")
      if (update.callback_query && update.callback_query.data === "check_membership") {
        const userId = update.callback_query.from.id;
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;

        const isMember = await checkChannelMembership(BOT_TOKEN, userId);
        
        if (isMember) {
          await sendTelegramRequest(BOT_TOKEN, "editMessageText", {
            chat_id: chatId,
            message_id: messageId,
            text: "✅ عضویت شما با موفقیت تأیید شد! حالا می‌توانید بازی کنید:",
            reply_markup: { inline_keyboard: [[{ text: "🎮 شروع بازی", callback_data: "list_games" }]] }
          });
        } else {
          await sendTelegramRequest(BOT_TOKEN, "answerCallbackQuery", { 
            callback_query_id: update.callback_query.id, 
            text: "❌ هنوز عضو کانال نشده‌اید! لطفاً ابتدا عضو شوید.",
            show_alert: true
          });
        }
        return new Response("OK");
      }

      // ۴. نمایش لیست بازی‌ها (فقط برای اعضای کانال)
      if (update.callback_query && update.callback_query.data === "list_games") {
        const userId = update.callback_query.from.id;
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;

        const isMember = await checkChannelMembership(BOT_TOKEN, userId);
        if (!isMember) {
          await sendTelegramRequest(BOT_TOKEN, "answerCallbackQuery", { 
            callback_query_id: update.callback_query.id, 
            text: "❌ برای دسترسی به بازی‌ها باید عضو کانال باشید.",
            show_alert: true
          });
          return new Response("OK");
        }

        let gamesText = `🎮 <b>لیست بازی‌های موجود:</b>\nیکی را انتخاب کنید!\n\n`;
        const keyboard = { inline_keyboard: [] };

        for (const [key, game] of Object.entries(GAMES)) {
          gamesText += `${game.emoji} <b>${game.name}</b>\n${game.desc}\n\n`;
          keyboard.inline_keyboard.push([
            { text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }
          ]);
        }

        await sendTelegramRequest(BOT_TOKEN, "editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: gamesText,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
        return new Response("OK");
      }

      // ۵. قابلیت ارسال پیام همگانی توسط ادمین (/broadcast)
      if (update.message && update.message.text && update.message.text.startsWith("/broadcast ")) {
        const userId = update.message.from.id;
        const chatId = update.message.chat.id;
        
        if (userId === ADMIN_ID) {
          const messageText = update.message.text.substring(11).trim();
          if (!messageText) {
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ لطفاً متنی برای ارسال بنویسید.\nمثال: `/broadcast سلام به همه! بازی جدید اضافه شد.`", parse_mode: "HTML" });
            return new Response("OK");
          }

          await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "⏳ در حال ارسال پیام به تمام کاربران..." });

          if (!env.USER_IDS) {
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ خطا: حافظه KV متصل نشده است. لطفاً راهنمای اتصال KV را مطالعه کنید." });
            return new Response("OK");
          }

          try {
            const keys = await env.USER_IDS.list();
            let successCount = 0;
            let failCount = 0;

            for (const key of keys.keys) {
              try {
                await sendTelegramRequest(BOT_TOKEN, "sendMessage", {
                  chat_id: key.name,
                  text: messageText,
                  parse_mode: "HTML"
                });
                successCount++;
                // تأخیر کوتاه برای جلوگیری از محدودیت نرخ (Rate Limit) تلگرام
                await new Promise(r => setTimeout(r, 50));
              } catch (e) {
                failCount++;
              }
            }

            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { 
              chat_id, 
              text: `✅ پیام همگانی با موفقیت ارسال شد!\n📤 ارسال شده: ${successCount}\n❌ ناموفق: ${failCount}` 
            });
          } catch (error) {
            await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ خطا در دسترسی به لیست کاربران." });
          }
        } else {
          await sendTelegramRequest(BOT_TOKEN, "sendMessage", { chat_id, text: "❌ شما دسترسی استفاده از این دستور را ندارید." });
        }
        return new Response("OK");
      }

      return new Response("OK");
    }

    return new Response("Persian Games Bot is running!");
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
  } catch (e) {
    return false;
  }
}

async function sendGameMenu(token, chatId, userName) {
  let gamesText = `سلام ${userName}! 👋\nبه آرکید فارسی خوش آمدید.\n\nبازی مورد نظر خود را انتخاب کنید:\n\n`;
  const keyboard = { inline_keyboard: [] };

  for (const [key, game] of Object.entries(GAMES)) {
    gamesText += `${game.emoji} <b>${game.name}</b>\n${game.desc}\n\n`;
    keyboard.inline_keyboard.push([
      { text: `▶️ شروع ${game.name}`, web_app: { url: game.url } }
    ]);
  }

  await sendTelegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text: gamesText,
    parse_mode: "HTML",
    reply_markup: keyboard
  });
}

async function sendTelegramRequest(token, method, data) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}