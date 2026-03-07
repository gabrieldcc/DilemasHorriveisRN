const COMMON_ERRORS: Record<string, string> = {
  'permission-denied': 'Sem permissao para acessar o banco de dados.',
  'network-request-failed': 'Falha de rede. Verifique sua conexao e tente novamente.',
  unavailable: 'Servico temporariamente indisponivel. Tente novamente.',
  'configuration-not-found': 'Autenticacao anonima nao habilitada no Firebase.',
  'failed-precondition': 'Configuracao pendente no Firebase para concluir esta operacao.',
};

export function parseFirebaseError(error: unknown): string {
  const rawMessage =
    typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes('requires an index') ||
    normalizedMessage.includes('query requires') ||
    normalizedMessage.includes('failed_precondition') ||
    normalizedMessage.includes('collection group') ||
    normalizedMessage.includes('collectiongroup') ||
    normalizedMessage.includes('single field index') ||
    normalizedMessage.includes('firestore.googleapis.com')
  ) {
    return 'Modo Comunidade indisponivel no momento. Falta ajustar o indice do Firestore para ranking por favoritos.';
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const code = error.code.replace('database/', '').replace('auth/', '');
    return COMMON_ERRORS[code] ?? `Erro no Firebase (${code}).`;
  }

  return 'Ocorreu um erro inesperado.';
}
