import type { CategoryKind } from "../domain/category";

/** Where each kind of category lives in the panel, and how it is described. */
export const CATEGORY_SECTIONS: Record<
  CategoryKind,
  { basePath: string; title: string; description: string; newLabel: string; usedBy: string }
> = {
  questionnaire: {
    basePath: "/categorias",
    title: "Categorias de questionário",
    description: "Organizam a grade de questionários nos apps. Só as ativas aparecem.",
    newLabel: "Nova categoria",
    usedBy: "/questionarios",
  },
  tip: {
    basePath: "/categorias-dicas",
    title: "Categorias de dicas",
    description: "Agrupam as dicas (ex.: Ética, Conhecimento). Só as ativas aparecem nos apps.",
    newLabel: "Nova categoria de dica",
    usedBy: "/dicas",
  },
};
