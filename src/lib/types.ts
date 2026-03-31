// =====================
// Business Types
// =====================
export interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  settings?: BusinessSettings;
  _count?: {
    customers: number;
    staff: number;
    rewards: number;
    transactions: number;
  };
}

export interface BusinessSettings {
  id: string;
  businessId: string;
  pointsPerPurchase: number;
  rewardGoal: number;
  notifyOnReward: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFrom: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramWelcomeMsg: string | null;
  telegramRewardMsg: string | null;
  // WhatsApp CallMeBot
  whatsappApiUrl: string | null;
  whatsappApiKey: string | null;
  whatsappPhone: string | null;
  // Anti-cheat
  cooldownMinutes: number;
  maxPointsPerDay: number;
  maxPointsPerVisit: number;
  antiCheatEnabled: boolean;
  // Marketing
  promoMessage: string | null;
  promoEnabled: boolean;
  referralEnabled: boolean;
  referralBonusPoints: number;
  // Billing
  plan: string;
  maxCustomers: number;
  maxStaff: number;
  maxRewards: number;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Customer Types
// =====================
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  telegramChatId: string | null;
  whatsappPhone: string | null;
  totalPoints: number;
  visitsCount: number;
  businessId: string;
  registeredAt: string;
  updatedAt: string;
}

// =====================
// Staff Types
// =====================
export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  businessId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Reward Types
// =====================
export interface Reward {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  requiredPoints: number;
  isActive: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Transaction Types
// =====================
export interface Transaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string | null;
  customerId: string;
  businessId: string;
  staffId: string | null;
  createdAt: string;
  customer?: Customer;
  staff?: Staff;
}

// =====================
// Redemption Types
// =====================
export interface RewardRedemption {
  id: string;
  customerId: string;
  rewardId: string;
  transactionId: string;
  redeemedAt: string;
  customer?: Customer;
  reward?: Reward;
}

// =====================
// Notification Types
// =====================
export interface NotificationItem {
  id: string;
  businessId: string;
  customerId: string;
  channel: string;
  subject: string | null;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  createdAt: string;
  sentAt: string | null;
}

// =====================
// Invoice (Cobranzas)
// =====================
export interface Invoice {
  id: string;
  businessId: string;
  concept: string;
  amount: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  dueHour: string | null;
  message: string | null;
  customerIds: string | null;
  reminderSent: boolean;
  reminderSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Marketing Campaign
// =====================
export interface MarketingCampaign {
  id: string;
  name: string;
  type: string;
  message: string;
  target: string;
  channel: string;
  status: string;
  sentCount: number;
  businessId: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Auth Types
// =====================
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  businessId: string;
  businessName: string;
  businessSlug: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  businessName: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// =====================
// Navigation / App Types
// =====================
export type AppView =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'customers'
  | 'rewards'
  | 'qrcode'
  | 'staff-panel'
  | 'transactions'
  | 'staff-management'
  | 'settings'
  | 'customer-detail'
  | 'customer-portal'
  | 'billing'
  | 'marketing';

// =====================
// Dashboard Stats
// =====================
export interface DashboardStats {
  totalCustomers: number;
  totalPoints: number;
  transactionsToday: number;
  rewardsRedeemed: number;
  pointsEarnedThisWeek: number;
  newCustomersThisMonth: number;
}

// =====================
// API Response Types
// =====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =====================
// Form Payloads
// =====================
export interface CreateCustomerPayload {
  name: string;
  email: string;
  phone?: string;
  telegramChatId?: string;
  whatsappPhone?: string;
}

export interface CreateRewardPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  requiredPoints: number;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
}

export interface EarnPointsPayload {
  customerId: string;
  points: number;
  description?: string;
}

export interface RedeemRewardPayload {
  customerId: string;
  rewardId: string;
}

export interface UpdateBusinessSettingsPayload {
  pointsPerPurchase?: number;
  rewardGoal?: number;
  notifyOnReward?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramWelcomeMsg?: string;
  telegramRewardMsg?: string;
  // WhatsApp CallMeBot
  whatsappApiUrl?: string;
  whatsappApiKey?: string;
  whatsappPhone?: string;
  cooldownMinutes?: number;
  maxPointsPerDay?: number;
  maxPointsPerVisit?: number;
  antiCheatEnabled?: boolean;
  promoMessage?: string;
  promoEnabled?: boolean;
  referralEnabled?: boolean;
  referralBonusPoints?: number;
  plan?: string;
  maxCustomers?: number;
  maxStaff?: number;
  maxRewards?: number;
}

export interface UpdateBusinessPayload {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  color?: string;
  logo?: string;
}

// Public types for customer portal
export interface PublicBusinessInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  color: string;
  address: string | null;
  promoMessage: string | null;
  promoEnabled: boolean;
  referralEnabled: boolean;
  referralBonusPoints: number;
  rewardGoal: number;
  pointsPerPurchase: number;
  cooldownMinutes: number;
}

export interface PublicCustomerData {
  id: string;
  name: string;
  totalPoints: number;
  visitsCount: number;
  rewardGoal: number;
  rewards: Reward[];
  recentTransactions: Transaction[];
}
