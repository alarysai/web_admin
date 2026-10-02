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

const optionalString = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value ? value : null));

const stepReference = z.string().trim().min(1).nullable();

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
  tipId: z.string().trim().min(1).nullable(),
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
    }

    if (step.type === "question") {
      if (step.videoUrl !== null) {
        context.addIssue({ code: "custom", path: ["videoUrl"], message: "Perguntas não têm link de vídeo." });
      }
      if (step.options.length === 0) {
        context.addIssue({ code: "custom", path: ["options"], message: "Adicione ao menos uma opção." });
      }
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
