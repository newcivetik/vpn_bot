import { create } from 'zustand';
import type { SubscriptionDTO } from '../api/client';

interface UserState {
  subscription: SubscriptionDTO | null;
  firstName: string;
  setSubscription: (sub: SubscriptionDTO | null) => void;
  setFirstName: (name: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  subscription: null,
  firstName: '',
  setSubscription: (subscription) => set({ subscription }),
  setFirstName: (firstName) => set({ firstName }),
}));
