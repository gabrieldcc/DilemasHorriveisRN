import { useSyncExternalStore } from 'react';

import { BUILTIN_MODE_IDS, LocalizedText, ModoJogo } from '../models/game';

export interface TutorialPageConfig {
  title: LocalizedText;
  body: LocalizedText;
}

export interface TutorialConfig {
  enabled: boolean;
  pages: TutorialPageConfig[];
}

export interface ModeThemeConfig {
  accentColor?: string;
  backgroundColor?: string;
  cardColor?: string;
}

export interface GameModeConfig {
  id: string;
  enabled: boolean;
  title: LocalizedText;
  description: LocalizedText;
  questionsPerSession: number;
  showTimer: boolean;
  timerSeconds: number;
  allowSkip: boolean;
  questionCategory: string;
  tutorial: TutorialConfig | null;
  theme?: ModeThemeConfig;
  icon?: string;
  tag?: LocalizedText;
  supportsInfiltrado?: boolean;
}

export interface RemoteFeatureFlags {
  showFavoriteTipPopup: boolean;
  enableNewModes: boolean;
  enableSpecialEvents: boolean;
}

export interface RemoteAppConfig {
  gameModes: GameModeConfig[];
  featureFlags: RemoteFeatureFlags;
  interstitialFrequency: number;
  enableAds: boolean;
  adsFirstSessionEnabled: boolean;
}

const DEFAULT_GAME_MODES: GameModeConfig[] = [
  {
    id: BUILTIN_MODE_IDS.leve,
    enabled: true,
    title: { en: 'Light', pt: 'Leve', es: 'Ligero' },
    description: {
      en: 'Relaxed dilemmas to warm up the group.',
      pt: 'Dilemas descontraídos para aquecer o jogo.',
      es: 'Dilemas relajados para calentar el grupo.',
    },
    questionsPerSession: 10,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: false,
    questionCategory: BUILTIN_MODE_IDS.leve,
    tutorial: null,
    icon: '🎲',
    supportsInfiltrado: true,
  },
  {
    id: BUILTIN_MODE_IDS.pesado,
    enabled: true,
    title: { en: 'Intense', pt: 'Pesado', es: 'Pesado' },
    description: {
      en: 'High-pressure debates for fearless groups.',
      pt: 'Escolhas tensas para grupos sem medo de debate.',
      es: 'Elecciones tensas para grupos sin miedo al debate.',
    },
    questionsPerSession: 10,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: false,
    questionCategory: BUILTIN_MODE_IDS.pesado,
    tutorial: null,
    icon: '🔥',
    supportsInfiltrado: true,
  },
  {
    id: BUILTIN_MODE_IDS.nerd,
    enabled: true,
    title: { en: 'Geek', pt: 'Nerd', es: 'Geek' },
    description: {
      en: 'Pop culture, movies, shows and tech conflicts.',
      pt: 'Conflitos de cultura pop, filmes, séries e tecnologia.',
      es: 'Conflictos de cultura pop, cine, series y tecnología.',
    },
    questionsPerSession: 10,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: false,
    questionCategory: BUILTIN_MODE_IDS.nerd,
    tutorial: null,
    icon: '🧠',
    supportsInfiltrado: true,
  },
  {
    id: BUILTIN_MODE_IDS.culturaBR,
    enabled: true,
    title: { en: 'Brazil', pt: 'Cultura BR', es: 'Cultura BR' },
    description: {
      en: 'Brazilian references for group debates.',
      pt: 'Referências brasileiras para debate em grupo.',
      es: 'Referencias brasileñas para debatir en grupo.',
    },
    questionsPerSession: 10,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: false,
    questionCategory: BUILTIN_MODE_IDS.culturaBR,
    tutorial: null,
    icon: '🇧🇷',
    supportsInfiltrado: true,
  },
  {
    id: BUILTIN_MODE_IDS.adultos,
    enabled: true,
    title: { en: 'Adults', pt: 'Adultos', es: 'Adultos' },
    description: {
      en: 'Adult dilemmas for unfiltered groups.',
      pt: 'Dilemas para grupos adultos e debates sem filtro.',
      es: 'Dilemas para grupos adultos y debates sin filtro.',
    },
    questionsPerSession: 10,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: false,
    questionCategory: BUILTIN_MODE_IDS.adultos,
    tutorial: null,
    icon: '🔞',
    supportsInfiltrado: true,
  },
  {
    id: BUILTIN_MODE_IDS.favoritas,
    enabled: true,
    title: { en: 'Favorites', pt: 'Favoritas', es: 'Favoritas' },
    description: {
      en: 'Your saved dilemmas for replay anytime.',
      pt: 'Seus dilemas salvos para repetir quando quiser.',
      es: 'Tus dilemas guardados para repetir cuando quieras.',
    },
    questionsPerSession: 25,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: true,
    questionCategory: BUILTIN_MODE_IDS.favoritas,
    tutorial: {
      enabled: true,
      pages: [
        {
          title: { en: 'Favorites mode', pt: 'Modo Favoritas', es: 'Modo Favoritas' },
          body: {
            en: 'Saved questions stay here so you can replay the best debates.',
            pt: 'As perguntas salvas ficam aqui para você revisitar os melhores debates.',
            es: 'Las preguntas guardadas quedan aquí para revivir los mejores debates.',
          },
        },
      ],
    },
    icon: '⭐',
    tag: { en: 'YOUR PICKS', pt: 'SEUS PICKS', es: 'TUS PICKS' },
    supportsInfiltrado: false,
  },
  {
    id: BUILTIN_MODE_IDS.comunidade,
    enabled: true,
    title: { en: 'Community', pt: 'Comunidade', es: 'Comunidad' },
    description: {
      en: 'Most favorited questions from everyone.',
      pt: 'As perguntas mais favoritadas pela galera.',
      es: 'Las preguntas más guardadas por la comunidad.',
    },
    questionsPerSession: 25,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: true,
    questionCategory: BUILTIN_MODE_IDS.comunidade,
    tutorial: {
      enabled: true,
      pages: [
        {
          title: { en: 'Community mode', pt: 'Modo Comunidade', es: 'Modo Comunidad' },
          body: {
            en: 'Questions rise here as more players favorite them.',
            pt: 'As perguntas sobem aqui conforme mais pessoas favoritam.',
            es: 'Las preguntas suben aquí a medida que más personas las guardan.',
          },
        },
      ],
    },
    icon: '🌍',
    tag: { en: 'GLOBAL TOP', pt: 'TOP GLOBAL', es: 'TOP GLOBAL' },
    supportsInfiltrado: false,
  },
];

