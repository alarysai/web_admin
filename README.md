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
    (painel)/layout.tsx   # exige admin ativo (requireAdmin) + cabeçalho + menu lateral
    (painel)/page.tsx     # início do painel
    (painel)/loading.tsx  # estado de carregamento das páginas do painel
    (painel)/error.tsx    # erro ao carregar (ex.: Firestore fora) com "Tentar de novo"
    (painel)/questionarios/            # lista (?q=&categoria=), novo/, [id]/, [id]/passos/novo, [id]/passos/[stepId], [id]/fluxo
    (painel)/categorias/               # categorias de questionário: lista, nova/, [id]/
    (painel)/categorias-dicas/         # categorias de dicas: lista, nova/, [id]/
    (painel)/dicas/                    # lista (?q=&categoria=), nova/, [id]/
    (painel)/anunciantes/              # lista (?q=&tipo=), novo/, [id]/
    api/health/route.ts   # GET /api/health: testa o Admin SDK → Firestore
    api/session/route.ts  # POST cria a sessão do admin · DELETE faz logout
  features/auth/
    domain/               # regras: createAdminSession, safeRedirectPath, tipos
    data/                 # session-token (cookie JWT), firebase-id-token (jose),
                          # admins-repository (Firestore), admin-sign-in (navegador)
    server/               # session-cookie (nome/opções), current-admin (getCurrentAdmin/requireAdmin)
    presentation/         # LoginForm, LogoutButton, mensagens de erro
  features/questionnaires/
    domain/               # schemas Zod, filtro/busca, passos (steps.ts), fluxo (flow.ts), publicação/cópia (lifecycle.ts), prévia do prompt
    data/                 # questionnaires-, steps- e questionnaire-lifecycle-repository (Admin SDK) + mappers defensivos
    server/               # saveQuestionnaire, saveStep/deleteStepById, step-form, questionnaire-lifecycle + Server Actions
    presentation/         # QuestionnaireForm/Table/Filters, QuestionnaireActions, StepForm, StepOptionsEditor, StepList, DeleteStepButton, FlowMap, FlowSimulator
  features/categories/                 # categorias genéricas por tipo (questionnaire | tip): domain, data, server,
                                       # presentation (CategoryScreens compartilhadas pelas duas seções)
  features/advertisers/                # anunciantes: domain (schema, tipos, filtro), data, server (salvar,
                                       # ativar/desativar/excluir), presentation (AdvertiserForm, AdvertiserTable)
  features/tips/                       # dicas: domain (schema, filtro), data (repositório, usos), server (salvar,
                                       # ativar/desativar/excluir), presentation (TipForm, TipTable, TipActions)
  components/
    FirebaseStatus.tsx    # status do SDK cliente
    layout/               # AdminNav (menu lateral), PageHeader, ListFilters (busca + um filtro, na URL)
    form/                 # TextField, TextAreaField, SelectField, LocalizedTextFields (PT/EN/ES), FormMessage,
                          # ActionResultMessage, ActivationActions (ativar/desativar/excluir)
    ui/                   # StatusBadge
  lib/content/            # LocalizedText (schema, idiomas completos, busca sem acento), ImageRef, leitura defensiva do Firestore
  lib/forms/              # FormState e ActionResult das Server Actions, leitura de FormData, valores iniciais
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

## Cadastros do painel

### Como um cadastro funciona

| Camada | O que faz |
| --- | --- |
| Página (Server Component) | Lê do Firestore com o Admin SDK (`data/*-repository.ts`) e passa os dados para o formulário. |
| Formulário (Client Component) | `useActionState` com a Server Action. Mostra o erro de cada campo, mantém o que foi digitado e desabilita o botão durante o envio. |
| Server Action (`server/actions.ts`) | Chama a regra (`server/save-*.ts`), faz `revalidatePath` e redireciona depois de criar. |
| Regra (`server/save-*.ts`) | **Confere o admin a cada chamada** (`getCurrentAdmin()`), valida com o schema Zod do `domain/` e só então grava. Recebe as dependências por parâmetro para ser testada sem Firestore. |

