/**
 * Telegram channel for NanoClaw.
 * Uses grammy (Telegram Bot API) with long polling.
 * Designed for Railway deployment where WhatsApp (Baileys) is not available.
 */
import { Bot, Context } from 'grammy';

import { ASSISTANT_NAME, TELEGRAM_BOT_TOKEN } from '../config.js';
import { logger } from '../logger.js';
import { Channel, OnInboundMessage, OnChatMetadata, NewMessage, RegisteredGroup } from '../types.js';

export interface TelegramChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
}

export class TelegramChannel implements Channel {
  name = 'telegram';

  private bot: Bot;
  private connected = false;
  private opts: TelegramChannelOpts;

  constructor(opts: TelegramChannelOpts) {
    this.opts = opts;

    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram channel');
    }

    this.bot = new Bot(TELEGRAM_BOT_TOKEN);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle all text messages (groups, supergroups, private chats)
    this.bot.on('message:text', (ctx) => {
      this.handleMessage(ctx).catch((err) =>
        logger.error({ err }, 'Error handling Telegram message'),
      );
    });

    // Handle errors
    this.bot.catch((err) => {
      logger.error({ err: err.error }, 'Telegram bot error');
    });
  }

  private async handleMessage(ctx: Context): Promise<void> {
    const msg = ctx.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const chatJid = `tg:${chatId}`;
    const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
    const chatName = isGroup
      ? (msg.chat as { title?: string }).title || `Group ${chatId}`
      : msg.from?.first_name || `User ${chatId}`;
    const timestamp = new Date(msg.date * 1000).toISOString();

    // Always notify about chat metadata for discovery
    this.opts.onChatMetadata(chatJid, timestamp, chatName, 'telegram', isGroup);

    // Check if this chat is registered
    const groups = this.opts.registeredGroups();
    if (!groups[chatJid]) return;

    const sender = msg.from
      ? `tg:${msg.from.id}`
      : `tg:${chatId}`;
    const senderName = msg.from
      ? (msg.from.first_name + (msg.from.last_name ? ` ${msg.from.last_name}` : ''))
      : 'Unknown';
    const fromMe = msg.from?.is_bot === true && msg.from?.id === this.bot.botInfo?.id;

    const newMessage: NewMessage = {
      id: `tg-${msg.message_id}`,
      chat_jid: chatJid,
      sender,
      sender_name: senderName,
      content: msg.text,
      timestamp,
      is_from_me: fromMe,
      is_bot_message: fromMe,
    };

    this.opts.onMessage(chatJid, newMessage);
  }

  async connect(): Promise<void> {
    logger.info('Starting Telegram bot (long polling)...');
    // Start polling in background (non-blocking)
    this.bot.start({
      onStart: (info) => {
        logger.info({ username: info.username }, 'Telegram bot connected');
        this.connected = true;
      },
    });
    // Wait a moment for connection
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.connected) {
          resolve();
        } else {
          setTimeout(check, 200);
        }
      };
      // Resolve after a short timeout even if not connected yet
      // (grammy starts polling async)
      setTimeout(() => resolve(), 3000);
      check();
    });
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    const chatId = jid.replace(/^tg:/, '');
    try {
      await this.bot.api.sendMessage(chatId, `${ASSISTANT_NAME}: ${text}`);
      logger.info({ jid, length: text.length }, 'Telegram message sent');
    } catch (err) {
      logger.error({ jid, err }, 'Failed to send Telegram message');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith('tg:');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await this.bot.stop();
  }

  async setTyping(jid: string, _isTyping: boolean): Promise<void> {
    if (!_isTyping) return; // Telegram only supports "typing" action, not "stop typing"
    const chatId = jid.replace(/^tg:/, '');
    try {
      await this.bot.api.sendChatAction(chatId, 'typing');
    } catch (err) {
      logger.debug({ jid, err }, 'Failed to send typing action');
    }
  }
}
