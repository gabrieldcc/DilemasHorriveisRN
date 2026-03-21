# Firebase setup for multilingual questions

This app now supports reading questions in Portuguese (`pt`), English (`en`), and Spanish (`es`) with these rules:

- App language comes from the device locale.
- If device locale is unsupported, app language falls back to `en`.
- If the requested language is missing in a question, it falls back to `en`.
- Legacy documents (`titulo`, `opcaoA`, `opcaoB` as strings) still work.

## Recommended Firestore structure

Collection path:
- `perguntas/{modo}/itens/{questionId}`

Document format (recommended):

```json
{
  "titulo": {
    "pt": "Quem vence essa batalha?",
    "en": "Who wins this battle?",
    "es": "Quien gana esta batalla?"
  },
  "opcaoA": {
    "pt": "Homem de Ferro",
    "en": "Iron Man",
    "es": "Iron Man"
  },
  "opcaoB": {
    "pt": "Batman",
    "en": "Batman",
    "es": "Batman"
  }
}
```

## Compatible alternatives also accepted

The app also reads these fallback variants if needed:

- `titulo_en`, `titulo_es`, `opcaoA_en`, `opcaoA_es`, etc.
- `tituloEn`, `tituloEs`, `opcaoAEn`, `opcaoAEs`, etc.

Use the recommended nested format (`pt/en/es`) as the standard going forward.
