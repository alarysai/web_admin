import { z } from "zod";

/** `ImageRef` (docs/data-model.md): Storage path to replace/delete the file, URL for the apps. */
export const imageRefSchema = z.object({
  path: z.string().min(1),
  url: z.url({ protocol: /^https?$/, error: "URL de imagem inválida." }),
});

export type ImageRef = z.infer<typeof imageRefSchema>;
