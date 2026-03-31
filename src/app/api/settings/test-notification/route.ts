import { db } from '@/lib/db';
import { getAuthUser, extractTokenFromHeader } from '@/lib/auth';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await getAuthUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { channel } = body;

    if (!channel || !['email', 'telegram', 'whatsapp'].includes(channel)) {
      return NextResponse.json({ error: 'Canal inválido. Usa: email, telegram o whatsapp' }, { status: 400 });
    }

    const settings = await db.businessSettings.findUnique({
      where: { businessId: user.businessId },
    });

    if (!settings) {
      return NextResponse.json({ error: 'Configuración no encontrada. Guarda la configuración primero.' }, { status: 400 });
    }

    const testMessage = `🔔 Prueba de notificación desde Royalty QR\n\nNegocio: ${user.businessName}\nCanal: ${channel}\nFecha: ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}\n\n¡La notificación funciona correctamente!`;

    if (channel === 'email') {
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
        return NextResponse.json({ error: 'Configura SMTP primero (servidor, usuario y contraseña)' }, { status: 400 });
      }

      try {
        const transport = nodemailer.createTransport({
          host: settings.smtpHost,
          port: Number(settings.smtpPort) || 587,
          secure: Number(settings.smtpPort) === 465,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass,
          },
        });

        await transport.sendMail({
          from: (settings.smtpFrom as string) || settings.smtpUser,
          to: settings.smtpUser, // Send to the configured SMTP user for testing
          subject: '🔔 Royalty QR - Prueba de Notificación',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:20px;border-radius:8px 8px 0 0">
                <h2 style="margin:0">Royalty QR</h2>
                <p style="margin:4px 0 0;opacity:0.9">Prueba de Notificación por Email</p>
              </div>
              <div style="padding:20px;background:#fff;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
                <p>Hola <strong>${user.name}</strong>,</p>
                <p style="margin:12px 0;padding:12px;background:#fef3c7;border-radius:6px;border-left:4px solid #f59e0b">
                  ¡Esta es una <strong>prueba de notificación</strong> desde tu plataforma Royalty QR.
                </p>
                <p style="color:#6b7280;font-size:14px">
                  Negocio: <strong>${user.businessName}</strong><br>
                  Canal: Email (SMTP)<br>
                  Fecha: ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}
                </p>
                <p style="margin-top:20px;color:#16a34a;font-weight:bold">✅ ¡La notificación por email funciona correctamente!</p>
              </div>
            </div>
          `,
        });

        return NextResponse.json({ success: true, message: 'Email de prueba enviado correctamente' });
      } catch (error) {
        console.error('Email test error:', error);
        return NextResponse.json({
          error: 'Error al enviar email. Verifica tus credenciales SMTP.',
          details: error instanceof Error ? error.message : 'Error desconocido',
        }, { status: 500 });
      }
    }

    if (channel === 'telegram') {
      if (!settings.telegramBotToken || !settings.telegramChatId) {
        return NextResponse.json({ error: 'Configura el Bot Token y Chat ID de Telegram primero' }, { status: 400 });
      }

      try {
        const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: settings.telegramChatId,
            text: `🔔 *Prueba de Royalty QR*\n\nNegocio: ${user.businessName}\nCanal: Telegram\nFecha: ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}\n\n✅ ¡La notificación por Telegram funciona correctamente!`,
            parse_mode: 'Markdown',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return NextResponse.json({
            error: 'Error de Telegram API',
            details: errData.description || `Status ${res.status}`,
          }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Mensaje de prueba enviado por Telegram' });
      } catch (error) {
        console.error('Telegram test error:', error);
        return NextResponse.json({
          error: 'Error al enviar mensaje por Telegram.',
          details: error instanceof Error ? error.message : 'Error desconocido',
        }, { status: 500 });
      }
    }

    if (channel === 'whatsapp') {
      if (!settings.whatsappPhone || !settings.whatsappApiKey) {
        return NextResponse.json({ error: 'Configura el número de WhatsApp y API Key de CallMeBot primero' }, { status: 400 });
      }

      try {
        const waMessage = `🔔 *Prueba Royalty QR*\n\nNegocio: ${user.businessName}\nCanal: WhatsApp (CallMeBot)\nFecha: ${new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })}\n\n✅ Notificación WhatsApp funciona!`;
        const baseUrl = settings.whatsappApiUrl || 'https://api.callmebot.com/whatsapp.php';
        const url = `${baseUrl}?phone=${encodeURIComponent(settings.whatsappPhone)}&text=${encodeURIComponent(waMessage)}&apikey=${encodeURIComponent(settings.whatsappApiKey)}`;
        const res = await fetch(url);

        if (!res.ok) {
          return NextResponse.json({
            error: 'Error de CallMeBot API. Verifica tu número y API Key.',
            details: `Status ${res.status}`,
          }, { status: 500 });
        }

        const responseText = await res.text();
        return NextResponse.json({ success: true, message: 'Mensaje de prueba enviado por WhatsApp', details: responseText });
      } catch (error) {
        console.error('WhatsApp test error:', error);
        return NextResponse.json({
          error: 'Error al enviar mensaje por WhatsApp.',
          details: error instanceof Error ? error.message : 'Error desconocido',
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Canal no soportado' }, { status: 400 });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
