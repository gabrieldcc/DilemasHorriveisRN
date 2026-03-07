import AsyncStorage from '@react-native-async-storage/async-storage';

import { ModoJogo } from '../models/game';

const TUTORIAL_SEEN_KEY = '@dilemas/tutorial-seen';
const MODE_TUTORIAL_SEEN_PREFIX = '@dilemas/tutorial-mode-seen:';

const SPECIAL_MODE_TUTORIALS = new Set<ModoJogo>([ModoJogo.favoritas, ModoJogo.comunidade]);

export async function hasSeenTutorial(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function markTutorialAsSeen(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, '1');
}

export function requiresModeSpecificTutorial(modo: ModoJogo): boolean {
  return SPECIAL_MODE_TUTORIALS.has(modo);
}

export async function hasSeenModeTutorial(modo: ModoJogo): Promise<boolean> {
  if (!requiresModeSpecificTutorial(modo)) {
    return true;
  }

  const key = `${MODE_TUTORIAL_SEEN_PREFIX}${modo}`;
  const value = await AsyncStorage.getItem(key);
  return value === '1';
}

export async function markModeTutorialAsSeen(modo: ModoJogo): Promise<void> {
  if (!requiresModeSpecificTutorial(modo)) {
    return;
  }

  const key = `${MODE_TUTORIAL_SEEN_PREFIX}${modo}`;
  await AsyncStorage.setItem(key, '1');
}
