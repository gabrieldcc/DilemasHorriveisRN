import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../i18n';

export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName: string;
}

const PROFILE_KEY = '@dilemas/user-profile';

function normalizePart(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function toNameCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildDisplayName(firstName: string, lastName: string): string {
  const normalizedFirst = toNameCase(normalizePart(firstName));
  const normalizedLast = toNameCase(normalizePart(lastName));
  return `${normalizedFirst} ${normalizedLast}`.trim();
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (!parsed.firstName || !parsed.lastName || !parsed.displayName) {
      return null;
    }

    return {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      displayName: parsed.displayName,
    };
  } catch {
    return null;
  }
}

export async function saveUserProfile(firstName: string, lastName: string): Promise<UserProfile> {
  const normalizedFirst = normalizePart(firstName);
  const normalizedLast = normalizePart(lastName);

  if (normalizedFirst.length < 2 || normalizedLast.length < 2) {
    throw new Error(t('error.profile.shortName'));
  }

  const profile: UserProfile = {
    firstName: toNameCase(normalizedFirst),
    lastName: toNameCase(normalizedLast),
    displayName: buildDisplayName(normalizedFirst, normalizedLast),
  };

  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
