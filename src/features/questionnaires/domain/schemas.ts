import { z } from "zod";

import { imageRefSchema } from "@/lib/content/image-ref";
import { localizedTextSchema } from "@/lib/content/localized-text";

/**
 * Zod schemas for questionnaires, steps and options (docs/data-model.md).
 * They validate what the panel writes; the inferred types are the domain types.
 */

export const QUESTIONNAIRE_STATUSES = ["draft", "published"] as const;
export type QuestionnaireStatus = (typeof QUESTIONNAIRE_STATUSES)[number];

export const QUESTIONNAIRE_STATUS_LABELS: Record<QuestionnaireStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
};

export const STEP_TYPES = ["video", "question"] as const;
export type StepType = (typeof STEP_TYPES)[number];

/** `nextStepId` value that ends the questionnaire. */
export const END_OF_QUESTIONNAIRE = "__end__";

/** How a question is answered (proposta-questionario-v2). Only meaningful for `type == "question"`. */
export const ANSWER_TYPES = ["single_choice", "multiple_choice", "open_text", "yes_no"] as const;
export type AnswerType = (typeof ANSWER_TYPES)[number];

export const ANSWER_TYPE_LABELS: Record<AnswerType, string> = {
  single_choice: "Escolha única",
  multiple_choice: "Múltipla escolha",
  open_text: "Resposta aberta",
  yes_no: "Sim ou não",
};

/** Defaults the apps assume when a field is missing (documents saved before v2). */
export const DEFAULT_ANSWER_TYPE: AnswerType = "single_choice";
export const DEFAULT_MAX_LENGTH = 500;
export const MAX_LENGTH_LIMIT = 5000;

/** v2 step fields as the apps read them when absent: single choice, required, 500 characters. */
export const DEFAULT_ANSWER_FIELDS = {
  answerType: DEFAULT_ANSWER_TYPE,
  helpText: null,
  required: true,
  maxLength: DEFAULT_MAX_LENGTH,
  placeholder: null,
} as const;

/** Answer types whose options carry their own jump. Multiple choice cannot: no single option decides. */
export function optionJumpsApply(answerType: AnswerType): boolean {
  return answerType === "single_choice" || answerType === "yes_no";
}

/** Open answers have no options. */
export function answerTypeHasOptions(answerType: AnswerType): boolean {
  return answerType !== "open_text";
}

const optionalString = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? value : null));

const stepReference = z.string().trim().min(1).nullable();

const tipReference = z.string().trim().min(1).nullable();

export const orderSchema = z
  .number({ error: "Informe a ordem." })
  .int("Use um número inteiro.")
  .min(0, "Use 0 ou mais.");

// ---------- questionnaire ----------

/** Fields edited in the questionnaire form. Status changes come with publishing. */
export const questionnaireInputSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  categoryId: z.string().trim().min(1, "Escolha uma categoria."),
  order: orderSchema,
  /** Informative cost shown in the app review screen; the real debit happens on the server. null = not shown. */
  creditCost: z.number({ error: "Informe um número." }).int("Use um número inteiro.").min(0, "Use 0 ou mais.").nullable(),
});

export type QuestionnaireInput = z.infer<typeof questionnaireInputSchema>;

// ---------- step option ----------

export const stepOptionSchema = z
  .object({
    id: z.string().trim().min(1),
    text: localizedTextSchema.nullable(),
    image: imageRefSchema.nullable(),
    promptInstruction: optionalString,
    nextStepId: stepReference,
    /** Tip shown while this option is selected; wins over the step's info flag tip. */
    tipId: tipReference,
  })
  .refine((option) => option.text !== null || option.image !== null, {
    message: "Informe um texto ou uma imagem para a opção.",
    path: ["text"],
  });

export type StepOption = z.infer<typeof stepOptionSchema>;

// ---------- step ----------

export const infoFlagSchema = z.object({
  label: localizedTextSchema,
  value: z.boolean(),
  tipId: tipReference,
});

export type InfoFlag = z.infer<typeof infoFlagSchema>;

export const stepSchema = z
  .object({
    order: orderSchema,
    type: z.enum(STEP_TYPES, { error: "Escolha o tipo do passo." }),
    text: localizedTextSchema.nullable(),
    image: imageRefSchema.nullable(),
    videoUrl: z.url({ protocol: /^https$/, error: "Use um link https:// válido." }).nullable(),
    options: z.array(stepOptionSchema),
    nextStepId: stepReference,
    partOfPrompt: z.boolean(),
    promptInstruction: optionalString,
    infoFlag: infoFlagSchema.nullable(),
    answerType: z.enum(ANSWER_TYPES, { error: "Escolha o tipo de resposta." }),
    helpText: localizedTextSchema.nullable(),
    required: z.boolean(),
    maxLength: z
      .number({ error: "Informe o limite de caracteres." })
      .int("Use um número inteiro.")
      .min(1, "Use de 1 a 5000.")
      .max(MAX_LENGTH_LIMIT, "Use de 1 a 5000."),
    placeholder: localizedTextSchema.nullable(),
  })
  .superRefine((step, context) => {
    if (step.text === null && step.image === null) {
      context.addIssue({ code: "custom", path: ["text"], message: "Informe um texto ou uma imagem para o passo." });
    }

    if (step.type === "video") {
      if (step.videoUrl === null) {
        context.addIssue({ code: "custom", path: ["videoUrl"], message: "Informe o link do vídeo." });
      }
      if (step.options.length > 0) {
        context.addIssue({ code: "custom", path: ["options"], message: "Passos de vídeo não têm opções." });
      }
      if (!step.required) {
        context.addIssue({ code: "custom", path: ["required"], message: "Só perguntas podem ser opcionais." });
      }
    }

    if (step.type === "question") {
      if (step.videoUrl !== null) {
        context.addIssue({ code: "custom", path: ["videoUrl"], message: "Perguntas não têm link de vídeo." });
      }
      addAnswerTypeIssues(step, context);
    }

    const seen = new Set<string>();
    step.options.forEach((option, index) => {
      if (seen.has(option.id)) {
        context.addIssue({ code: "custom", path: ["options", index, "id"], message: "ID de opção repetido." });
      }
      seen.add(option.id);
    });
  });

export type Step = z.infer<typeof stepSchema>;

type AnswerFields = Pick<z.infer<typeof stepSchema>, "answerType" | "options">;

/** Rules per answer type (proposta-questionario-v2, section 3). */
function addAnswerTypeIssues(step: AnswerFields, context: z.RefinementCtx) {
  const issue = (path: PropertyKey[], message: string) => context.addIssue({ code: "custom", path, message });

  if (step.answerType === "open_text") {
    if (step.options.length > 0) issue(["options"], "Resposta aberta não tem opções.");
    return;
  }
  if (step.options.length === 0) issue(["options"], "Adicione ao menos uma opção.");
  if (step.answerType === "yes_no" && step.options.length !== 2) {
    issue(["options"], "Sim ou não precisa de exatamente 2 opções (ex.: Sim e Não).");
  }
  if (!optionJumpsApply(step.answerType)) {
    step.options.forEach((option, index) => {
      if (option.nextStepId !== null) {
        issue(["options", index, "nextStepId"], "Na múltipla escolha o salto é do passo, não da opção.");
      }
    });
  }
}
