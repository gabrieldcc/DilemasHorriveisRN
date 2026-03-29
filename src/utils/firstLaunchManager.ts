import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@dh:first_launch_done';
let cachedFirstLaunch: boolean | null = null;

export async function isFirstLaunch(): Promise<boolean> {
  if (cachedFirstLaunch !== null) {
    return cachedFirstLaunch;
  }

  const stored = await AsyncStorage.getItem(KEY);
  const isFirst = stored !== '1';

  if (isFirst) {
    await AsyncStorage.setItem(KEY, '1');
  }

  cachedFirstLaunch = isFirst;
  return isFirst;
}
