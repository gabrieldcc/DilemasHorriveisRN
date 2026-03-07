import { ModoJogo, ModoJogoConteudo } from '../models/game';

export const CONTENT_GAME_MODES: Array<{ value: ModoJogoConteudo; label: string }> = [
  { value: ModoJogo.leve, label: 'Leve' },
  { value: ModoJogo.pesado, label: 'Pesado' },
  { value: ModoJogo.nerd, label: 'Nerd' },
];

export const EXTRA_GAME_MODES = [
  { value: ModoJogo.favoritas, label: 'Favoritas' },
  { value: ModoJogo.comunidade, label: 'Comunidade' },
] as const;

export const GAME_MODES = [...CONTENT_GAME_MODES, ...EXTRA_GAME_MODES];

export function isModoJogo(value: string): value is ModoJogo {
  return GAME_MODES.some((mode) => mode.value === value);
}

export function isModoJogoConteudo(value: ModoJogo): value is ModoJogoConteudo {
  return CONTENT_GAME_MODES.some((mode) => mode.value === value);
}

export function getModoLabel(modo: ModoJogo): string {
  const found = GAME_MODES.find((item) => item.value === modo);
  return found?.label ?? modo;
}
