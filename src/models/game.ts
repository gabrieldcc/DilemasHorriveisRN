export enum ModoJogo {
  leve = 'leve',
  pesado = 'pesado',
  nerd = 'nerd',
  culturaBR = 'culturaBR',
  adultos = 'adultos',
  favoritas = 'favoritas',
  comunidade = 'comunidade',
}

export type ModoJogoConteudo = Exclude<ModoJogo, ModoJogo.favoritas | ModoJogo.comunidade>;

export interface Pergunta {
  id: string;
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modo: ModoJogo;
}

export type OpcaoEscolha = 'A' | 'B';
