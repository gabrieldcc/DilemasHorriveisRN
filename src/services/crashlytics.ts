import Constants from 'expo-constants';

type CrashlyticsInstance = {
  setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void> | void;
  log(message: string): void;
  recordError(error: Error): void;
};

let cachedCrashlytics: CrashlyticsInstance | null | undefined;

function isExpoGoRuntime() {
  return Constants.appOwnership === 'expo';
}

function getCrashlyticsInstance(): CrashlyticsInstance | null {
  if (cachedCrashlytics !== undefined) {
    return cachedCrashlytics;
  }

  if (isExpoGoRuntime()) {
    cachedCrashlytics = null;
    return cachedCrashlytics;
  }

  try {
    const moduleRef = require('@react-native-firebase/crashlytics');
    const factory = moduleRef.default ?? moduleRef;

    if (typeof factory !== 'function') {
      cachedCrashlytics = null;
      return cachedCrashlytics;
    }

    cachedCrashlytics = factory() as CrashlyticsInstance;
    return cachedCrashlytics;
  } catch (error) {
    cachedCrashlytics = null;
    if (__DEV__) {
      console.warn('[Crashlytics] Não disponível neste runtime.', error);
    }
    return cachedCrashlytics;
  }
}

export async function initializeCrashlytics(): Promise<boolean> {
  const crashlytics = getCrashlyticsInstance();
  if (!crashlytics) {
    if (__DEV__) {
      console.info('[Crashlytics] Ignorado (Expo Go ou módulo nativo indisponível).');
    }
    return false;
  }

  try {
    await crashlytics.setCrashlyticsCollectionEnabled(true);
    crashlytics.log('Crashlytics inicializado com sucesso.');
    if (__DEV__) {
      console.info('[Crashlytics] Inicializado.');
    }
    return true;
  } catch (error) {
    if (__DEV__) {
      console.error('[Crashlytics] Falha ao inicializar.', error);
    }
    return false;
  }
}

export function logCrashlyticsMessage(message: string): void {
  const crashlytics = getCrashlyticsInstance();
  if (!crashlytics) {
    return;
  }

  crashlytics.log(message);
}

export function recordCrashlyticsError(error: unknown, context?: string): void {
  const crashlytics = getCrashlyticsInstance();
  const normalized = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erro desconhecido');

  if (crashlytics) {
    if (context) {
      crashlytics.log(context);
    }
    crashlytics.recordError(normalized);
  }

  if (__DEV__) {
    if (context) {
      console.error(`[Crashlytics] ${context}`, normalized);
    } else {
      console.error('[Crashlytics] Erro registrado.', normalized);
    }
  }
}
