# alarysai · web admin

Painel web da alarysai. Hospedado na **Vercel** e conectado ao projeto **Firebase `alarysai-b6e85`** (conta `alarysbr@gmail.com`), que também vai servir de backend para os apps mobile que virão depois.

- Produção: https://web-admin-theta-sage.vercel.app (projeto Vercel `alarys-ai/web-admin`). As URLs de cada deploy (`web-admin-<hash>-alarys-ai.vercel.app`) ficam atrás da Deployment Protection da Vercel.

## Stack

| Item | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, `src/`) |
| Estilo | Tailwind CSS 4 |
| Backend | Firebase: Authentication, Firestore, Storage |
| Hospedagem | Vercel (Node.js 24, fixado em `engines.node`) |
| Sessão | Cookie `httpOnly` assinado com `jose` (HS256) |
| Testes | Vitest + Testing Library (jsdom) |

> Next.js 16 tem mudanças incompatíveis com versões anteriores. Antes de usar uma API, leia a documentação em `node_modules/next/dist/docs/` (ver `AGENTS.md`).

> **`firebase-admin/auth` não carrega na Vercel.** A cadeia `firebase-admin/auth` → `jwks-rsa` → `jose` 6 (só ES Module) falha com `ERR_REQUIRE_ESM`, mesmo com Node v24.21.0, porque o runtime do Turbopack carrega o pacote externo com `require()`. Por isso:
> - o login **não usa** `firebase-admin/auth`: o ID token é validado com o `jose` direto, que o Next empacota normalmente (ver [Acesso do administrador](#acesso-do-administrador));
> - cada serviço do Admin SDK fica num módulo separado, e só `lib/firebase/admin/auth.ts` puxa o `jose` via `firebase-admin`. Não importe esse módulo em rotas até o problema ser resolvido e testado na Vercel.
>
> O `package.json` fixa `"engines": { "node": "24.x" }`, igual ao ambiente local.

## Estrutura

```
src/
  proxy.ts                # checagem rápida do cookie de sessão → redireciona para /login
  app/
    login/page.tsx        # tela de login (pública)
    (painel)/layout.tsx   # exige admin ativo (requireAdmin) + cabeçalho com "Sair"
    (painel)/page.tsx     # início do painel
    api/health/route.ts   # GET /api/health: testa o Admin SDK → Firestore
    api/session/route.ts  # POST cria a sessão do admin · DELETE faz logout
  features/auth/
    domain/               # regras: createAdminSession, safeRedirectPath, tipos
    data/                 # session-token (cookie JWT), firebase-id-token (jose),
                          # admins-repository (Firestore), admin-sign-in (navegador)
    server/               # session-cookie (nome/opções), current-admin (getCurrentAdmin/requireAdmin)
    presentation/         # LoginForm, LogoutButton, mensagens de erro
  components/
    FirebaseStatus.tsx    # status do SDK cliente
  lib/firebase/
    config.ts             # leitura e validação das variáveis de ambiente (funções puras)
    config.test.ts        # testes de config.ts
    client.ts             # SDK do navegador: Auth, Firestore, Storage
    admin/                # Admin SDK, só no servidor (`server-only`)
      app.ts              #   app com a service account
      firestore.ts        #   getAdminFirestore()
      auth.ts             #   getAdminAuth() (carrega o `jose`, que é só ESM)
      storage.ts          #   getAdminStorage()
firebase.json             # aponta para as regras e os índices (deploy via Firebase CLI)
.firebaserc               # projeto padrão: alarysai-b6e85
firestore.rules           # regras do Firestore (ver docs/data-model.md)
storage.rules             # regras do Storage (ver docs/data-model.md)
firestore.indexes.json    # índices das consultas dos apps
docs/data-model.md        # modelo de dados: coleções, campos, permissões, Storage
rules-tests/              # testes das regras no emulador (npm run test:rules)
```

### Dois jeitos de acessar o Firebase

- **`lib/firebase/client.ts`**: roda no navegador e segue as *security rules*. Use em Client Components (por exemplo, login com Firebase Auth).
- **`lib/firebase/admin/*`**: roda só no servidor (Route Handlers, Server Actions, Server Components), usa a service account e **ignora as security rules**. O import `server-only` faz o build falhar se algum desses arquivos for parar num Client Component. Cada serviço fica no seu próprio módulo para a rota carregar só o que usa. Importe `admin/auth` apenas onde precisar de Auth, porque ele puxa o `jose` (ver a pendência acima).

## Acesso do administrador

Só entra no painel quem (1) faz login no Firebase Auth com e-mail e senha **e** (2) tem um documento ativo em `admins/{uid}` no Firestore.

### Fluxo

1. `/login` → `LoginForm` chama `signInWithEmailAndPassword` e manda o ID token para `POST /api/session`.
2. A rota valida o ID token com o `jose` contra as chaves públicas do Google. Ela confere a assinatura, o `iss` (`https://securetoken.google.com/<projectId>`), o `aud` (o projectId), a expiração e o `auth_time`. Depois aplica a regra `createAdminSession`: o usuário precisa ter `admins/{uid}` com `active: true`.
3. Se passar, o servidor grava o cookie `admin_session`: um JWT HS256 assinado com `SESSION_SECRET`, `httpOnly`, `secure` em produção, `sameSite=lax`, válido por **8 horas**.
4. Respostas: `200` ok · `400` corpo inválido · `401` token inválido · `403` não é admin (o navegador também faz `signOut` do Firebase).

### Proteção das rotas (duas camadas)

| Camada | Onde | O que confere |
| --- | --- | --- |
| Otimista | `src/proxy.ts` | Só a assinatura e a validade do cookie, sem acesso ao banco. Sem sessão → `307 /login?next=<página>`. Não passa por aqui: `/login`, `/api/*` (cada rota se protege), `/_next/*` e arquivos com extensão. |
| Autoritativa | `(painel)/layout.tsx` → `requireAdmin()` | Cookie válido **e** `admins/{uid}` ainda ativo, relido a cada requisição. Desativar ou apagar o documento corta o acesso na navegação seguinte, sem esperar o cookie expirar. |

Toda página nova do painel deve ficar dentro de `src/app/(painel)/`. Toda rota `/api` que mexer em dados do painel deve chamar `getCurrentAdmin()` e responder `401` se o retorno for `null`. O `?next=` passa por `safeRedirectPath`, que só aceita caminhos do próprio site e bloqueia open redirect.

### Logout

O botão **Sair** chama `DELETE /api/session`, que apaga o cookie, e depois `signOut` do Firebase Auth no navegador. Em seguida vai para `/login`. Se a chamada falhar, ele vai para `/login` mesmo assim.

### Cadastrar um administrador

A coleção `admins` é gerenciada pelo console. As regras do Firestore negam qualquer acesso pelo SDK cliente, e só o servidor lê.

1. **Authentication → Sign-in method**: ative **E-mail/senha** (uma vez).
2. **Authentication → Users → Adicionar usuário**: informe e-mail e senha e copie o **UID** gerado.
3. **Firestore → Iniciar coleção** `admins` → **ID do documento = o UID** → campos:

| Campo | Tipo | Valor |
| --- | --- | --- |
| `email` | string | e-mail do admin (exibido no cabeçalho) |
| `active` | boolean | `true` |

Para tirar o acesso, mude `active` para `false` ou apague o documento. Qualquer valor diferente de `active: true` (ausente, `"true"` como texto, `1`) **nega** o acesso.

### Modelo de dados e regras de segurança

O schema completo do Firestore e do Storage está em **[docs/data-model.md](docs/data-model.md)**: coleções, campos, quem lê e quem escreve, fluxo de saltos dos questionários e caminhos do Storage. As regras aplicam esse documento:

- **Conteúdo** (questionários publicados, categorias, dicas e anunciantes ativos): leitura pública, até sem login; escrita só por admin ativo.
- **`admins`**: inacessível pelo SDK cliente.
- **`users/{uid}`**: o próprio usuário lê e grava só os campos de perfil. `creditBalance`, `history` e `credits` são escritos **só pelo servidor**, para que ninguém consiga se dar créditos.

Ao mudar o modelo, atualize o documento, as regras e `rules-tests/` juntos, rode `npm run test:rules` e publique:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project alarysai-b6e85
```

As regras do Firestore e os índices foram publicados em 2026-10-02. As do **Storage** só podem ser publicadas depois que o Storage for ativado, porque ele exige o plano Blaze. Use `firebase deploy --only storage`; no primeiro deploy, o console pede permissão para as regras do Storage consultarem `admins` no Firestore.

## Configuração

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local`. Os valores públicos (`NEXT_PUBLIC_FIREBASE_*`) saem de:

```bash
firebase apps:sdkconfig WEB --project alarysai-b6e85
```

Para as credenciais do Admin SDK (`FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`), vá em Console Firebase → Configurações do projeto → Contas de serviço → **Gerar nova chave privada**. Em `FIREBASE_PRIVATE_KEY` vai o valor do campo `private_key`, de `-----BEGIN PRIVATE KEY-----` até `-----END PRIVATE KEY-----`. O código aceita a chave com `\n` literais ou com quebras de linha reais, e também remove as aspas e a vírgula que costumam vir junto ao copiar do JSON (ver `normalizePrivateKey` em `config.ts`). Se mesmo assim não for uma chave PEM, o `/api/health` registra no log `FIREBASE_PRIVATE_KEY inválida`. **Nunca faça commit do JSON da service account** (o `.gitignore` já bloqueia `*-firebase-adminsdk-*.json` e `.env*`).

| Variável | Onde é usada | Secreta? |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | navegador e servidor | não (são identificadores públicos; a proteção vem das rules) |
| `FIREBASE_PROJECT_ID` | Admin SDK | não |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK | sim |
| `FIREBASE_PRIVATE_KEY` | Admin SDK | **sim** |
| `SESSION_SECRET` | assinatura do cookie de sessão (proxy e rotas) | **sim**. Mínimo de 32 caracteres; use um valor diferente em cada ambiente. Trocar o valor desloga todos os admins. Sem ele, todas as páginas do painel dão erro. |

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
npm test           # Vitest (unitários e componentes)
npm run test:rules # regras do Firestore/Storage no emulador (exige Java 21+)
```

## Testes

- **`npm test`**: testes unitários e de componentes (Vitest), sem rede.
- **`npm run test:rules`**: sobe os emuladores do Firestore e do Storage (`firebase emulators:exec`, projeto `demo-alarysai-rules`, sem tocar em produção) e roda `rules-tests/` contra `firestore.rules` e `storage.rules`. Exige o Firebase CLI e **Java 21+** no `PATH`/`JAVA_HOME`. Nesta máquina o Java padrão é o 17; use o JBR 21: `JAVA_HOME=~/.jdks/jbr-21.0.10`.
  - `firestore.rules.test.ts`: leitura pública só do conteúdo ativo ou publicado; consultas sem filtro de `status` são recusadas; só admin ativo escreve (status válido, tipo de passo válido); `admins` fechado; o usuário não se dá créditos nem grava campos fora do perfil; `history` e `credits` só leitura (o dono pode apagar o próprio histórico); isolamento entre usuários; coleções desconhecidas fechadas.
  - `storage.rules.test.ts`: imagens de conteúdo com leitura pública e envio só por admin (imagem até 5 MB); avatar do próprio usuário (imagem até 2 MB); `generated` só leitura do dono; caminhos desconhecidos fechados.

- `features/auth/domain/create-admin-session.test.ts`: admin ativo, token em branco, token inválido, usuário sem `admins/{uid}`, admin inativo.
- `features/auth/domain/safe-redirect.test.ts`: caminhos aceitos e bloqueio de open redirect (`//`, URL absoluta, `\`, `/login`).
- `features/auth/data/session-token.test.ts`: ida e volta, outra chave, token adulterado, expirado, perto de expirar, `SESSION_SECRET` ausente ou curta.
- `features/auth/data/firebase-id-token.test.ts`: token válido, outro projeto, issuer errado, expirado, `auth_time` no futuro, chave desconhecida (chaves RSA locais, sem rede).
- `features/auth/data/admins-repository.test.ts`: mapeamento defensivo de `admins/{uid}`.
- `features/auth/data/admin-sign-in.test.ts`: tradução dos erros do Firebase Auth.
- `features/auth/presentation/LoginForm.test.tsx` e `LogoutButton.test.tsx` (jsdom): sucesso com redirect, cada mensagem de erro, botão desabilitado durante o envio, campos obrigatórios, logout mesmo com falha.
- `src/proxy.test.ts`: sessão válida passa, sem sessão ou cookie forjado → `/login?next=`, e o **matcher** (quais caminhos são protegidos ou ignorados).
- `src/lib/firebase/config.test.ts`: validação da config do cliente (chaves ausentes ou em branco, espaços nas pontas) e das credenciais do Admin SDK (conversão de `\n`, aspas e vírgula copiadas do JSON, quebras de linha do Windows, JSON inteiro colado, valor que não é PEM, variáveis ausentes).
- Verificação manual: sem sessão, qualquer página do painel redireciona para `/login`. Com um admin cadastrado, o login leva ao painel, o cabeçalho mostra o e-mail e **Sair** volta para `/login`. No painel, a página inicial mostra "Firebase conectado ao projeto alarysai-b6e85", e `/api/health` responde `ok` quando a service account está configurada.

## Apps futuros

Os apps Android/iOS devem ser registrados **no mesmo projeto Firebase `alarysai-b6e85`** (`firebase apps:create ANDROID|IOS --project alarysai-b6e85`). Assim, todos compartilham Auth, Firestore e Storage. O schema que os apps consomem está em [docs/data-model.md](docs/data-model.md). Os apps devem sempre filtrar por `status` nas consultas de conteúdo, senão o Firestore recusa a consulta.
