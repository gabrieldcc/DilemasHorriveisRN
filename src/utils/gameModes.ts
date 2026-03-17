import { BUILTIN_MODE_IDS, ModoJogo, ModoJogoConteudo } from '../models/game';
import { getEnabledGameModes, getGameModeById, isSpecialGameMode } from '../config/remoteConfig';
import { getLocalizedTextSync } from '../i18n';

const SPECIAL_MODE_IDS = new Set<ModoJogo>([BUILTIN_MODE_IDS.favoritas, BUILTIN_MODE_IDS.comunidade]);

export function getAllModeIds(): ModoJogo[] {
  return getEnabledGameModes().map((mode) => mode.id);
}

export function getContentModeIds(): ModoJogoConteudo[] {
  return getEnabledGameModes()
    .filter((mode) => !isSpecialGameMode(mode.id))
    .map((mode) => mode.id);
}

export function isModoJogo(value: string): value is ModoJogo {
  return getAllModeIds().includes(value);
}

export function isModoJogoConteudo(value: ModoJogo): value is ModoJogoConteudo {
  return !SPECIAL_MODE_IDS.has(value);
}

export function getModoLabel(modo: ModoJogo): string {
  const mode = getGameModeById(modo);
  return getLocalizedTextSync(mode?.title, modo);
}

export function getModoQuestionSource(modo: ModoJogo): string {
  const mode = getGameModeById(modo);
  return mode?.questionCategory ?? modo;
}

export function getQuestionsPerSession(modo: ModoJogo): number {
  const mode = getGameModeById(modo);
  return mode?.questionsPerSession ?? 10;
}
