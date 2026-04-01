import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Helper: Send email via SMTP
async function sendEmail(to: string, subject: string, html: string, settings: Record<string, unknown>) {
  const transport = nodemailer.createTransport({
    host: settings.smtpHost as string,
    port: Number(settings.smtpPort) || 587,
    secure: Number(settings.smtpPort) === 465,
    auth: {
      user: settings.smtpUser as string,
      pass: settings.smtpPass as string,
    },
  });

  await transport.sendMail({
    from: (settings.smtpFrom as string) || (settings.smtpUser as string),
    to,
    subject,
    html,
  });
}

// Helper: Send Telegram message
async function sendTelegram(chatId: string, message: string, botToken: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  });
  if (!res.ok) throw new Error(`Telegram API error: ${res.status}`);
}

// Helper: Send WhatsApp via CallMeBot
async function sendWhatsApp(phone: string, message: string, apiKey: string, apiUrl?: string) {
  const baseUrl = apiUrl || 'https://api.callmebot.com/whatsapp.php';
  const url = `${baseUrl}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot API error: ${res.status}`);
}

export async function GET(request: Request) {
  try {
    // Auth via secret (query param for cron-job.org compatibility)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-cron-secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // =====================
    // 1. Auto-activate scheduled campaigns whose startsAt has passed
    // =====================
    const now = new Date();
    try {
      const scheduledCampaigns = await db.marketingCampaign.findMany({
        where: {
          status: 'scheduled',
          startsAt: { lte: now },
        },
      });

      for (const campaign of scheduledCampaigns) {
        // Get target customers
        let customers;
        switch (campaign.target) {
          case 'new': {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            customers = await db.customer.findMany({ where: { businessId: campaign.businessId, registeredAt: { gte: thirtyDaysAgo } } });
            break;
          }
          case 'inactive':
            customers = await db.customer.findMany({ where: { businessId: campaign.businessId, visitsCount: 0 } });
            break;
          case 'top':
            customers = await db.customer.findMany({ where: { businessId: campaign.businessId }, orderBy: { totalPoints: 'desc' }, take: 10 });
            break;
          case 'vip':
            customers = await db.customer.findMany({ where: { businessId: campaign.businessId, totalPoints: { gte: 50 } } });
            break;
          default:
            customers = await db.customer.findMany({ where: { businessId: campaign.businessId } });
        }

        // Determine channels (parse JSON array or single string)
        let channels: string[];
        try {
          const parsed = JSON.parse(campaign.channel);
          if (Array.isArray(parsed)) {
            channels = parsed.filter((c: unknown) => typeof c === 'string');
          } else {
            channels = [campaign.channel];
          }
        } catch {
          channels = [campaign.channel];
        }
        // Always include in_app if not present
        if (!channels.includes('in_app')) channels.push('in_app');

        let queuedCount = 0;
        for (const customer of customers) {
          for (const ch of channels) {
            await db.notificationQueue.create({
              data: {
                businessId: campaign.businessId,
                customerId: customer.id,
                channel: ch,
                subject: `📢 ${campaign.name}`,
                message: campaign.message,
                status: 'pending',
              },
            });
            queuedCount++;
          }
        }

        // Activate campaign and update count
        await db.marketingCampaign.update({
          where: { id: campaign.id },
          data: { status: 'active', sentCount: queuedCount },
        });
      }
    } catch (error) {
      console.error('Cron campaign activation error:', error);
    }

    // =====================
    // 2. Process pending notifications
    // =====================
    const notifications = await db.notificationQueue.findMany({
      where: { status: 'pending' },
      take: 100, // Batch limit
      include: {
        // We need to look up the business settings via businessId
      },
    });

    if (notifications.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending notifications', processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const notif of notifications) {
      try {
        // Get business settings for this notification
        const settings = await db.businessSettings.findUnique({
          where: { businessId: notif.businessId },
        });

        // Get customer info
        const customer = await db.customer.findUnique({
          where: { id: notif.customerId },
        });

        if (!customer || !settings) {
          await db.notificationQueue.update({
            where: { id: notif.id },
            data: { status: 'failed', attempts: { increment: 1 } },
          });
          failed++;
          continue;
        }

        const customerName = customer.name;

        // Process based on channel
        if (notif.channel === 'email' && settings.emailEnabled) {
          if (settings.smtpHost && settings.smtpUser && settings.smtpPass) {
            await sendEmail(
              customer.email,
              notif.subject || 'Notificación',
              `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:20px;border-radius:8px 8px 0 0">
                  <h2 style="margin:0">Royalty QR</h2>
                </div>
                <div style="padding:20px;background:white;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
                  <p>Hola <strong>${customerName}</strong>,</p>
                  <p>${notif.message}</p>
                </div>
              </div>`,
              settings as unknown as Record<string, unknown>
            );
          }
        } else if (notif.channel === 'telegram' && settings.telegramBotToken) {
          // Check if customer has telegram chat ID
          const chatId = customer.telegramChatId || settings.telegramChatId;
          if (chatId) {
            let msg = notif.message;
            // Replace template variables
            msg = msg.replace(/{name}/g, customerName);
            await sendTelegram(chatId, msg, settings.telegramBotToken);
          }
        } else if (notif.channel === 'whatsapp' && settings.whatsappEnabled) {
          // Check if customer has whatsapp phone
          const waPhone = customer.whatsappPhone || settings.whatsappPhone;
          const waApiKey = settings.whatsappApiKey;
          if (waPhone && waApiKey) {
            let msg = notif.message;
            msg = msg.replace(/{name}/g, customerName);
            await sendWhatsApp(
              waPhone,
              msg,
              waApiKey,
              settings.whatsappApiUrl || undefined
            );
          }
        } else if (notif.channel === 'in_app') {
          // In-app notifications are considered "sent" (no external delivery needed)
          // They can be shown in a notification center later
        } else {
          // Channel not configured, mark as failed
          await db.notificationQueue.update({
            where: { id: notif.id },
            data: { status: 'failed', attempts: { increment: 1 } },
          });
          failed++;
          continue;
        }

        // Mark as sent
        await db.notificationQueue.update({
          where: { id: notif.id },
          data: { status: 'sent', sentAt: new Date() },
        });
        processed++;
      } catch (error) {
        console.error(`Failed to send notification ${notif.id}:`, error);
        const newAttempts = notif.attempts + 1;
        await db.notificationQueue.update({
          where: { id: notif.id },
          data: {
            status: newAttempts >= 3 ? 'failed' : 'pending',
            attempts: newAttempts,
          },
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: notifications.length,
    });
  } catch (error) {
    console.error('Cron notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
