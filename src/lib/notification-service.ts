import { db } from '@/lib/db';

// nodemailer is CommonJS — use dynamic import-friendly approach
let nodemailerModule: typeof import('nodemailer') | null = null;

async function getNodemailer() {
  if (!nodemailerModule) {
    nodemailerModule = await import('nodemailer');
  }
  return nodemailerModule;
}

// =====================
// Types
// =====================

interface CustomerInfo {
  name: string;
  email: string;
  phone: string | null;
  telegramChatId: string | null;
  whatsappPhone: string | null;
}

interface BusinessNotificationConfig {
  businessName: string;
  // SMTP
  emailEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  // Telegram
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramWelcomeMsg: string | null;
  telegramRewardMsg: string | null;
  // WhatsApp CallMeBot
  whatsappEnabled: boolean;
  whatsappApiUrl: string | null;
  whatsappApiKey: string | null;
  whatsappPhone: string | null;
}

type NotificationEvent = 'earn_points' | 'goal_reached' | 'reward_redeemed' | 'campaign_message' | 'invoice_reminder';

// =====================
// Helper: Load business config
// =====================

async function loadBusinessConfig(businessId: string): Promise<BusinessNotificationConfig | null> {
  const settings = await db.businessSettings.findUnique({
    where: { businessId },
  });
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  });

  if (!settings || !business) return null;

  return {
    businessName: business.name,
    emailEnabled: settings.emailEnabled ?? false,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpFrom: settings.smtpFrom,
    telegramBotToken: settings.telegramBotToken,
    telegramChatId: settings.telegramChatId,
    telegramWelcomeMsg: settings.telegramWelcomeMsg,
    telegramRewardMsg: settings.telegramRewardMsg,
    whatsappEnabled: settings.whatsappEnabled ?? false,
    whatsappApiUrl: settings.whatsappApiUrl,
    whatsappApiKey: settings.whatsappApiKey,
    whatsappPhone: settings.whatsappPhone,
  };
}

async function loadCustomerInfo(customerId: string): Promise<CustomerInfo | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: {
      name: true,
      email: true,
      phone: true,
      telegramChatId: true,
      whatsappPhone: true,
    },
  });
  return customer;
}

// =====================
// Build message content
// =====================

function buildMessage(
  event: NotificationEvent,
  config: BusinessNotificationConfig,
  customer: CustomerInfo,
  extra: Record<string, string> = {}
): { subject: string; message: string; telegramMsg: string; whatsappMsg: string } {
  const bizName = config.businessName;
  const { name } = customer;

  switch (event) {
    case 'earn_points': {
      const pts = extra.points || '1';
      const total = extra.totalPoints || '0';
      const subject = `🎁 ¡${pts} puntos en ${bizName}!`;
      const message = `Hola ${name},\n\nAcabas de ganar ${pts} punto(s) en ${bizName}.\nTu saldo actual es: ${total} punto(s).\n\n¡Sigue acumulando para ganar recompensas!\n\n— ${bizName}`;
      return { subject, message, telegramMsg: message, whatsappMsg: message };
    }
    case 'goal_reached': {
      const goal = extra.rewardGoal || '10';
      const total = extra.totalPoints || goal;
      const subject = `🏆 ¡Meta alcanzada en ${bizName}!`;
      const message = `¡Felicidades ${name}! 🎉\n\nHas alcanzado ${goal} puntos en ${bizName}.\n¡Ya puedes reclamar tu recompensa!\n\nVisítanos para canjear tus puntos.\n\n— ${bizName}`;
      return { subject, message, telegramMsg: message, whatsappMsg: message };
    }
    case 'reward_redeemed': {
      const reward = extra.rewardName || 'una recompensa';
      const remaining = extra.remainingPoints || '0';
      const subject = `✅ Recompensa canjeada en ${bizName}`;
      const message = `Hola ${name},\n\nHas canjeado exitosamente: ${reward}.\nPuntos restantes: ${remaining}.\n\n¡Gracias por ser cliente de ${bizName}!\n\n— ${bizName}`;
      return { subject, message, telegramMsg: message, whatsappMsg: message };
    }
    case 'campaign_message': {
      const campaignMsg = extra.campaignMessage || '';
      const subject = `📢 ${bizName} tiene algo para ti`;
      const message = `Hola ${name},\n\n${campaignMsg}\n\n— ${bizName}`;
      return { subject, message, telegramMsg: message, whatsappMsg: message };
    }
    case 'invoice_reminder': {
      const concept = extra.concept || 'tu cobro';
      const amount = extra.amount || '';
      const dueDate = extra.dueDate || '';
      const subject = `💰 Recordatorio de cobro — ${bizName}`;
      const message = `Hola ${name},\n\nTe recordamos sobre: ${concept}${amount ? ` por ${amount}` : ''}.${dueDate ? `\nFecha de vencimiento: ${dueDate}` : ''}\n\n— ${bizName}`;
      return { subject, message, telegramMsg: message, whatsappMsg: message };
    }
    default: {
      const subject = `Notificación de ${bizName}`;
      const message = `Hola ${name},\n\nTienes una nueva notificación de ${bizName}.\n\n— ${bizName}`;
      return { subject, message, telegramMsg: message, whatsappMsg: message };
    }
  }
}

// =====================
// Send Email (SMTP)
// =====================

