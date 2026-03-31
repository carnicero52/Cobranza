import { db } from '@/lib/db';
import { notifyCustomer } from '@/lib/notification-service';

// =====================
// Vercel Cron Job: Scheduled Notifications
// Runs every 5 minutes to check:
// 1. Scheduled campaigns whose startsAt has arrived → activate & send
// 2. Active campaigns whose endsAt has passed → complete
// 3. Pending invoices due today or overdue → send reminders
//
// Timezone: America/Caracas (UTC-4)
// =====================

const TIMEZONE = 'America/Caracas';

function getCaracasNow(): Date {
  const now = new Date();
  // Format in Caracas timezone to get correct date
  const caracasStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(caracasStr);
}

function getCaracasDateStr(): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // YYYY-MM-DD format
}

function getCaracasTimeStr(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' }); // HH:MM
}

export async function GET(request: Request) {
  try {
    // Security: Vercel sends Authorization header with CRON_SECRET
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date(); // UTC for DateTime comparisons (campaigns use ISO)
    const todayCaracas = getCaracasDateStr(); // YYYY-MM-DD in Caracas for invoice date comparisons

    const results = {
      timezone: TIMEZONE,
      caracasDate: todayCaracas,
      caracasTime: getCaracasTimeStr(),
      campaignsActivated: 0,
      campaignsCompleted: 0,
      invoiceReminders: 0,
      errors: [] as string[],
    };

    console.log(`[CRON] Running at ${now.toISOString()} | Caracas: ${todayCaracas} ${results.caracasTime}`);

    // ========================================
    // 1. ACTIVATE SCHEDULED CAMPAIGNS
    // startsAt is stored as ISO/UTC DateTime → compare with UTC now
    // ========================================
    try {
      const scheduledCampaigns = await db.marketingCampaign.findMany({
        where: {
          status: 'scheduled',
          startsAt: { lte: now },
        },
      });

      for (const campaign of scheduledCampaigns) {
        try {
          // Update status to active
          await db.marketingCampaign.update({
            where: { id: campaign.id },
            data: { status: 'active' },
          });

          // Get target customers
          let customerIds = await db.customer.findMany({
            where: { businessId: campaign.businessId },
            select: { id: true },
          });

          switch (campaign.target) {
            case 'new': {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              customerIds = await db.customer.findMany({
                where: { businessId: campaign.businessId, registeredAt: { gte: weekAgo } },
                select: { id: true },
              });
              break;
            }
            case 'inactive': {
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              const activeTx = await db.transaction.groupBy({
                by: ['customerId'],
                where: { businessId: campaign.businessId, createdAt: { gte: monthAgo } },
                _count: { id: true },
              });
              const activeIds = new Set(activeTx.map(t => t.customerId));
              customerIds = customerIds.filter(c => !activeIds.has(c.id));
              break;
            }
            case 'top': {
              customerIds = await db.customer.findMany({
                where: { businessId: campaign.businessId },
                orderBy: { totalPoints: 'desc' },
                take: 10,
                select: { id: true },
              });
              break;
            }
            case 'vip': {
              customerIds = await db.customer.findMany({
                where: { businessId: campaign.businessId, totalPoints: { gte: 50 } },
                select: { id: true },
              });
              break;
            }
          }

          // Send notifications to target customers
          if (customerIds.length > 0) {
            const notifyResults = await Promise.allSettled(
              customerIds.map(c =>
                notifyCustomer(campaign.businessId, c.id, 'campaign_message', {
                  campaignMessage: campaign.message,
                })
              )
            );
            const sent = notifyResults.filter(r => r.status === 'fulfilled').length;
            await db.marketingCampaign.update({
              where: { id: campaign.id },
              data: { sentCount: sent },
            });
          }

          results.campaignsActivated++;
          console.log(`[CRON] Campaign "${campaign.name}" activated → ${customerIds.length} customers`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.errors.push(`Campaign ${campaign.id}: ${msg}`);
          console.error(`[CRON] Error activating campaign ${campaign.id}:`, msg);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`Scheduled campaigns check: ${msg}`);
      console.error('[CRON] Error checking scheduled campaigns:', msg);
    }

    // ========================================
    // 2. COMPLETE EXPIRED ACTIVE CAMPAIGNS
    // endsAt is stored as ISO/UTC DateTime → compare with UTC now
    // ========================================
    try {
      const expiredCampaigns = await db.marketingCampaign.findMany({
        where: {
          status: 'active',
          endsAt: { lte: now },
        },
      });

      for (const campaign of expiredCampaigns) {
        try {
          await db.marketingCampaign.update({
            where: { id: campaign.id },
            data: { status: 'completed' },
          });
          results.campaignsCompleted++;
          console.log(`[CRON] Campaign "${campaign.name}" completed (ended)`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.errors.push(`Complete campaign ${campaign.id}: ${msg}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`Complete campaigns check: ${msg}`);
      console.error('[CRON] Error completing campaigns:', msg);
    }

    // ========================================
    // 3. INVOICE REMINDERS (due today or overdue in Caracas)
    // dueDate is stored as plain string "YYYY-MM-DD" → compare with Caracas date
    // ========================================
    try {
      // Find invoices that:
      // - Are pending (not paid or cancelled)
      // - Have a due date set
      // - Due date <= today in Caracas timezone
      // - Haven't had a reminder sent yet
      const dueInvoices = await db.invoice.findMany({
        where: {
          status: { in: ['pending', 'partial'] },
          dueDate: { lte: todayCaracas },
          reminderSent: false,
        },
      });

      for (const invoice of dueInvoices) {
        try {
          // Parse customer IDs from JSON string
          let customerIds: string[] = [];
          if (invoice.customerIds) {
            try {
              const parsed = JSON.parse(invoice.customerIds);
              customerIds = Array.isArray(parsed) ? parsed : [];
            } catch {
              customerIds = invoice.customerIds.split(',').map(s => s.trim()).filter(Boolean);
            }
          }

          if (customerIds.length === 0) {
            // No customers assigned, mark as reminded to avoid re-checking
            await db.invoice.update({
              where: { id: invoice.id },
              data: { reminderSent: true, reminderSentAt: now },
            });
            continue;
          }

          // Determine if overdue (due date before today in Caracas)
          const isOverdue = invoice.dueDate && invoice.dueDate < todayCaracas;

          // Send reminder to each customer
          const notifyResults = await Promise.allSettled(
            customerIds.map(customerId =>
              notifyCustomer(invoice.businessId, customerId, 'invoice_reminder', {
                concept: invoice.concept,
                amount: `${invoice.currency} ${invoice.amount}`,
                dueDate: invoice.dueDate || '',
              })
            )
          );

          const sent = notifyResults.filter(r => r.status === 'fulfilled').length;

          // Mark as reminded after attempting to send
          if (sent > 0 || notifyResults.length > 0) {
            await db.invoice.update({
              where: { id: invoice.id },
              data: { reminderSent: true, reminderSentAt: now },
            });
            results.invoiceReminders++;
            console.log(`[CRON] Invoice reminder: "${invoice.concept}" (${isOverdue ? 'VENCIDA' : 'hoy'}) → ${sent} customers`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.errors.push(`Invoice ${invoice.id}: ${msg}`);
          console.error(`[CRON] Error sending invoice reminder for ${invoice.id}:`, msg);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.errors.push(`Invoice reminders check: ${msg}`);
      console.error('[CRON] Error checking invoice reminders:', msg);
    }

    console.log(`[CRON] Completed: ${results.campaignsActivated} campaigns, ${results.campaignsCompleted} completed, ${results.invoiceReminders} reminders`);

    return Response.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('[CRON] Fatal error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: `Cron error: ${msg}` }, { status: 500 });
  }
}

// Also support POST for cron (some systems use POST)
export async function POST(request: Request) {
  return GET(request);
}