Server Actions podem ser chamadas por um POST direto, sem passar pela tela. Por isso, **toda Server Action nova precisa conferir o admin dentro dela**. A proteção das páginas não basta.

### Categorias (`/categorias` e `/categorias-dicas`)

Categorias de questionário e de dicas têm o mesmo formato: nome em PT/EN/ES (o português é obrigatório), ordem e status (ativa/inativa). Só as ativas aparecem nos apps. Por isso é **uma feature só** (`features/categories`), parametrizada pelo tipo (`questionnaire` → `questionnaireCategories`, `tip` → `tipCategories`). Os arquivos de rota só escolhem o tipo. A Server Action valida o tipo recebido antes de escolher a coleção. Nos seletores e filtros, categorias inativas aparecem com "(inativa)". O ícone da categoria de questionário entra com o upload de imagens.

### Questionários (`/questionarios`)

- **Lista:** busca pelo título em qualquer idioma, sem diferenciar maiúsculas nem acentos (`?q=`), e filtro por categoria (`?categoria=`). Os filtros ficam na URL. Mostra categoria, idiomas completos, status, ordem e data da última alteração. Há uma mensagem própria para "nenhum cadastrado" e para "nenhum resultado".
- **Criar e editar:** título (PT obrigatório; EN/ES opcionais), descrição opcional, categoria (precisa existir) e ordem. Todo questionário novo nasce como **rascunho**.
- **Idiomas completos (`languages`):** recalculados a cada vez que o questionário ou um passo é salvo ou excluído. Um idioma só conta quando título, descrição, passos, opções e informações booleanas estão todos traduzidos nele.
- Sem nenhuma categoria cadastrada, o botão "Novo questionário" some e a lista mostra um aviso com link para criar uma.

### Passos (`/questionarios/[id]` → seção "Passos")

- **Lista** na ordem do fluxo: ordem, tipo, nº de opções, texto e marcadores ("Entra no prompt", "Informação booleana"), com Editar e Excluir.
- **Criar e editar passo:**
  - **Tipo:** Pergunta ou Vídeo. Trocar o tipo descarta o que não pertence a ele: vídeo não tem opções, pergunta não tem link.
  - **Texto** em PT/EN/ES (obrigatório enquanto não há imagens).
  - **Vídeo:** link externo `https://`.
  - **Pergunta:** opções que dá para adicionar e remover (mínimo 1), cada uma com texto PT/EN/ES e instrução de prompt.
  - **"Vira parte do prompt?"** e **instrução de prompt** do passo (não traduzida).
  - **Informação booleana:** rótulo PT/EN/ES, resposta Sim/Não e a **dica relacionada** (opcional; dicas inativas aparecem com "(inativa)"). O servidor confere se a dica existe. Uma dica ligada que foi apagada continua visível como "Dica inexistente".
  - Um passo novo entra com ordem = última + 1.
- **Excluir:** pede confirmação. Saltos de outros passos que apontavam para o passo excluído voltam a `null` (seguir a ordem), no mesmo batch da exclusão. A exclusão é **recusada** se isso criar um ciclo ou se for o único passo de um questionário publicado.
- **Nomes dos campos das opções:** usam o **ID da opção** (`options.<id>.text.pt`), não a posição. Assim, remover uma opção do meio depois de um erro não troca os valores das outras, e os erros do Zod são traduzidos de posição para ID.
- **Saltos:** "Próximo passo" no passo e "Depois desta opção" em cada opção. As escolhas são seguir a ordem (ou o próximo do passo), ir para outro passo do questionário ou encerrar o questionário. Um salto salvo para um passo que não existe mais continua aparecendo como "Passo inexistente", em vez de sumir sem aviso.
- **Sem imagens por enquanto:** `image` é gravado como `null` até o Storage ser ativado.

### Validação do fluxo (`domain/flow.ts`)