const DEFAULT_REMOTE_APP_CONFIG: RemoteAppConfig = {
  gameModes: DEFAULT_GAME_MODES,
  featureFlags: {
    showFavoriteTipPopup: true,
    enableNewModes: true,
    enableSpecialEvents: false,
  },
  interstitialFrequency: 5,
  enableAds: true,
  adsFirstSessionEnabled: false,
};

const RC_DEFAULTS = {
  interstitial_frequency: DEFAULT_REMOTE_APP_CONFIG.interstitialFrequency,
  enable_ads: DEFAULT_REMOTE_APP_CONFIG.enableAds,
  ads_first_session_enabled: DEFAULT_REMOTE_APP_CONFIG.adsFirstSessionEnabled,
  feature_flags_json: JSON.stringify({
    show_favorite_tip_popup: DEFAULT_REMOTE_APP_CONFIG.featureFlags.showFavoriteTipPopup,
    enable_new_modes: DEFAULT_REMOTE_APP_CONFIG.featureFlags.enableNewModes,
    enable_special_events: DEFAULT_REMOTE_APP_CONFIG.featureFlags.enableSpecialEvents,
  }),
  game_modes_json: JSON.stringify({
    game_modes: DEFAULT_GAME_MODES,
  }),
};

let remoteConfigModule: any = null;
let initialized = false;
let activationTried = false;
let snapshot: RemoteAppConfig = DEFAULT_REMOTE_APP_CONFIG;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getRemoteConfigInstance() {
  if (remoteConfigModule) {
    return remoteConfigModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remoteConfigModule = require('@react-native-firebase/remote-config').default();
  } catch (error) {
    if (__DEV__) {
      console.warn('[RemoteConfig] Native module unavailable, using local defaults.', error);
    }
    remoteConfigModule = null;
  }

  return remoteConfigModule;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, min), max);
}

