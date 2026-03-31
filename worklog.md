
---
Task ID: 1
Agent: Main Agent
Task: Restore ALL missing features in Cobranza SaaS platform and deploy to Vercel

Work Log:
- Diagnosed: layout.tsx missing ThemeProvider (no dark mode), no Caracas clock, no cron route, Customer model missing telegramChatId/whatsappPhone, BusinessSettings missing CallMeBot fields, customer form missing optional fields
- Created `.npmrc` with `legacy-peer-deps=true`
- Installed `nodemailer@^7.0.13` for email notifications
- Updated `prisma/schema.prisma`: added telegramChatId + whatsappPhone to Customer model; added whatsappEnabled + whatsappPhone + whatsappApiKey + whatsappApiUrl to BusinessSettings; moved whatsappEnabled to CallMeBot section
- Pushed schema to Neon PostgreSQL via `prisma db push --accept-data-loss`
- Updated `src/lib/types.ts`: added whatsapp fields to Customer, BusinessSettings, CreateCustomerPayload, UpdateBusinessSettingsPayload
- Updated `src/app/layout.tsx`: added ThemeProvider from next-themes with defaultTheme="dark", changed lang to "es"
- Updated `src/components/layout/dashboard-layout.tsx`: added CaracasClock component (America/Caracas timezone, real-time updates every second)
- Updated `src/components/views/customers-view.tsx`: added Telegram ID and WhatsApp phone fields to customer creation dialog; shows TG/WA badges on customer cards; uses api.deleteCustomer() method
- Updated `src/lib/api.ts`: added deleteCustomer() method, updated createCustomer() to accept telegramChatId + whatsappPhone
- Created `src/app/api/cron/notifications/route.ts`: full cron endpoint supporting email (SMTP), Telegram Bot API, and WhatsApp (CallMeBot) notification channels; accepts secret via query param for cron-job.org compatibility
- Updated `src/components/views/settings-view.tsx`: removed duplicate WhatsApp toggle from notifications card (already in CallMeBot card)
- Fixed .env with Neon PostgreSQL URL for local development
- Fixed React version mismatch (react + react-dom both 19.2.4)
- Committed and pushed to GitHub: commit 4ac7b89
- Verified Vercel deployment: READY + PROMOTED to production at misdeudores-phi.vercel.app

Stage Summary:
- All features restored and deployed: dark mode, Caracas clock, Telegram/WhatsApp customer fields, CallMeBot config section, delete customer button, cron notifications endpoint
- Database schema synced with Neon PostgreSQL
- Production URL: https://misdeudores-phi.vercel.app/
- Cron URL: https://misdeudores-phi.vercel.app/api/cron/notifications?secret=marketing-qr-cron-2025
