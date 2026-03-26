import { t } from '../i18n';

const COMMON_ERRORS: Record<string, string> = {
  'permission-denied': t('error.firebase.permission'),
  'network-request-failed': t('error.firebase.network'),
  unavailable: t('error.firebase.unavailable'),
  'configuration-not-found': t('error.firebase.authConfig'),
  'failed-precondition': t('error.firebase.failedPrecondition'),
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
    return t('error.firebase.communityIndex');
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const code = error.code.replace('database/', '').replace('auth/', '');
    return COMMON_ERRORS[code] ?? t('error.firebase.genericCode', { code });
  }

  return t('error.firebase.unknown');
}
