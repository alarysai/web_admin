# Modelo de dados — Firestore e Storage

Fonte de verdade do schema do projeto Firebase **`alarysai-b6e85`**, compartilhado pelo painel web e pelos apps Android/iOS. As regras em [`firestore.rules`](../firestore.rules) e [`storage.rules`](../storage.rules) aplicam este documento; os testes em `rules-tests/` verificam as regras no emulador.

> Mudou um campo? Atualize **este documento, as regras e os testes juntos**. Os apps leem estes dados diretamente, então renomear ou remover um campo publicado é uma mudança incompatível.

## Visão geral

```
questionnaireCategories/{categoryId}          categorias da grade de questionários
questionnaires/{questionnaireId}              questionário
  └─ steps/{stepId}                           passos (vídeo ou pergunta), opções embutidas
tipCategories/{categoryId}                    categorias de dicas (Ética, Conhecimento…)
tips/{tipId}                                  dicas
advertisers/{advertiserId}                    anunciantes
admins/{uid}                                  administradores do painel (só servidor)
users/{uid}                                   perfil e saldo de créditos
  ├─ history/{entryId}                        execuções de questionário (prompt e resultado)
  └─ credits/{transactionId}                  extrato de créditos
```

### Quem pode o quê

| Coleção | Leitura | Escrita |
| --- | --- | --- |
| `questionnaireCategories`, `tipCategories`, `tips`, `advertisers` | **qualquer pessoa** (até sem login) se `status == "active"`; admin lê tudo | admin |
| `questionnaires` e `steps` | **qualquer pessoa** se o questionário tem `status == "published"`; admin lê tudo | admin |
| `admins` | ninguém pelo SDK cliente (só o servidor do painel, via Admin SDK) | ninguém pelo SDK cliente |
| `users/{uid}` | o próprio usuário; admin | o próprio usuário, **apenas** os campos de perfil; `creditBalance` só pelo servidor |
| `users/{uid}/history` | o próprio usuário; admin | criação só pelo servidor; o usuário pode **apagar** os seus |
| `users/{uid}/credits` | o próprio usuário; admin | só pelo servidor |

"Admin" = usuário autenticado com documento `admins/{uid}` e `active == true` (mesma regra do login do painel). "Servidor" = código com o Admin SDK (painel na Vercel ou futuras Cloud Functions), que ignora as regras. Créditos e histórico são escritos só pelo servidor porque envolvem cobrança e chamadas a LLM com chaves secretas — um cliente nunca pode se dar créditos.

## Convenções

| Convenção | Definição |
| --- | --- |
| Nomes | coleções e campos em inglês, `camelCase`. |
| IDs | gerados pelo Firestore (`doc()`), exceto `admins/{uid}` e `users/{uid}` (UID do Firebase Auth). |
| Datas | `Timestamp` do Firestore, preenchido com `serverTimestamp()`. |
| Auditoria | documentos editados no painel têm `createdAt`, `updatedAt`, `createdBy` e `updatedBy` (UID do admin). |
| Texto traduzido | `LocalizedText` (abaixo). |
| Imagem | `ImageRef` (abaixo). `null` quando não há imagem. |
| Status | `questionnaires`: `"draft"` \| `"published"`. Demais conteúdos: `"active"` \| `"inactive"`. Excluir apaga o documento. |
| Ordem | `order: number` (inteiro, crescente) define a ordem de exibição. |

### `LocalizedText`

```ts
{ pt: string; en: string | null; es: string | null }
```

`pt` é obrigatório e não vazio; `en` e `es` são opcionais. O app mostra o idioma do usuário e cai para `pt` quando a tradução é `null`.

### `ImageRef`

```ts
{ path: string; url: string }
```

