import { ModoJogo } from '../models/game';

export const GAME_MODES = [
  { value: ModoJogo.leve, label: 'Leve' },
  { value: ModoJogo.pesado, label: 'Pesado' },
  { value: ModoJogo.nerd, label: 'Nerd' },
  { value: ModoJogo.culturaBR, label: 'Cultura Brasileira' },
  { value: ModoJogo.adultos, label: 'Adultos' },
] as const;

export function isModoJogo(value: string): value is ModoJogo {
  return GAME_MODES.some((mode) => mode.value === value);
}

export function getModoLabel(modo: ModoJogo): string {
  const found = GAME_MODES.find((item) => item.value === modo);
  return found?.label ?? modo;
}
