# Integração Android — como ler o conteúdo cadastrado no painel

Guia para o app Android (e, depois, iOS) exibir o que o painel web cadastra: categorias, questionários com passos, dicas e anunciantes.

- **Projeto Firebase:** `alarysai-b6e85`
- **Schema completo (fonte de verdade):** [data-model.md](data-model.md)
- **Regras de acesso:** [`firestore.rules`](../firestore.rules) e [`storage.rules`](../storage.rules)

> **Não existe API REST.** O app lê os dados **direto do Cloud Firestore**, com o SDK do Firebase para Android. O "contrato" é o formato dos documentos descrito aqui e no `data-model.md`. O painel grava, o app lê, e as regras de segurança garantem que o app só enxerga o que está publicado ou ativo.

---

## 1. Visão geral

```
Painel web (Next.js, Vercel) ──grava──▶ Cloud Firestore ◀──lê── App Android (SDK Firebase)
         Admin SDK                      alarysai-b6e85            sem login para o conteúdo
```

| O app pode… | Coleções |
| --- | --- |
| **Ler, sem login** (só o que está ativo ou publicado) | `questionnaireCategories`, `questionnaires` + `steps`, `tipCategories`, `tips`, `advertisers` |
| **Ler e gravar o próprio perfil** (com login) | `users/{uid}`: só `displayName`, `photoUrl`, `language`, `createdAt`, `updatedAt` |
| **Ler, só o próprio** (com login) | `users/{uid}/history`, `users/{uid}/credits`. Escrita só pelo servidor; o dono pode apagar itens do próprio histórico |
| **Nunca** | `admins`, gravar qualquer conteúdo, gravar `creditBalance`, `history` ou `credits` |

Por que Firestore direto, e não uma API: as listas do app são consultas simples e públicas. O SDK já entrega cache offline, atualização em tempo real e retry, e as regras de segurança cumprem o papel de "API" de leitura. Operações que envolvem segredo ou dinheiro (gerar conteúdo com IA, debitar créditos) **vão ficar no servidor**, mas ainda não existem.

---

## 2. Configuração do projeto Android

### 2.1 Registrar o app no Firebase (uma vez)

O app Android ainda **não está registrado** no projeto. Quem tiver acesso ao Firebase CLI pode registrar assim (troque o pacote pelo `applicationId` real):

```bash
firebase apps:create ANDROID "alarysai android" --package-name com.alarys.alarysai --project alarysai-b6e85
```

Depois baixe o `google-services.json`, pelo console (⚙️ Configurações do projeto → Seus apps → Android) ou pelo CLI, e coloque em `app/`:

```bash
firebase apps:sdkconfig ANDROID <APP_ID> --project alarysai-b6e85
```

O `google-services.json` contém identificadores públicos (não é segredo), mas mantenha o mesmo cuidado de não versionar chaves de outros projetos por engano.

### 2.2 Dependências (Gradle Kotlin DSL)

```kotlin
// build.gradle.kts (raiz)
plugins {
    id("com.google.gms.google-services") version "<versão atual>" apply false
}

// app/build.gradle.kts
plugins {
    id("com.google.gms.google-services")
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:<versão atual>"))
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-auth")          // perfil, histórico e créditos
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:<versão atual>") // .await()
}
```

Use sempre o **Firebase BoM mais recente**. As extensões Kotlin (`Firebase.firestore`, `snapshots()`, `toObject<T>()`) já vêm nos módulos principais; não é preciso adicionar artefatos `-ktx`.

### 2.3 Cache offline

O Firestore guarda em disco o que já foi lido (persistência ligada por padrão). O app abre sem internet mostrando a última versão, e o `snapshots()` emite de novo quando a conexão volta. Não é preciso cache próprio para o conteúdo.

---

## 3. Regras de ouro (leia antes de escrever a primeira consulta)