`path` é o caminho no Storage (usado para trocar/apagar o arquivo); `url` é a URL de download que os apps exibem. Caminhos permitidos: ver [Storage](#storage).

## Conteúdo

### `questionnaireCategories/{categoryId}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `name` | `LocalizedText` | sim | Nome exibido na grade. |
| `icon` | `ImageRef \| null` | não | Ícone da categoria. |
| `order` | `number` | sim | Posição na grade. |
| `status` | `"active" \| "inactive"` | sim | Só `active` aparece nos apps. |
| auditoria | | sim | |

### `questionnaires/{questionnaireId}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `title` | `LocalizedText` | sim | Título. |
| `description` | `LocalizedText \| null` | não | Texto de apresentação. |
| `categoryId` | `string` | sim | ID em `questionnaireCategories`. |
| `image` | `ImageRef \| null` | não | Capa/ícone na grade. |
| `languages` | `("pt" \| "en" \| "es")[]` | sim | Idiomas com tradução **completa** (título, passos e opções). Sempre contém `"pt"`. Recalculado pelo painel a cada vez que o questionário ou um passo é salvo ou excluído (título, descrição, textos dos passos, opções e rótulos das informações booleanas). |
| `order` | `number` | sim | Posição dentro da categoria. |
| `status` | `"draft" \| "published"` | sim | Rascunhos não aparecem nos apps. |
| `publishedAt` | `Timestamp \| null` | não | Última publicação. |
| auditoria | | sim | |

### `questionnaires/{questionnaireId}/steps/{stepId}`

O ID do documento é o **ID do passo**, usado pelos saltos. Ele é estável: reordenar passos muda só `order`.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `order` | `number` | sim | Ordem padrão do fluxo. O primeiro passo é o de menor `order`. |
| `type` | `"video" \| "question"` | sim | Tipo do passo. |
| `text` | `LocalizedText \| null` | * | Descrição/enunciado. |
| `image` | `ImageRef \| null` | * | Imagem do passo. |
| `videoUrl` | `string \| null` | só em `video` | Link externo `https://` (YouTube, Vimeo…). `null` em perguntas. |
| `options` | `StepOption[]` | só em `question` | Opções de resposta (abaixo). `[]` em vídeos. |
| `nextStepId` | `string \| null` | não | Salto padrão do passo (ver [Fluxo](#fluxo-e-saltos)). |
| `partOfPrompt` | `boolean` | sim | "Vira parte do prompt?" — se a resposta deste passo entra no prompt final. |
| `promptInstruction` | `string \| null` | não | Instrução para a IA associada ao passo (não traduzida: vai para o LLM). |
| `infoFlag` | `InfoFlag \| null` | não | Informação booleana do passo (ex.: "Isso é ético?"). |
| auditoria | | sim | |

\* Um passo precisa ter `text` **ou** `image` (ou ambos); um vídeo também precisa de `videoUrl`.

**`StepOption`** (embutida no passo — as opções são poucas e sempre editadas junto com ele):

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | `string` | sim | ID estável da opção dentro do passo (gravado no histórico). |
| `text` | `LocalizedText \| null` | * | Texto da opção. |
| `image` | `ImageRef \| null` | * | Imagem da opção. |
| `promptInstruction` | `string \| null` | não | Instrução para a IA quando esta opção é escolhida. |
| `nextStepId` | `string \| null` | não | Salto desta opção; sobrescreve o `nextStepId` do passo. |

\* `text` **ou** `image` (ou ambos).

**`InfoFlag`**:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `label` | `LocalizedText` | A pergunta informativa (ex.: "Isso é ético?"). |
| `value` | `boolean` | A resposta definida pelo admin para este passo. |
| `tipId` | `string \| null` | Dica (`tips/{tipId}`) exibida junto com a informação. |

#### Fluxo e saltos

Para decidir o passo seguinte, o app usa o primeiro destes que existir:

1. `nextStepId` da **opção escolhida**;
2. `nextStepId` do **passo**;
3. o próximo passo por `order`; se não houver, o questionário termina.

`nextStepId` aceita o ID de um passo do **mesmo questionário** ou o valor especial **`"__end__"`**, que encerra o questionário. O painel valida (task 3.2) que todo salto aponta para um passo existente e que o fluxo não tem ciclo infinito. Ao **excluir** um passo, o painel zera (`null`) os saltos que apontavam para ele, então ninguém fica com salto para um passo que não existe.

### `tipCategories/{categoryId}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `name` | `LocalizedText` | sim | Ex.: Ética, Conhecimento. |
| `order` | `number` | sim | |
| `status` | `"active" \| "inactive"` | sim | |
| auditoria | | sim | |

### `tips/{tipId}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `categoryId` | `string` | sim | ID em `tipCategories`. |
| `text` | `LocalizedText` | sim | Texto da dica. |
| `image` | `ImageRef \| null` | não | |
| `languages` | `("pt" \| "en" \| "es")[]` | sim | Idiomas com tradução completa. Sempre contém `"pt"`. |
| `order` | `number` | sim | |
| `status` | `"active" \| "inactive"` | sim | |
| auditoria | | sim | |

### `advertisers/{advertiserId}`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `name` | `string \| null` | * | Nome do anunciante (não traduzido). |
| `image` | `ImageRef \| null` | * | Logo/banner. |
| `type` | `string` | sim | Tipo do anunciante. **Valores a definir** (ver [Pendências](#pendências)). |
| `link` | `string` | sim | URL `https://` aberta ao tocar no anúncio. |
| `order` | `number` | sim | |
| `status` | `"active" \| "inactive"` | sim | |
| auditoria | | sim | |

\* `name` **ou** `image` (ou ambos).

## Administração

### `admins/{uid}`

Já em uso pelo login do painel (ver README → Acesso do administrador). `email: string`, `active: boolean`; só `active == true` concede acesso. Inacessível pelo SDK cliente.

## Usuários

### `users/{uid}`

| Campo | Tipo | Quem escreve | Descrição |
| --- | --- | --- | --- |
| `displayName` | `string \| null` | usuário | Nome exibido ("Olá, Diego"). |
| `photoUrl` | `string \| null` | usuário | |
| `language` | `"pt" \| "en" \| "es"` | usuário | Idioma preferido. |
| `creditBalance` | `number` | **servidor** | Saldo atual de créditos (inteiro ≥ 0). Ausente até o servidor creditar pela primeira vez — o app trata ausente como 0. |
| `createdAt` | `Timestamp` | usuário (na criação) | |
| `updatedAt` | `Timestamp` | usuário/servidor | |

O app cria o próprio documento no primeiro login, só com os campos de perfil. Nas regras, o usuário só pode gravar `displayName`, `photoUrl`, `language`, `createdAt` e `updatedAt`.

### `users/{uid}/history/{entryId}`

Uma execução de questionário e o que foi gerado. Criado pelo servidor ao processar a geração.

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `questionnaireId` | `string` | Questionário executado. |
| `questionnaireTitle` | `string` | Título no idioma usado (cópia: o histórico continua legível se o questionário mudar ou for excluído). |
| `language` | `"pt" \| "en" \| "es"` | Idioma da execução. |
| `answers` | `{ stepId: string; optionId: string \| null }[]` | Caminho percorrido (`optionId` `null` em vídeos). |
| `prompt` | `string` | Prompt final montado. |
| `outputType` | `"text" \| "image" \| "video" \| "slides"` | Tipo de saída pedida. |
| `result` | `{ text: string \| null; url: string \| null }` | Resultado (texto ou link do arquivo gerado). |
| `creditsSpent` | `number` | Créditos consumidos. |
| `createdAt` | `Timestamp` | |

### `users/{uid}/credits/{transactionId}`

Extrato. Toda mudança de `creditBalance` gera uma transação; o servidor grava a transação e o novo saldo **na mesma transação do Firestore**.

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `kind` | `"purchase" \| "usage" \| "monthly_grant" \| "bonus" \| "refund"` | Motivo. |
| `amount` | `number` | Variação (inteiro; negativo em `usage`). |
| `balanceAfter` | `number` | Saldo depois da transação. |
| `historyEntryId` | `string \| null` | Execução que consumiu (em `usage`/`refund`). |
| `purchaseRef` | `string \| null` | Referência do pagamento/loja (em `purchase`). |
| `createdAt` | `Timestamp` | |

## Storage

| Caminho | Leitura | Escrita |
| --- | --- | --- |
| `content/questionnaires/{questionnaireId}/{arquivo}` | pública | admin; imagem até 5 MB |
| `content/questionnaireCategories/{categoryId}/{arquivo}` | pública | admin; imagem até 5 MB |
| `content/tips/{tipId}/{arquivo}` | pública | admin; imagem até 5 MB |
| `content/advertisers/{advertiserId}/{arquivo}` | pública | admin; imagem até 5 MB |
| `users/{uid}/avatar/{arquivo}` | o próprio usuário | o próprio usuário; imagem até 2 MB |
| `users/{uid}/generated/{arquivo}` | o próprio usuário | só servidor (resultados de IA) |
| qualquer outro caminho | ninguém | ninguém |

Imagens de passos e opções ficam em `content/questionnaires/{questionnaireId}/`. "Imagem" = `contentType` começando com `image/`. As regras do Storage consultam `admins/{uid}` no Firestore (regras entre serviços); no primeiro deploy, o console do Firebase pede para conceder essa permissão.

## Índices

Consultas previstas dos apps (em `firestore.indexes.json`):

| Consulta | Índice |
| --- | --- |
| Questionários publicados de uma categoria, por ordem | `questionnaires`: `status` + `categoryId` + `order` |
| Dicas ativas de uma categoria, por ordem | `tips`: `status` + `categoryId` + `order` |
| Categorias, anunciantes e dicas ativos, por ordem | `status` + `order` em `questionnaireCategories`, `tipCategories`, `advertisers`, `tips` |
| Passos de um questionário | `steps` ordenado por `order` (índice automático) |
| Histórico e extrato do usuário, mais recentes primeiro | `createdAt` desc (índice automático) |

> Os apps devem **sempre** filtrar por `status` nas consultas de conteúdo: o Firestore recusa uma consulta que possa devolver documentos que as regras não deixam ler.

## Pendências

Decisões de produto ainda em aberto (o modelo acima usa o valor indicado até a definição):

1. **Tipos de anunciante** (`advertisers.type`): lista de valores ainda não definida — campo texto por enquanto.
2. **`infoFlag`**: modelado como uma resposta sim/não definida pelo admin por passo, com dica opcional. Se a intenção for o **usuário** responder, o campo muda.
3. **Planos** (aba "Planos" do app): ciclo mensal, créditos por plano e renovação ainda não modelados — entram com a integração de pagamento.
