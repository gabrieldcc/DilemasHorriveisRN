import { create } from 'zustand';

interface AdminState {
  isUnlocked: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
}

const ADMIN_PIN = process.env.EXPO_PUBLIC_ADMIN_PIN;

export const useAdminStore = create<AdminState>((set) => ({
  isUnlocked: false,
  unlock: (pin) => {
    if (!ADMIN_PIN) {
      return false;
    }

    const isValid = pin === ADMIN_PIN;
    if (isValid) {
      set({ isUnlocked: true });
    }

    return isValid;
  },
  lock: () => set({ isUnlocked: false }),
}));

export function isAdminPinConfigured() {
  return Boolean(ADMIN_PIN);
}