1. **Sempre filtre por `status` nas listas de conteúdo.** As regras deixam ler só documentos com `status == "active"` (ou `"published"`, no caso dos questionários). O Firestore **recusa a consulta inteira** (`PERMISSION_DENIED`) se ela *puder* devolver algo proibido. Uma lista sem o filtro falha mesmo que todos os documentos estejam ativos.
2. **Use as consultas da seção 4 exatamente como estão.** Cada combinação `where` + `orderBy` tem um índice composto publicado. Uma combinação nova exige índice novo: o erro `FAILED_PRECONDITION` traz um link para criar o índice, mas ele precisa ir para o `firestore.indexes.json` do painel.
3. **Textos traduzidos:** mostre o idioma do usuário e, se vier `null`, **caia para o português** (`pt` é sempre preenchido).
4. **Mapeie de forma defensiva:** campo ausente ou com tipo errado vira valor neutro, valor de enum desconhecido vira o "mais seguro" (ex.: status desconhecido = não mostrar). Nunca derrube a tela inteira por um documento malformado.
5. **Ignore campos de auditoria** (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`). Eles existem para o painel e podem mudar.
6. **Ordem de exibição** é sempre o campo `order`, crescente.
7. **Imagens:** por enquanto, todos os campos de imagem (`image`, `icon`) vêm `null`, porque o upload ainda não foi ativado. Trate `null` como "sem imagem" desde já. Quando houver imagem, use `url`.

---

## 4. Consultas por tela

Exemplos com `Firebase.firestore` e Flow (`snapshots()`), prontos para um `RemoteDataSource` da camada `data`.

```kotlin
import com.google.firebase.Firebase
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.firestore
import com.google.firebase.firestore.snapshots
```

### 4.1 Grade de categorias (Início)

```kotlin
Firebase.firestore.collection("questionnaireCategories")
    .whereEqualTo("status", "active")
    .orderBy("order", Query.Direction.ASCENDING)
    .snapshots()                                   // Flow<QuerySnapshot>
```

Índice: `questionnaireCategories (status, order)`.

### 4.2 Questionários de uma categoria

```kotlin
Firebase.firestore.collection("questionnaires")
    .whereEqualTo("status", "published")
    .whereEqualTo("categoryId", categoryId)
    .orderBy("order", Query.Direction.ASCENDING)
    .snapshots()
```

Índice: `questionnaires (status, categoryId, order)`. Para mostrar só questionários traduzidos no idioma do usuário, filtre **no app** por `languages.contains(idioma)`. Não acrescente `whereArrayContains`, que exigiria outro índice.

### 4.3 Um questionário e seus passos

```kotlin
val questionnaireRef = Firebase.firestore.collection("questionnaires").document(questionnaireId)

questionnaireRef.get().await()                            // documento do questionário
questionnaireRef.collection("steps")
    .orderBy("order", Query.Direction.ASCENDING)          // sem filtro de status: a regra olha o questionário pai
    .get().await()
```

Se o questionário foi **despublicado** (ou excluído), as duas leituras falham com `PERMISSION_DENIED` (ou o documento não existe). Trate isso como "questionário indisponível" e volte para a lista.

Leia **todos os passos de uma vez** ao abrir o questionário: o fluxo (seção 6) precisa conhecer a ordem completa para resolver "seguir a ordem".

### 4.4 Dicas

```kotlin
// categorias de dicas
Firebase.firestore.collection("tipCategories")
    .whereEqualTo("status", "active")
    .orderBy("order", Query.Direction.ASCENDING)
    .snapshots()

// dicas de uma categoria
Firebase.firestore.collection("tips")
    .whereEqualTo("status", "active")
    .whereEqualTo("categoryId", tipCategoryId)
    .orderBy("order", Query.Direction.ASCENDING)
    .snapshots()

// todas as dicas ativas
Firebase.firestore.collection("tips")
    .whereEqualTo("status", "active")
    .orderBy("order", Query.Direction.ASCENDING)
    .snapshots()

// uma dica (ex.: ligada à informação booleana de um passo)
Firebase.firestore.collection("tips").document(tipId).get().await()
```

Índices: `tipCategories (status, order)`, `tips (status, categoryId, order)`, `tips (status, order)`. A leitura de **uma** dica inativa falha com `PERMISSION_DENIED`: trate como "sem dica" e não mostre erro ao usuário.

### 4.5 Anunciantes

```kotlin
Firebase.firestore.collection("advertisers")
    .whereEqualTo("status", "active")
    .orderBy("order", Query.Direction.ASCENDING)
    .snapshots()
```

Índice: `advertisers (status, order)`. Para agrupar por tipo (`type` é **texto livre**), compare sem maiúsculas nem acentos: `"Patrocínio"`, `"patrocinio "` e `"PATROCINIO"` são o mesmo tipo.

---

## 5. Formato dos documentos (JSON)

Os exemplos abaixo mostram os documentos como o SDK os entrega, convertidos para JSON simples. `Timestamp` aparece como texto ISO só para leitura. O **ID do documento** não é um campo: obtenha-o com `snapshot.id`.

### Tipos comuns

```jsonc
// LocalizedText — pt sempre preenchido; en/es podem ser null (use pt)
{ "pt": "Ética na IA", "en": "AI ethics", "es": null }

// ImageRef — por enquanto sempre null; quando houver, use "url"
{ "path": "content/questionnaires/abc/capa.png", "url": "https://firebasestorage.googleapis.com/..." }
```

### `questionnaireCategories/{categoryId}`

Campos e tipos conferidos contra um documento real do projeto (os textos são ilustrativos):

```json
{
  "name": { "pt": "Imagem", "en": "Image", "es": "Imagen" },
  "icon": null,
  "order": 0,
  "status": "active"
}
```

### `questionnaires/{questionnaireId}`

```json
{
  "title": { "pt": "Ética na IA", "en": "AI ethics", "es": null },
  "description": { "pt": "Descubra como usar IA com responsabilidade.", "en": null, "es": null },
  "categoryId": "5ygtL7XaXwoHLkspZgXI",
  "image": null,
  "languages": ["pt"],
  "order": 1,
  "status": "published",
  "publishedAt": "2026-10-02T18:30:00Z"
}
```

`languages` lista os idiomas em que **tudo** (título, descrição, passos, opções, informações booleanas) está traduzido. É calculado pelo painel.

### `questionnaires/{questionnaireId}/steps/{stepId}` — pergunta

```json
{
  "order": 2,
  "type": "question",
  "text": { "pt": "Qual tema você quer explorar?", "en": "Which topic do you want to explore?", "es": null },
  "image": null,
  "videoUrl": null,
  "options": [
    {
      "id": "a1b2c3d4",
      "text": { "pt": "Ética", "en": "Ethics", "es": null },
      "image": null,
      "promptInstruction": "Foque nos dilemas éticos.",
      "nextStepId": "__end__"
    },
    {
      "id": "e5f6a7b8",
      "text": { "pt": "Redação", "en": "Writing", "es": null },
      "image": null,
      "promptInstruction": null,
      "nextStepId": null
    }
  ],
  "nextStepId": null,
  "partOfPrompt": true,
  "promptInstruction": "Escreva um texto curto para estudantes.",
  "infoFlag": {
    "label": { "pt": "Isso é ético?", "en": "Is this ethical?", "es": null },
    "value": true,
    "tipId": "Kq81PzTipDoc"
  }
}
```

### Passo — vídeo

```json
{
  "order": 1,
  "type": "video",
  "text": { "pt": "Assista à introdução.", "en": null, "es": null },
  "image": null,
  "videoUrl": "https://www.youtube.com/watch?v=XXXXXXXX",
  "options": [],
  "nextStepId": null,
  "partOfPrompt": false,
  "promptInstruction": null,
  "infoFlag": null
}
```

Garantias que o painel dá (validadas ao salvar e ao publicar):

- Todo passo tem `text` ou `image`.
- `type == "video"` tem `videoUrl` (`https://`) e `options` vazio.
- `type == "question"` tem ao menos uma opção, cada uma com `text` ou `image`; `option.id` é único no passo.
- `nextStepId` (do passo e das opções) é `null`, `"__end__"` ou o ID de um passo **do mesmo questionário**.
- O fluxo **não tem ciclos**: todo caminho termina.
- `infoFlag.tipId`, quando preenchido, aponta para uma dica que existia na publicação. Ela pode estar **inativa**: nesse caso, não mostre a dica.

### `tipCategories/{categoryId}`

```json
{ "name": { "pt": "Ética", "en": "Ethics", "es": "Ética" }, "order": 1, "status": "active" }
```

### `tips/{tipId}`

```json
{
  "categoryId": "EticaCatDoc",
  "text": { "pt": "Sempre cite as fontes que a IA usou.", "en": "Always cite the sources the AI used.", "es": null },
  "image": null,
  "languages": ["pt", "en"],
  "order": 1,
  "status": "active"
}
```

### `advertisers/{advertiserId}`

```json
{
  "name": "Loja X",
  "image": null,
  "type": "Parceiro",
  "link": "https://lojax.com.br/promo",
  "order": 1,
  "status": "active"
}
```

`name` ou `image` sempre preenchido (hoje, sempre `name`). `link` é sempre `https://`. Abra-o no navegador (Custom Tabs).

---

## 6. Fluxo do questionário (regra para portar)

O painel valida o fluxo com o mesmo algoritmo (`src/features/questionnaires/domain/flow.ts`). Para decidir o **próximo passo**, use o primeiro destes que existir:

1. `nextStepId` da **opção escolhida**;
2. `nextStepId` do **passo**;
3. o **próximo passo por `order`**; se não houver próximo, o questionário termina.

`"__end__"` em qualquer `nextStepId` encerra o questionário na hora. O primeiro passo é o de **menor `order`**.

```kotlin
const val END_OF_QUESTIONNAIRE = "__end__"

/** Próximo passo depois de [step] (e da [option] escolhida, em perguntas). null = fim. */
fun resolveNext(step: Step, option: StepOption?, ordered: List<Step>): String? {
    val jump = option?.nextStepId ?: step.nextStepId
    if (jump == END_OF_QUESTIONNAIRE) return null
    if (jump != null) return jump
    val index = ordered.indexOfFirst { it.id == step.id }
    return ordered.getOrNull(index + 1)?.id
}
```

Como usar:

- `ordered = steps.sortedWith(compareBy<Step> { it.order }.thenBy { it.id })`. O desempate por `id` é o mesmo do painel.
- **Pergunta:** mostre `text` e as `options`. Ao tocar numa opção, `resolveNext(step, option, ordered)`.
- **Vídeo:** mostre `text` e um botão para `videoUrl`. Ao continuar, `resolveNext(step, null, ordered)`.
- **Informação booleana:** se `infoFlag != null`, mostre `infoFlag.label` com a resposta (`value`: Sim ou Não) e, se `tipId` apontar para uma dica ativa, a dica.
- **Proteção:** o painel garante que não há ciclos, mas por segurança limite a execução (ex.: 200 passos) e trate um `nextStepId` que não existe na lista como fim.

### Partes do prompt

Guarde, para cada passo respondido com `partOfPrompt == true`:

- a resposta (o texto da opção escolhida, no idioma usado);
- `step.promptInstruction` e `option.promptInstruction`, quando não forem `null`. Elas **não são traduzidas**: vão como estão para a IA.

O formato final do prompt e a chamada à IA ficam a cargo do **serviço de geração** (servidor), que ainda não existe. O app deve enviar essas partes para esse serviço, e não chamar a IA diretamente, porque as chaves de API não podem ficar no app.

---

## 7. Modelos Kotlin sugeridos (camada `data`)

DTOs com valores padrão, para o `toObject<T>()` do Firestore funcionar e tolerar campos ausentes, e mapper para o modelo de domínio:

```kotlin
import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class LocalizedTextDto(val pt: String = "", val en: String? = null, val es: String? = null)

@IgnoreExtraProperties
data class ImageRefDto(val path: String = "", val url: String = "")

@IgnoreExtraProperties
data class StepOptionDto(
    val id: String = "",
    val text: LocalizedTextDto? = null,
    val image: ImageRefDto? = null,
    val promptInstruction: String? = null,
    val nextStepId: String? = null,
)

@IgnoreExtraProperties
data class InfoFlagDto(val label: LocalizedTextDto? = null, val value: Boolean = false, val tipId: String? = null)

@IgnoreExtraProperties
data class StepDto(
    val order: Long = 0,
    val type: String = "",
    val text: LocalizedTextDto? = null,
    val image: ImageRefDto? = null,
    val videoUrl: String? = null,
    val options: List<StepOptionDto> = emptyList(),
    val nextStepId: String? = null,
    val partOfPrompt: Boolean = false,
    val promptInstruction: String? = null,
    val infoFlag: InfoFlagDto? = null,
)
```

```kotlin
enum class Language { PT, EN, ES }

data class LocalizedText(val pt: String, val en: String?, val es: String?) {
    /** Idioma do usuário, com o português como reserva. */
    fun resolve(language: Language): String = when (language) {
        Language.PT -> pt
        Language.EN -> en ?: pt
        Language.ES -> es ?: pt
    }
}

fun LocalizedTextDto.toDomain() = LocalizedText(pt, en?.takeIf { it.isNotBlank() }, es?.takeIf { it.isNotBlank() })

/** Mapper defensivo: tipo desconhecido não quebra a tela; o passo é descartado e registrado em log. */
fun StepDto.toDomainOrNull(id: String): Step? {
    val stepType = when (type) {
        "question" -> StepType.QUESTION
        "video" -> StepType.VIDEO
        else -> return null
    }
    return Step(
        id = id,
        order = order.toInt(),
        type = stepType,
        text = text?.toDomain(),
        imageUrl = image?.url?.takeIf { it.isNotBlank() },
        videoUrl = videoUrl,
        options = options.filter { it.id.isNotBlank() }.map { it.toDomain() },
        nextStepId = nextStepId,
        partOfPrompt = partOfPrompt,
        promptInstruction = promptInstruction,
        infoFlag = infoFlag?.label?.let { InfoFlag(it.toDomain(), infoFlag.value, infoFlag.tipId) },
    )
}
```

Leitura com o ID do documento:

```kotlin
val steps = snapshot.documents.mapNotNull { doc -> doc.toObject<StepDto>()?.toDomainOrNull(doc.id) }
```

Sugestão de organização, seguindo o padrão do projeto (MVVM + Clean pragmático + Hilt):

| Camada | O quê |
| --- | --- |
| `data/remote` | `ContentRemoteDataSource`: as consultas da seção 4 (Firestore) |
| `data/model` | DTOs acima |
| `data/mapper` | `toDomain` / `toDomainOrNull` |
| `data/repository` | `QuestionnaireRepositoryImpl`, `TipRepositoryImpl`, `AdvertiserRepositoryImpl`: devolvem `Flow<…>` de modelos de domínio |
| `domain/model` | `LocalizedText`, `Step`, `StepOption`, `Questionnaire`, `Tip`, `Advertiser` |
| `domain/usecase` | `ResolveNextStepUseCase` (seção 6), `CollectPromptPartsUseCase` |
| `presentation` | ViewModels com `StateFlow<UiState>` (loading, sucesso, vazio, erro) |

---

## 8. Dados do usuário (com login)

Exigem Firebase Auth. Cada usuário só acessa o próprio `uid`.

### `users/{uid}`

O app **cria** o documento no primeiro login e **atualiza** o perfil. Só estes campos são aceitos pelas regras:

```kotlin
import com.google.firebase.firestore.FieldValue

Firebase.firestore.collection("users").document(uid).set(
    mapOf(
        "displayName" to "Diego",
        "photoUrl" to null,
        "language" to "pt",                 // "pt" | "en" | "es"
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp(),
    ),
)
```

Gravar qualquer outro campo, como `creditBalance`, é recusado com `PERMISSION_DENIED`. `creditBalance` é escrito só pelo servidor. Se ainda não existir, trate como 0.

### `users/{uid}/history` e `users/{uid}/credits`

Só leitura para o app, mais recente primeiro (índice automático):

```kotlin
Firebase.firestore.collection("users").document(uid).collection("history")
    .orderBy("createdAt", Query.Direction.DESCENDING)
    .snapshots()
```

O usuário pode **apagar** itens do próprio histórico. Créditos e histórico são **gravados pelo servidor de geração**, que ainda não existe. Por enquanto essas coleções ficam vazias. Os campos estão em [data-model.md → Usuários](data-model.md#usuários).

---

## 9. Erros e como tratar

| Erro (`FirebaseFirestoreException.Code`) | Quando acontece | O que o app faz |
| --- | --- | --- |
| `PERMISSION_DENIED` numa **lista** | Consulta sem `whereEqualTo("status", …)`, ou fora das regras | Bug do app: corrija a consulta (seção 4) |
| `PERMISSION_DENIED` num **documento** | Questionário despublicado ou dica/anunciante desativado depois que o app abriu a tela | Trate como "indisponível": volte para a lista ou esconda o item |
| `FAILED_PRECONDITION` | Consulta sem índice composto | Use as consultas documentadas; se precisar de uma nova, peça o índice no painel (`firestore.indexes.json`) |
| `UNAVAILABLE` | Sem rede | O SDK usa o cache; mostre um aviso discreto de offline |

---

## 10. Testar a leitura sem o app

Para conferir o que o app vai receber, pela API REST pública do Firestore (mesmas regras, sem login):

```bash
curl -s -X POST "https://firestore.googleapis.com/v1/projects/alarysai-b6e85/databases/(default)/documents:runQuery?key=<NEXT_PUBLIC_FIREBASE_API_KEY>" -H "Content-Type: application/json" -d '{"structuredQuery":{"from":[{"collectionId":"questionnaireCategories"}],"where":{"fieldFilter":{"field":{"fieldPath":"status"},"op":"EQUAL","value":{"stringValue":"active"}}}}}'
```

Sem o `where`, a resposta é `403 PERMISSION_DENIED`, o que confirma a regra de ouro 1. A chave é a mesma `NEXT_PUBLIC_FIREBASE_API_KEY` do painel, que é um identificador público.

Para conferir o fluxo de um questionário, use a **pré-visualização** do painel (`/questionarios/<id>/fluxo`). Ela segue o mesmo algoritmo da seção 6.

---

## 11. Estado atual do conteúdo e do contrato

| Item | Situação (2026-10-02) |
| --- | --- |
| Categorias de questionário | 3 ativas |
| Questionários publicados, dicas e anunciantes ativos | ainda nenhum (consultas devolvem listas vazias; o app precisa do estado vazio) |
| Imagens | sempre `null` até o Storage ser ativado (plano Blaze) |
| Serviço de geração (IA, créditos, histórico) | não existe ainda |
| App Android registrado no Firebase | ainda não (seção 2.1) |

Mudanças no formato dos documentos são registradas no [data-model.md](data-model.md), que é a fonte de verdade. Renomear ou remover um campo publicado é uma mudança incompatível com os apps já instalados: o painel deve **adicionar** campos novos, e não alterar os existentes, sempre que possível.