Regras do fluxo: [docs/data-model.md → Fluxo e saltos](docs/data-model.md#fluxo-e-saltos). O servidor confere, ao **salvar** um passo (o que inclui mudar a ordem) e ao **excluir** um passo:

- **Destino existe:** todo salto aponta para um passo do mesmo questionário ou para `__end__`. O erro aparece no campo do salto.
- **Sem ciclos:** nenhum caminho volta a um passo já visitado, nem mesmo um caminho que tenha saída. Assim, todo caminho chega ao fim em número finito de passos. A mensagem mostra o ciclo pela ordem dos passos (ex.: "#1 → #3 → #1").
- **Mudar a ordem ou excluir também conta:** essas operações mudam quem é o "próximo na ordem" e podem criar um ciclo sem que nenhum salto tenha sido editado.
- **Dados antigos:** só bloqueia o que a operação **cria**. Se o questionário já tinha um ciclo ou um salto quebrado em outro passo, a edição de outros passos continua permitida, e a pré-visualização mostra o problema.

### Publicar, despublicar, duplicar e excluir (seção "Publicação" na tela do questionário)

| Ação | Regra |
| --- | --- |
| **Publicar** | Exige: ao menos 1 passo; todo passo válido pelo schema (pega dado antigo ou malformado); fluxo válido (sem ciclo e sem salto quebrado); categoria existente; toda dica ligada existente (dica inativa é só aviso). Se algo falhar, mostra a lista do que corrigir e não publica. Categoria **inativa** é só aviso: publica, mas o app não mostra o questionário até a categoria ser ativada. Grava `status: "published"`, `publishedAt` e recalcula `languages`. |
| **Despublicar** | Pede confirmação. Volta para `draft` e sai dos apps na hora. `publishedAt` guarda a última publicação. |
| **Duplicar** | Cria uma cópia em **rascunho**, com o título "(cópia)" / "(copy)" / "(copia)", e abre a cópia. Os passos ganham IDs novos e os saltos são remapeados para os passos da cópia. Um salto que apontava para um passo inexistente vira `null`. |
| **Excluir** | Só para **rascunho**: despublique antes. Pede confirmação e apaga o questionário **e os passos**, porque o Firestore não apaga subcoleções sozinho. Os passos são apagados primeiro; se algo falhar no meio, o questionário continua lá para tentar de novo. |

Enquanto está publicado, o questionário continua editável. Cada salvamento de passo passa pela validação de schema e de fluxo, então ele não fica inválido no app. Duplicar e excluir gravam em batches de até 450 operações (o limite do Firestore é 500).

### Pré-visualização do fluxo (`/questionarios/[id]/fluxo`)

- **Simular:** percorre o questionário como o app, em PT, EN ou ES (cai para o português quando falta tradução). Mostra o vídeo, as opções e a informação booleana, tem o botão Recomeçar e lista as **partes do prompt**: resposta e instruções dos passos marcados com "vira parte do prompt?". O texto final do prompt é montado pelo serviço de geração.
- **Mapa:** para cada passo, para onde vai cada opção ("“Ética” → Fim"). Mostra ciclos e saltos quebrados como erro e passos que nenhum caminho alcança como aviso.

### Dicas (`/dicas`)

- **Lista:** busca pelo texto em qualquer idioma, sem acento (`?q=`), e filtro por categoria de dica (`?categoria=`). Mostra categoria, idiomas completos, status e ordem, com estados vazios próprios.
- **Criar e editar:** categoria (precisa existir), texto PT/EN/ES e ordem (uma dica nova entra depois da última). `languages` é calculado ao salvar. **Toda dica nova nasce inativa.**
- **Ativar:** exige que a categoria exista. Se ela estiver inativa, ativa com aviso.
- **Desativar:** pede confirmação. Avisa quais questionários **publicados** ligam a ela e vão deixar de mostrá-la.
- **Excluir:** pede confirmação e é **recusado enquanto algum passo liga à dica**. A mensagem lista os questionários onde ela é usada, e a tela da dica também mostra onde ela é usada.
- **Onde é usada:** consulta em grupo de coleções (`collectionGroup("steps")` com `infoFlag.tipId`), que exige o índice em `firestore.indexes.json` → `fieldOverrides`.
- **Sem imagem por enquanto:** `image: null` até o Storage ser ativado.

### Anunciantes (`/anunciantes`)

- **Lista:** busca por nome ou link (`?q=`) e filtro por tipo (`?tipo=`). Mostra tipo, link (abre em outra aba), status e ordem, com estados vazios próprios.
- **Criar e editar:**
  - **Nome:** a regra é "nome **ou** imagem", e ela está no schema. Enquanto não há upload, na prática o nome é obrigatório.
  - **Tipo:** texto livre, até 40 caracteres. Espaços extras são removidos ao salvar, e o campo sugere os tipos já usados (`datalist`).
  - **Link:** URL **https://** válida. `http://`, endereço sem protocolo e `javascript:` são recusados.
  - **Ordem:** um anunciante novo entra depois do último.
  - **Todo anunciante novo nasce inativo.**
- **Tipos no filtro:** "Banner", "banner " e "BANNER" contam como um tipo só (sem diferenciar maiúsculas, acentos nem espaços). Aparece a primeira grafia encontrada.
- **Ativar:** confere de novo os dados salvos, para que um documento antigo ou malformado não vá para o app. Se algo estiver errado, lista o que corrigir.
- **Desativar e excluir:** pedem confirmação. Nada referencia anunciantes, então excluir não tem outra restrição.
- **Imagem:** o formulário ainda não envia imagem. Ao editar, uma imagem já gravada é **preservada**, não apagada.

### Entregas da 3.2

1. ✅ Layout base, schemas Zod, categorias, lista com busca e filtro, criar e editar questionário.
2. ✅ Editor de passos e opções, **sem imagens** (o upload entra quando o Storage for ativado, plano Blaze).
3. ✅ Saltos com validação (ID existente, sem ciclo) e pré-visualização do fluxo.
4. ✅ Publicar, despublicar, duplicar e excluir.

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
- `lib/content/*.test.ts`: `LocalizedText` (PT obrigatório, traduções vazias viram `null`, idiomas completos, idioma reserva), busca sem acento e leitura defensiva de documentos.
- `lib/forms/forms.test.ts`: leitura de `FormData` (inteiros, textos traduzidos, campos opcionais), erros do Zod por campo e valores iniciais.
- `features/questionnaires/domain/schemas.test.ts`: questionário (título, categoria, ordem), opção (texto ou imagem), passo (texto ou imagem; vídeo com link `https` e sem opções; pergunta com ao menos uma opção; IDs de opção únicos; informação booleana).
- `features/questionnaires/domain/questionnaire.test.ts`: busca em qualquer idioma, filtro por categoria, ordenação, leitura de `?q=` e `?categoria=`.
- `features/questionnaires/data/questionnaire-mapper.test.ts`: documento completo, status desconhecido vira rascunho, campos ausentes, idiomas desconhecidos.
- `features/questionnaires/server/save-questionnaire.test.ts`: criar, editar, sem sessão de admin, erros de campo com os valores digitados de volta, categoria inexistente, questionário apagado no meio.
- `features/categories/categories.test.ts`: schema, ordenação, opções com "(inativa)", mapper e a regra de salvar.
- `features/tips/tips.test.ts`: schema, busca e filtro, rótulo, mapper, salvar (sessão, campos, categoria inexistente, dica apagada), ativar (categoria inexistente ou inativa), desativar (aviso só para publicados), excluir (bloqueado quando usada), descrição dos usos.
- `features/advertisers/advertisers.test.ts`: schema (nome ou imagem, link https e links recusados, tipo arrumado e limite), tipos sem duplicar, filtro e busca, leitura da URL, mapper, salvar e ativar, desativar e excluir (ativar recusa dado antigo inválido).
- `features/advertisers/presentation/AdvertiserScreens.test.tsx` (jsdom): sugestões de tipo, formulário salvo e enviado, erros mantendo o que foi digitado, tabela e estados vazios.
- `features/tips/presentation/TipScreens.test.tsx` (jsdom): formulário, tabela e estados vazios, ações (ativar, desativar com confirmação e aviso, exclusão bloqueada mostrando os usos, cancelar) e `ListFilters`.
- Ligação com dicas: `lifecycle.test.ts` (dica apagada bloqueia a publicação, inativa avisa), `save-step.test.ts` (dica inexistente) e `StepForm.test.tsx` (seletor de dica, dica apagada continua visível).
- `features/questionnaires/domain/steps.test.ts`: ordem do fluxo, ordem do próximo passo, idiomas completos considerando passos, opções e informações booleanas, e limpeza dos saltos ao excluir.
- `features/questionnaires/data/step-mapper.test.ts`: passo completo, documento malformado, opção sem ID, imagem incompleta.
- `features/questionnaires/server/step-form.test.ts` e `save-step.test.ts`: leitura do formulário (opções na ordem da tela, saltos ocultos preservados, tipo vídeo descarta opções, checkbox desmarcado, informação booleana), erros traduzidos de posição para ID da opção, criar, editar, sem sessão, questionário ou passo apagado, excluir.
- `StepForm.test.tsx`, `StepList.test.tsx`, `DeleteStepButton.test.tsx` (jsdom): troca de tipo, adicionar e remover opções (mínimo 1), informação booleana, envio na ordem com saltos ocultos, erro na opção certa mantendo o que foi digitado, checkbox desmarcado não volta marcado, lista e estado vazio, exclusão com confirmação e erro.
- `features/questionnaires/domain/flow.test.ts`: próximo passo (opção, depois passo, depois ordem, depois `__end__`), transições, destino inexistente, ciclo mesmo com saída, salto para si mesmo, ciclo criado só pela ordem, passos inalcançáveis, fluxo depois de excluir.
- `domain/prompt-preview.test.ts` e `presentation/jump-choices.test.ts`: partes do prompt por idioma e opções dos seletores de salto.
- `save-step.test.ts` (saltos): destino existente e `__end__`, destino inexistente no passo e na opção, ciclo por salto, por salto para si mesmo, por remover um salto e por mudar a ordem, ciclo antigo não bloqueia outras edições, exclusão recusada quando cria ciclo.
- `StepForm.test.tsx` (saltos) e `FlowPreview.test.tsx` (jsdom): seletores com as escolhas certas, salto de opção enviado, salto quebrado continua visível; simulação seguindo saltos e ordem, idiomas, Recomeçar, salto para passo inexistente; mapa com transições, ciclo e passo inalcançável.
- `features/questionnaires/domain/lifecycle.test.ts`: o que bloqueia a publicação (sem passos, categoria inexistente, passo inválido, ciclo, salto quebrado), aviso de categoria inativa, título da cópia, cópia com IDs novos e saltos remapeados.
- `server/questionnaire-lifecycle.test.ts`: publicar, despublicar, duplicar e excluir, sem sessão e com questionário apagado; não excluir publicado; e (em `save-step.test.ts`) não excluir o único passo de um publicado.
- `QuestionnaireActions.test.tsx` (jsdom): publicar com aviso, lista de problemas, confirmação ao despublicar, excluir desabilitado quando publicado, excluir com confirmação, duplicar sem perguntar.
- `QuestionnaireForm.test.tsx`, `QuestionnaireTable.test.tsx` e `components/layout/AdminNav.test.tsx` (jsdom): formulário novo e de edição, envio, erros de campo mantendo o que foi digitado, botão desabilitado ao salvar, linhas da tabela, estados vazios e menu marcando a seção atual.
- `src/lib/firebase/config.test.ts`: validação da config do cliente (chaves ausentes ou em branco, espaços nas pontas) e das credenciais do Admin SDK (conversão de `\n`, aspas e vírgula copiadas do JSON, quebras de linha do Windows, JSON inteiro colado, valor que não é PEM, variáveis ausentes).
- Verificação manual: sem sessão, qualquer página do painel redireciona para `/login`. Com um admin cadastrado, o login leva ao painel, o cabeçalho mostra o e-mail e **Sair** volta para `/login`. No painel, a página inicial mostra "Firebase conectado ao projeto alarysai-b6e85", e `/api/health` responde `ok` quando a service account está configurada.

## Apps futuros

Os apps Android/iOS devem ser registrados **no mesmo projeto Firebase `alarysai-b6e85`** (`firebase apps:create ANDROID|IOS --project alarysai-b6e85`). Assim, todos compartilham Auth, Firestore e Storage. O schema que os apps consomem está em [docs/data-model.md](docs/data-model.md). Os apps devem sempre filtrar por `status` nas consultas de conteúdo, senão o Firestore recusa a consulta.