function coerceLocalizedText(value: unknown, fallback: LocalizedText): LocalizedText {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const raw = value as Record<string, unknown>;
  const next: LocalizedText = {};
  if (typeof raw.en === 'string' && raw.en.trim()) {
    next.en = raw.en.trim();
  }
  if (typeof raw.pt === 'string' && raw.pt.trim()) {
    next.pt = raw.pt.trim();
  }
  if (typeof raw.es === 'string' && raw.es.trim()) {
    next.es = raw.es.trim();
  }
  return next.en || fallback.en ? { ...fallback, ...next } : fallback;
}

function coerceTutorial(value: unknown): TutorialConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const pages = Array.isArray(raw.pages)
    ? raw.pages
        .map((page) => {
          if (!page || typeof page !== 'object') {
            return null;
          }
          const data = page as Record<string, unknown>;
          return {
            title: coerceLocalizedText(data.title, { en: '' }),
            body: coerceLocalizedText(data.body, { en: '' }),
          };
        })
        .filter((page): page is TutorialPageConfig => Boolean(page?.title.en || page?.body.en))
    : [];

  return {
    enabled: raw.enabled !== false,
    pages,
  };
}

function coerceMode(raw: unknown): GameModeConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  if (typeof data.id !== 'string' || !data.id.trim()) {
    return null;
  }

  const fallback = DEFAULT_GAME_MODES.find((mode) => mode.id === data.id) ?? {
    id: data.id.trim(),
    enabled: true,
    title: { en: data.id.trim() },
    description: { en: '' },
    questionsPerSession: 10,
    showTimer: false,
    timerSeconds: 20,
    allowSkip: false,
    questionCategory: data.id.trim(),
    tutorial: null,
  };

  return {
    id: data.id.trim(),
    enabled: data.enabled !== false,
    title: coerceLocalizedText(data.title, fallback.title),
    description: coerceLocalizedText(data.description, fallback.description),
    questionsPerSession: clampNumber(data.questionsPerSession, fallback.questionsPerSession, 1, 100),
    showTimer: typeof data.showTimer === 'boolean' ? data.showTimer : fallback.showTimer,
    timerSeconds: clampNumber(data.timerSeconds, fallback.timerSeconds, 5, 180),
    allowSkip: typeof data.allowSkip === 'boolean' ? data.allowSkip : fallback.allowSkip,
    questionCategory:
      typeof data.questionCategory === 'string' && data.questionCategory.trim() ? data.questionCategory.trim() : fallback.questionCategory,
    tutorial: coerceTutorial(data.tutorial) ?? fallback.tutorial ?? null,
    theme: data.theme && typeof data.theme === 'object' ? (data.theme as ModeThemeConfig) : fallback.theme,
    icon: typeof data.icon === 'string' ? data.icon : fallback.icon,
    tag: data.tag ? coerceLocalizedText(data.tag, fallback.tag ?? {}) : fallback.tag,
    supportsInfiltrado:
      typeof data.supportsInfiltrado === 'boolean' ? data.supportsInfiltrado : fallback.supportsInfiltrado ?? true,
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseGameModesJson(value: string): GameModeConfig[] {
  const parsed = safeJsonParse(value) as { game_modes?: unknown[] } | null;
  const parsedModes = Array.isArray(parsed?.game_modes) ? parsed.game_modes.map(coerceMode).filter(Boolean) : [];
  return parsedModes.length > 0 ? (parsedModes as GameModeConfig[]) : DEFAULT_GAME_MODES;
}

function parseFeatureFlagsJson(value: string): RemoteFeatureFlags {
  const parsed = safeJsonParse(value) as Record<string, unknown> | null;
  return {
    showFavoriteTipPopup:
      typeof parsed?.show_favorite_tip_popup === 'boolean'
        ? parsed.show_favorite_tip_popup
        : DEFAULT_REMOTE_APP_CONFIG.featureFlags.showFavoriteTipPopup,
    enableNewModes:
      typeof parsed?.enable_new_modes === 'boolean'
        ? parsed.enable_new_modes
        : DEFAULT_REMOTE_APP_CONFIG.featureFlags.enableNewModes,
    enableSpecialEvents:
      typeof parsed?.enable_special_events === 'boolean'
        ? parsed.enable_special_events
        : DEFAULT_REMOTE_APP_CONFIG.featureFlags.enableSpecialEvents,
  };
}

function getBooleanValue(rc: any, key: keyof typeof RC_DEFAULTS, fallback: boolean) {
  if (!rc) {
    return fallback;
  }
  try {
    return rc.getValue(key).asBoolean();
  } catch {
    return fallback;
  }
}

function getNumberValue(rc: any, key: keyof typeof RC_DEFAULTS, fallback: number) {
  if (!rc) {
    return fallback;
  }
  try {
    return rc.getValue(key).asNumber();
  } catch {
    return fallback;
  }
}

function getStringValue(rc: any, key: keyof typeof RC_DEFAULTS, fallback: string) {
  if (!rc) {
    return fallback;
  }
  try {
    return rc.getValue(key).asString();
  } catch {
    return fallback;
  }
}

function buildSnapshot(rc: any): RemoteAppConfig {
  return {
    gameModes: parseGameModesJson(getStringValue(rc, 'game_modes_json', RC_DEFAULTS.game_modes_json)).filter((mode) => mode.enabled),
    featureFlags: parseFeatureFlagsJson(getStringValue(rc, 'feature_flags_json', RC_DEFAULTS.feature_flags_json)),
    interstitialFrequency: clampNumber(
      getNumberValue(rc, 'interstitial_frequency', DEFAULT_REMOTE_APP_CONFIG.interstitialFrequency),
      DEFAULT_REMOTE_APP_CONFIG.interstitialFrequency,
      1,
      20
    ),
    enableAds: getBooleanValue(rc, 'enable_ads', DEFAULT_REMOTE_APP_CONFIG.enableAds),
    adsFirstSessionEnabled: getBooleanValue(
      rc,
      'ads_first_session_enabled',
      DEFAULT_REMOTE_APP_CONFIG.adsFirstSessionEnabled
    ),
  };
}

export async function initRemoteConfig(): Promise<RemoteAppConfig> {
  if (initialized) {
    return snapshot;
  }

  const rc = getRemoteConfigInstance();

  try {
    if (rc) {
      await rc.setConfigSettings({ minimumFetchIntervalMillis: 30 * 60 * 1000 });
      await rc.setDefaults(RC_DEFAULTS);
      await rc.fetchAndActivate();
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[RemoteConfig] Failed to fetch+activate, using defaults.', error);
    }
  } finally {
    initialized = true;
    activationTried = true;
    snapshot = buildSnapshot(rc);
    emitChange();
  }

  return snapshot;
}

export function useRemoteAppConfig() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function getRemoteAppConfig(): RemoteAppConfig {
  return snapshot;
}

export function hasRemoteConfigActivated() {
  return activationTried;
}

export function getEnabledGameModes() {
  const config = getRemoteAppConfig();
  return config.featureFlags.enableNewModes ? config.gameModes : config.gameModes.filter((mode) => DEFAULT_GAME_MODES.some((item) => item.id === mode.id));
}

export function getGameModeById(modeId: ModoJogo) {
  return getEnabledGameModes().find((mode) => mode.id === modeId) ?? DEFAULT_GAME_MODES.find((mode) => mode.id === modeId);
}

export function isSpecialGameMode(modeId: ModoJogo) {
  return modeId === BUILTIN_MODE_IDS.favoritas || modeId === BUILTIN_MODE_IDS.comunidade;
}

export function getFeatureFlag(flag: keyof RemoteFeatureFlags) {
  return getRemoteAppConfig().featureFlags[flag];
}

export function getInterstitialFrequency() {
  return getRemoteAppConfig().interstitialFrequency;
}

export function areAdsEnabled() {
  return getRemoteAppConfig().enableAds;
}

export function isFirstSessionAdsEnabled() {
  return getRemoteAppConfig().adsFirstSessionEnabled;
}
