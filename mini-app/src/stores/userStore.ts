import { create } from 'zustand';
import type { SubscriptionDTO } from '../api/client';

interface UserState {
  subscription: SubscriptionDTO | null;
  setSubscription: (sub: SubscriptionDTO | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  subscription: null,
  setSubscription: (subscription) => set({ subscription }),
}));