async function sendEmail(
  config: BusinessNotificationConfig,
  toEmail: string,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return { success: false, error: 'SMTP no configurado' };
  }

  try {
    const nodemailer = await getNodemailer();
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    const fromAddress = config.smtpFrom || config.smtpUser;

    await transporter.sendMail({
      from: `"${config.businessName}" <${fromAddress}>`,
      to: toEmail,
      subject,
      text: message,
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Email send error:', msg);
    return { success: false, error: msg };
  }
}

// =====================
// Send Telegram
// =====================

async function sendTelegram(
  config: BusinessNotificationConfig,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.telegramBotToken) {
    return { success: false, error: 'Telegram Bot Token no configurado' };
  }

  try {
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: `Telegram API error: ${res.status} ${(data as Record<string, string>).description || ''}` };
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Telegram send error:', msg);
    return { success: false, error: msg };
  }
}

// =====================
// Send WhatsApp (CallMeBot)
// =====================

async function sendWhatsApp(
  config: BusinessNotificationConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!config.whatsappApiUrl || !config.whatsappApiKey || !config.whatsappPhone) {
    return { success: false, error: 'WhatsApp CallMeBot no configurado' };
  }

  try {
    const params = new URLSearchParams({
      phone: config.whatsappPhone,
      apikey: config.whatsappApiKey,
      message,
    });

    const url = `${config.whatsappApiUrl}?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `CallMeBot error: ${res.status} ${text}` };
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('WhatsApp send error:', msg);
    return { success: false, error: msg };
  }
}

// =====================
// Main: dispatch notification
// =====================

export interface NotifyResult {
  emailSent: boolean;
  telegramSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}

/**
 * Send a notification to a customer across all configured channels.
 * Email is the default (predetermined) channel.
 * Telegram and WhatsApp are sent if the customer has those fields configured.
 */
export async function notifyCustomer(
  businessId: string,
  customerId: string,
  event: NotificationEvent,
  extra: Record<string, string> = {},
  onlyChannel?: 'email' | 'telegram' | 'whatsapp'
): Promise<NotifyResult> {
  const result: NotifyResult = { emailSent: false, telegramSent: false, whatsappSent: false, errors: [] };

  try {
    const [config, customer] = await Promise.all([
      loadBusinessConfig(businessId),
      loadCustomerInfo(customerId),
    ]);

    if (!config || !customer) {
      result.errors.push('No se pudo cargar la configuración o el cliente');
      return result;
    }

    const { subject, message, telegramMsg, whatsappMsg } = buildMessage(event, config, customer, extra);

    // 1. Email (predeterminado / default)
    if (!onlyChannel || onlyChannel === 'email') {
      if (config.emailEnabled) {
        const emailResult = await sendEmail(config, customer.email, subject, message);
        if (emailResult.success) {
          result.emailSent = true;
        } else {
          result.errors.push(`Email: ${emailResult.error}`);
        }
      } else if (onlyChannel === 'email') {
        result.errors.push('Email: notificaciones por email desactivadas. Actívalas en Configuración.');
      }
    }

    // 2. Telegram (solo si el cliente tiene chatId y el negocio tiene bot token)
    if (!onlyChannel || onlyChannel === 'telegram') {
      if (customer.telegramChatId && config.telegramBotToken) {
        const tgResult = await sendTelegram(config, customer.telegramChatId, telegramMsg);
        if (tgResult.success) {
          result.telegramSent = true;
        } else {
          result.errors.push(`Telegram: ${tgResult.error}`);
        }
      } else if (onlyChannel === 'telegram') {
        if (!config.telegramBotToken) result.errors.push('Telegram: Bot Token no configurado. Ve a Configuración → Telegram Bot.');
        else if (!customer.telegramChatId) result.errors.push('Telegram: El cliente no tiene Telegram Chat ID. Edita el cliente y agrégalo.');
      }
    }

    // 3. WhatsApp CallMeBot (solo si el cliente tiene número y el negocio tiene API key)
    if (!onlyChannel || onlyChannel === 'whatsapp') {
      if (customer.whatsappPhone && config.whatsappEnabled && config.whatsappApiKey) {
        const waResult = await sendWhatsApp(config, customer.whatsappPhone, whatsappMsg);
        if (waResult.success) {
          result.whatsappSent = true;
        } else {
          result.errors.push(`WhatsApp: ${waResult.error}`);
        }
      } else if (onlyChannel === 'whatsapp') {
        if (!config.whatsappEnabled) result.errors.push('WhatsApp: notificaciones por WhatsApp desactivadas.');
        else if (!config.whatsappApiKey) result.errors.push('WhatsApp: API Key no configurada. Ve a Configuración → WhatsApp.');
        else if (!config.whatsappPhone) result.errors.push('WhatsApp: número de teléfono no configurado.');
        else if (!customer.whatsappPhone) result.errors.push('WhatsApp: el cliente no tiene número de WhatsApp. Edita el cliente y agrégalo.');
      }
    }

    // Log to NotificationQueue
    const channels: string[] = [];
    if (result.emailSent) channels.push('email');
    if (result.telegramSent) channels.push('telegram');
    if (result.whatsappSent) channels.push('whatsapp');

    for (const channel of channels) {
      await db.notificationQueue.create({
        data: {
          businessId,
          customerId,
          channel,
          subject,
          message,
          status: 'sent',
          sentAt: new Date(),
        },
      });
    }

    if (result.errors.length > 0) {
      console.error(`Notification errors for customer ${customerId}:`, result.errors);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    result.errors.push(`General: ${msg}`);
    console.error('Notify customer error:', msg);
  }

  return result;
}
