let questionCountInSession = 0;

export function resetSession() {
  questionCountInSession = 0;
}

export function incrementQuestionCount() {
  questionCountInSession += 1;
  return questionCountInSession;
}

export function getQuestionCount() {
  return questionCountInSession;
}

export function shouldShowAd(frequency: number) {
  if (frequency <= 0) {
    return false;
  }

  if (questionCountInSession <= 0) {
    return false;
  }

  return questionCountInSession % frequency === 0;
}

export function isFirstQuestion() {
  return questionCountInSession <= 1;
}
