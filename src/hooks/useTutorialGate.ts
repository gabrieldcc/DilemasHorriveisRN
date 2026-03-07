import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_SEEN_KEY = '@dilemas/tutorial-seen';

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
