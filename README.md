# alarysai · web admin

Painel web da alarysai. Hospedado na **Vercel** e conectado ao projeto **Firebase `alarysai-b6e85`** (conta `alarysbr@gmail.com`), que também vai servir de backend para os apps mobile que virão depois.

- Produção: https://web-admin-theta-sage.vercel.app (projeto Vercel `alarys-ai/web-admin`). As URLs de cada deploy (`web-admin-<hash>-alarys-ai.vercel.app`) ficam atrás da Deployment Protection da Vercel.

## Stack

| Item | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, `src/`) |
| Estilo | Tailwind CSS 4 |
| Backend | Firebase: Authentication, Firestore, Storage |
| Hospedagem | Vercel |
| Testes | Vitest |

> Next.js 16 tem mudanças incompatíveis com versões anteriores. Antes de usar uma API, leia a documentação em `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## Estrutura

```
src/
  app/
    page.tsx              # página inicial (mostra o status do Firebase)
    api/health/route.ts   # GET /api/health: testa o Admin SDK → Firestore
  components/
    FirebaseStatus.tsx    # status do SDK cliente
  lib/firebase/
    config.ts             # leitura e validação das variáveis de ambiente (funções puras)
    config.test.ts        # testes de config.ts
    client.ts             # SDK do navegador: Auth, Firestore, Storage
    admin.ts              # Admin SDK, só no servidor (`server-only`)
firebase.json             # aponta para as regras e os índices (deploy via Firebase CLI)
.firebaserc               # projeto padrão: alarysai-b6e85
firestore.rules           # regras do Firestore (começam fechadas)
storage.rules             # regras do Storage (começam fechadas)
firestore.indexes.json
```

### Dois jeitos de acessar o Firebase

- **`lib/firebase/client.ts`**: roda no navegador e segue as *security rules*. Use em Client Components (por exemplo, login com Firebase Auth).
- **`lib/firebase/admin.ts`**: roda só no servidor (Route Handlers, Server Actions, Server Components), usa a service account e **ignora as security rules**. O import `server-only` faz o build falhar se esse arquivo for parar num Client Component.

### Regras de segurança

`firestore.rules` e `storage.rules` começam negando todo acesso pelo SDK cliente. Enquanto isso, o painel usa o Admin SDK. Quando um app (ou o próprio painel) precisar de acesso direto, abra a coleção ou o caminho específico nas regras e publique:

```bash
firebase deploy --only firestore:rules,storage
```

## Configuração

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local`. Os valores públicos (`NEXT_PUBLIC_FIREBASE_*`) saem de:

```bash
firebase apps:sdkconfig WEB --project alarysai-b6e85
```

Para as credenciais do Admin SDK (`FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`), vá em Console Firebase → Configurações do projeto → Contas de serviço → **Gerar nova chave privada**. Coloque a chave entre aspas, com `\n` no lugar das quebras de linha. **Nunca faça commit do JSON da service account** (o `.gitignore` já bloqueia `*-firebase-adminsdk-*.json` e `.env*`).

| Variável | Onde é usada | Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | navegador e servidor | não (são identificadores públicos; a proteção vem das rules) |
| `FIREBASE_PROJECT_ID` | Admin SDK | não |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK | sim |
| `FIREBASE_PRIVATE_KEY` | Admin SDK | **sim** |

As variáveis `NEXT_PUBLIC_*` entram no bundle **em tempo de build**. Se mudar alguma na Vercel, faça um novo deploy.

### 2. Serviços no Console Firebase (uma vez)

1. **Firestore**: ✅ criado em 2026-10-02 pelo console, banco `(default)`, edição Standard, região `southamerica-east1` (São Paulo).
   > ⚠️ Se o banco não existir, `firebase deploy --only firestore` o cria **sozinho na região `nam5` (EUA)**, e a região não pode ser trocada depois. Em um projeto novo, crie o banco antes de fazer deploy de regras: `firebase firestore:databases:create "(default)" --location southamerica-east1 --project <id>`.
2. **Authentication**: Build → Authentication → Começar → ativar os provedores desejados (por exemplo, e-mail/senha e Google). Depois do primeiro deploy, adicione o domínio de produção da Vercel (`web-admin-theta-sage.vercel.app`) em *Authorized domains*.
3. **Storage**: Build → Storage → Começar. Exige o plano **Blaze** (pago conforme o uso).
4. Publique as regras: `firebase deploy --only firestore:rules,storage`.

### 3. Vercel

1. Em vercel.com → **Add New… → Project**, importe o repositório `alarysai/web_admin` do GitHub (o framework Next.js é detectado sozinho).
2. Em **Environment Variables**, cadastre todas as variáveis do `.env.example` (Production, Preview e Development).
3. Faça o deploy. Cada push na `main` vira deploy de produção, e cada PR ganha um preview.
4. Abra `https://<seu-domínio>/api/health`. A resposta deve ser `{"firebase":"ok"}`.

## Comandos

```bash
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm test           # Vitest
```

## Testes

- `src/lib/firebase/config.test.ts`: validação da config do cliente (chaves ausentes ou em branco, espaços nas pontas) e das credenciais do Admin SDK (conversão de `\n` na chave privada, variáveis ausentes).
- Verificação manual: a página inicial mostra "Firebase conectado ao projeto alarysai-b6e85", e `/api/health` responde `ok` quando a service account está configurada.

## Apps futuros

Os apps Android/iOS devem ser registrados **no mesmo projeto Firebase `alarysai-b6e85`** (`firebase apps:create ANDROID|IOS --project alarysai-b6e85`). Assim, todos compartilham Auth, Firestore e Storage. Quando o schema do Firestore surgir, documente as coleções aqui e mantenha as regras em `firestore.rules` como fonte única.
