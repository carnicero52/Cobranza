import type { AuthUser } from '@/lib/types';

const API_BASE = '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('royalty-qr-auth');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || null;
    } catch {
      return null;
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.pathname + url.search;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...rest } = options;
    const url = this.buildUrl(path, params);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...customHeaders,
    };

    const res = await fetch(url, { ...rest, headers });

    if (!res.ok) {
      // Auto-logout on 401 (expired/invalid token)
      if (res.status === 401 && this.getToken()) {
        // Clear stored auth data directly from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('royalty-qr-auth');
          // Force page reload to reset all state
          window.location.reload();
          return new Promise(() => {}); // Never resolves, reload happens
        }
      }
      const error = await res.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(error.error || `Error ${res.status}`);
    }

    return res.json();
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Auth
  async register(data: { businessName: string; name: string; email: string; password: string; phone?: string }) {
    return this.post<{ token: string; user: AuthUser }>('/api/auth/register', data);
  }

  async login(email: string, password: string) {
    return this.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
  }

  // Business
  async getBusiness() {
    return this.get<{ success: boolean; data: import('@/lib/types').Business }>('/api/business');
  }

  async updateBusiness(data: Record<string, unknown>) {
    return this.put<{ success: boolean; data: import('@/lib/types').Business }>('/api/business', data);
  }

  async getBusinessSettings() {
    return this.get<{ success: boolean; data: import('@/lib/types').BusinessSettings }>('/api/business/settings');
  }

  async updateBusinessSettings(data: Record<string, unknown>) {
    return this.put<{ success: boolean; data: import('@/lib/types').BusinessSettings }>('/api/business/settings', data);
  }

  // Dashboard
  async getDashboardStats() {
    return this.get<{ success: boolean; data: import('@/lib/types').DashboardStats }>('/api/dashboard/stats');
  }

  async getDashboardChart() {
    return this.get<{ success: boolean; data: { date: string; points: number }[] }>('/api/dashboard/chart');
  }

  // Customers
  async getCustomers(search?: string) {
    return this.get<{ success: boolean; data: import('@/lib/types').Customer[] }>(
      '/api/customers',
      search ? { search } : undefined
    );
  }

  async createCustomer(data: { name: string; email: string; phone?: string; telegramChatId?: string; whatsappPhone?: string }) {
    return this.post<{ success: boolean; data: import('@/lib/types').Customer }>('/api/customers', data);
  }

  async getCustomer(id: string) {
    return this.get<{ success: boolean; data: import('@/lib/types').Customer & { transactions: import('@/lib/types').Transaction[] } }>(
      `/api/customers/${id}`
    );
  }

  async deleteCustomer(id: string) {
    return this.delete<{ success: boolean; message: string }>(`/api/customers/${id}`);
  }

  // Transactions
  async getTransactions(params?: { page?: string; limit?: string; type?: string }) {
    return this.get<{ success: boolean; data: import('@/lib/types').Transaction[]; pagination: { total: number; page: number; limit: number } }>(
      '/api/transactions',
      params
    );
  }

  async earnPoints(customerId: string, points: number, description?: string) {
    return this.post<{ success: boolean; data: import('@/lib/types').Transaction }>('/api/transactions/earn', {
      customerId,
      points,
      description,
    });
  }

  async redeemReward(customerId: string, rewardId: string) {
    return this.post<{ success: boolean; data: import('@/lib/types').Transaction }>('/api/transactions/redeem', {
      customerId,
      rewardId,
    });
  }

  // Rewards
  async getRewards() {
    return this.get<{ success: boolean; data: import('@/lib/types').Reward[] }>('/api/rewards');
  }

  async createReward(data: { name: string; description?: string; requiredPoints: number }) {
    return this.post<{ success: boolean; data: import('@/lib/types').Reward }>('/api/rewards', data);
  }

  async updateReward(id: string, data: Record<string, unknown>) {
    return this.put<{ success: boolean; data: import('@/lib/types').Reward }>(`/api/rewards/${id}`, data);
  }

  async deleteReward(id: string) {
    return this.delete<{ success: boolean }>(`/api/rewards/${id}`);
  }

  // Staff
  async getStaff() {
    return this.get<{ success: boolean; data: import('@/lib/types').Staff[] }>('/api/staff');
  }

  async createStaff(data: { name: string; email: string; password: string; role: string }) {
    return this.post<{ success: boolean; data: import('@/lib/types').Staff }>('/api/staff', data);
  }

  async deleteStaff(id: string) {
    return this.delete<{ success: boolean }>(`/api/staff/${id}`);
  }

  // Public (no auth required)
  async getPublicBusiness(slug: string) {
    return this.get<{ success: boolean; data: import('@/lib/types').PublicBusinessInfo }>(
      `/api/public/business`,
      { slug }
    );
  }

  async lookupCustomer(email: string, businessId: string) {
    return this.post<{ success: boolean; data: import('@/lib/types').PublicCustomerData }>(
      '/api/public/customer/lookup',
      { email, businessId }
    );
  }

  async publicEarnPoints(email: string, businessId: string) {
    return this.post<{
      success: boolean;
      data: {
        pointsEarned: number;
        totalPoints: number;
        visitsCount: number;
        rewardGoal: number;
        nextRewardIn: number;
        goalReached: boolean;
      };
    }>('/api/public/earn', { email, businessId });
  }

  // Campaigns
  async getCampaigns() {
    return this.get<{ success: boolean; data: import('@/lib/types').MarketingCampaign[] }>('/api/campaigns');
  }

  async createCampaign(data: { name: string; type: string; message: string; target: string; channel: string; startsAt?: string; endsAt?: string }) {
    return this.post<{ success: boolean; data: import('@/lib/types').MarketingCampaign }>('/api/campaigns', data);
  }

  async updateCampaign(id: string, data: Record<string, unknown>) {
    return this.put<{ success: boolean; data: import('@/lib/types').MarketingCampaign }>(`/api/campaigns/${id}`, data);
  }

  async deleteCampaign(id: string) {
    return this.delete<{ success: boolean }>(`/api/campaigns/${id}`);
  }

  // Invoices (Cobranzas)
  async getInvoices() {
    return this.get<{ success: boolean; data: import('@/lib/types').Invoice[] }>('/api/invoices');
  }

  async createInvoice(data: { concept: string; amount: number; currency?: string; issueDate: string; dueDate?: string; dueHour?: string; message?: string }) {
    return this.post<{ success: boolean; data: import('@/lib/types').Invoice }>('/api/invoices', data);
  }

  async updateInvoice(id: string, data: Record<string, unknown>) {
    return this.put<{ success: boolean; data: import('@/lib/types').Invoice }>(`/api/invoices/${id}`, data);
  }

  async deleteInvoice(id: string) {
    return this.delete<{ success: boolean }>(`/api/invoices/${id}`);
  }
}

export const api = new ApiClient();
