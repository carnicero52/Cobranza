import { create } from 'zustand';
import type { AppView, Customer } from '@/lib/types';

interface AppState {
  currentView: AppView;
  selectedCustomerId: string | null;
  sidebarOpen: boolean;
  businessSlug: string;
  setView: (view: AppView) => void;
  setCustomerDetail: (customerId: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBusinessSlug: (slug: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  currentView: 'landing',
  selectedCustomerId: null,
  sidebarOpen: false,
  businessSlug: '',
  setView: (view: AppView) => set({ currentView: view, selectedCustomerId: view === 'customer-detail' ? undefined as unknown as string | null : null }),
  setCustomerDetail: (customerId: string) => set({ currentView: 'customer-detail', selectedCustomerId: customerId }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setBusinessSlug: (slug: string) => set({ businessSlug: slug }),
}));

// Store for cached data
interface DataState {
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  updateCustomerPoints: (customerId: string, points: number) => void;
}

export const useDataStore = create<DataState>()((set) => ({
  customers: [],
  setCustomers: (customers: Customer[]) => set({ customers }),
  updateCustomerPoints: (customerId: string, points: number) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, totalPoints: c.totalPoints + points } : c
      ),
    })),
}));
