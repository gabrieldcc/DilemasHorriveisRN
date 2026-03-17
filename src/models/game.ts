export const BUILTIN_MODE_IDS = {
  leve: 'leve',
  pesado: 'pesado',
  nerd: 'nerd',
  culturaBR: 'culturaBR',
  adultos: 'adultos',
  favoritas: 'favoritas',
  comunidade: 'comunidade',
} as const;

export type BuiltinModeId = (typeof BUILTIN_MODE_IDS)[keyof typeof BUILTIN_MODE_IDS];
export type ModoJogo = string;
export type ModoJogoConteudo = string;

export type LocaleCode = 'en' | 'pt' | 'es';
export type LocalizedText = Partial<Record<LocaleCode, string>>;

export interface PerguntaTextoLocalizado {
  en?: string;
  pt?: string;
  es?: string;
}

export interface Pergunta {
  id: string;
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modo: ModoJogo;
  question?: PerguntaTextoLocalizado;
  optionA?: PerguntaTextoLocalizado;
  optionB?: PerguntaTextoLocalizado;
}

export type OpcaoEscolha = 'A' | 'B';
