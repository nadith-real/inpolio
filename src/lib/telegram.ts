const PROXY_PREFIX = "/telegram";

export type TelegramResult = { ok: true } | { ok: false; error: string };

export function isTelegramConfigured(settings: {
  telegramEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
}): boolean {
  return Boolean(settings.telegramEnabled && settings.telegramBotToken?.trim() && settings.telegramChatId?.trim());
}

export function formatTelegramMessage(businessName: string, title: string, message: string): string {
  const name = businessName.trim() || "Inpolio";
  return `${name}\n\n${title}\n${message}`;
}

function botPath(token: string, method: string): string {
  return `${PROXY_PREFIX}/bot${token}/${method}`;
}

async function telegramRequest(token: string, method: string, body?: Record<string, unknown>): Promise<TelegramResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: "Bot token is required." };
  try {
    const res = await fetch(botPath(trimmed, method), {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.description || `Telegram request failed (${res.status}).` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Telegram. Check the local server and your connection." };
  }
}

export function sendTelegramMessage(token: string, chatId: string, text: string): Promise<TelegramResult> {
  const id = chatId.trim();
  if (!id) return Promise.resolve({ ok: false, error: "Chat ID is required." });
  return telegramRequest(token, "sendMessage", {
    chat_id: id,
    text,
    disable_web_page_preview: true,
  });
}

export async function testTelegramConnection(token: string, chatId: string, businessName: string): Promise<TelegramResult> {
  const me = await telegramRequest(token, "getMe");
  if (!me.ok) return me;
  return sendTelegramMessage(
    token,
    chatId,
    formatTelegramMessage(businessName, "Telegram connected", "Inpolio will send business notifications to this chat."),
  );
}
