const COMMON_ERRORS: Record<string, string> = {
  'permission-denied': 'Sem permissao para acessar o banco de dados.',
  'network-request-failed': 'Falha de rede. Verifique sua conexao e tente novamente.',
  unavailable: 'Servico temporariamente indisponivel. Tente novamente.',
};

export function parseFirebaseError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const code = error.code.replace('database/', '');
    return COMMON_ERRORS[code] ?? `Erro no Firebase (${code}).`;
  }

  return 'Ocorreu um erro inesperado.';
}
