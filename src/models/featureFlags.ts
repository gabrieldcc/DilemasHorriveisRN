export interface FeatureFlags {
  commentsEnabled: boolean;
  suggestButtonEnabled: boolean;
  modeLeveEnabled: boolean;
  modePesadoEnabled: boolean;
  modeNerdEnabled: boolean;
  modeCulturaBREnabled: boolean;
  modeAdultosEnabled: boolean;
  modeFavoritasEnabled: boolean;
  modeComunidadeEnabled: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  commentsEnabled: true,
  suggestButtonEnabled: true,
  modeLeveEnabled: true,
  modePesadoEnabled: true,
  modeNerdEnabled: true,
  modeCulturaBREnabled: true,
  modeAdultosEnabled: true,
  modeFavoritasEnabled: true,
  modeComunidadeEnabled: true,
};
