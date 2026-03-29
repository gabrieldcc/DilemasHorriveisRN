import { ModoJogo, ModoJogoConteudo } from '../models/game';
import { t } from '../i18n';

export const CONTENT_GAME_MODES: Array<{ value: ModoJogoConteudo }> = [
  { value: ModoJogo.leve },
  { value: ModoJogo.pesado },
  { value: ModoJogo.nerd },
  { value: ModoJogo.culturaBR },
  { value: ModoJogo.adultos },
];

export const EXTRA_GAME_MODES = [
  { value: ModoJogo.favoritas },
  { value: ModoJogo.comunidade },
] as const;

export const GAME_MODES = [...CONTENT_GAME_MODES, ...EXTRA_GAME_MODES];

export function isModoJogo(value: string): value is ModoJogo {
  return GAME_MODES.some((mode) => mode.value === value);
}

export function isModoJogoConteudo(value: ModoJogo): value is ModoJogoConteudo {
  return CONTENT_GAME_MODES.some((mode) => mode.value === value);
}

export function getModoLabel(modo: ModoJogo): string {
  if (modo === ModoJogo.leve) {
    return t('mode.leve');
  }
  if (modo === ModoJogo.pesado) {
    return t('mode.pesado');
  }
  if (modo === ModoJogo.nerd) {
    return t('mode.nerd');
  }
  if (modo === ModoJogo.culturaBR) {
    return t('mode.culturaBR');
  }
  if (modo === ModoJogo.adultos) {
    return t('mode.adultos');
  }
  if (modo === ModoJogo.favoritas) {
    return t('mode.favoritas');
  }
  if (modo === ModoJogo.comunidade) {
    return t('mode.comunidade');
  }
  return modo;
}
