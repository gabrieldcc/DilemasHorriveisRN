# Firebase setup

## Arquivos adicionados no repositório

- `firestore.rules`
- `firestore.indexes.json`
- `remoteconfig.template.json`
- `firebase.json`

## O que já ficou pronto localmente

- O app já lê `Remote Config` com fallback local seguro.
- O app já aceita perguntas multilíngues no Firestore.
- O projeto já está apontando `firebase.json` para `firestore.rules` e `firestore.indexes.json`.

## O que você precisa fazer no Firebase Console

### 1. Habilitar Anonymous Auth

Firebase Console:
`Authentication` -> `Sign-in method` -> `Anonymous` -> `Enable`

Sem isso:
- favoritos não funcionam corretamente
- comentários podem falhar
- sugestões podem falhar
- comunidade/favoritos podem falhar em escrita

### 2. Publicar Remote Config

Você pode usar o conteúdo de `remoteconfig.template.json` como base.

No console:
`Run` -> `Remote Config`

Crie estes parâmetros:

- `game_modes_json`
- `feature_flags_json`
- `interstitial_frequency`
- `enable_ads`
- `ads_first_session_enabled`

### 3. Deploy das regras e índices

Com Firebase CLI autenticado no seu projeto:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Criar a estrutura de coleções

Coleções esperadas:

- `perguntas/{modo}/itens/{questionId}`
- `users/{uid}/favoritos/{favoriteId}`
- `comunidade_favoritas/{docId}`
- `sugestoes/{suggestionId}`
- `config/feature_flags`

Exemplo de pergunta:

```json
{
  "question": {
    "en": "Would you rather never use the internet again or never listen to music again?",
    "pt": "Você prefere nunca mais usar internet ou nunca mais ouvir música?",
    "es": "¿Preferirías no usar internet nunca más o no escuchar música otra vez?"
  },
  "optionA": {
    "en": "Never use the internet again",
    "pt": "Nunca mais usar internet",
    "es": "Nunca usar internet otra vez"
  },
  "optionB": {
    "en": "Never listen to music again",
    "pt": "Nunca mais ouvir música",
    "es": "Nunca escuchar música otra vez"
  },
  "titulo": "Would you rather never use the internet again or never listen to music again?",
  "opcaoA": "Never use the internet again",
  "opcaoB": "Never listen to music again"
}
```

## Atualizar perguntas multilíngue pelo CLI

1. Exporte o estado atual:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./<service-account>.json FIRESTORE_PROJECT_ID=<seu-project-id> node scripts/sync-questions.js export --out=perguntas-export.json
   ```

2. Edite `perguntas-export.json`, preencha `question`, `optionA`, `optionB` com `en`, `pt` e `es`.
3. Reimporte com `gcloud firestore import` (ou cole manualmente pelo console do Firebase).
4. Rode `npm run sync:questions` (ou `node scripts/sync-questions.js update`) para garantir que cada documento tem fallback para os campos multilíngues.

Se preferir traduzir antes de reimportar, edite o arquivo exportado e repita o passo 2 antes de rodar o passo 4.

## O que não é possível eu fazer daqui

### Publicar regras, índices e Remote Config

Eu não tenho acesso autenticado ao seu projeto Firebase nem ao console web.  
Você precisa executar:

```bash
firebase login
firebase use <seu-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

E publicar os parâmetros no Remote Config pelo console ou por automação autenticada.

### Tornar o admin realmente seguro só com PIN no app

Hoje o admin depende de PIN client-side. Isso não é segurança real.

Para deixar seguro de verdade, você precisa de um destes caminhos:

1. Custom Claims no Firebase Auth e validação nas `firestore.rules`
2. Cloud Functions para operações administrativas
3. Backend próprio para aprovar/remover perguntas

Sem isso, qualquer regra que permita escrita administrativa a usuários autenticados continua sendo apenas uma proteção parcial.

## Próximo passo recomendado

1. Habilitar Anonymous Auth
2. Publicar Remote Config
3. Deploy de regras/índices
4. Popular `perguntas/{modo}/itens`
5. Se quiser segurança real para admin, migrar as ações administrativas para Cloud Functions
