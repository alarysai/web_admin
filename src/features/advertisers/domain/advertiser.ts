import { z } from "zod";

import { imageRefSchema, type ImageRef } from "@/lib/content/image-ref";
import { normalizeForSearch } from "@/lib/content/localized-text";

export const ADVERTISER_STATUSES = ["active", "inactive"] as const;
export type AdvertiserStatus = (typeof ADVERTISER_STATUSES)[number];

export const ADVERTISER_STATUS_LABELS: Record<AdvertiserStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

/** `advertisers/{advertiserId}` as shown in the panel (docs/data-model.md). */
export type Advertiser = {
  id: string;
  name: string | null;
  image: ImageRef | null;
  type: string;
  link: string;
  order: number;
  status: AdvertiserStatus;
  updatedAt: Date | null;
};

export const ADVERTISER_TYPE_MAX_LENGTH = 40;

/** Free-text type, tidied up: trimmed and with single spaces ("  Banner   topo " → "Banner topo"). */
export function tidyType(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Fields edited in the advertiser form. Name OR image is required; until
 * images can be uploaded (Storage), that means the name. The link must be a
 * valid https:// URL. Status changes through activate/deactivate.
 */
export const advertiserInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .nullable()
      .transform((value) => (value ? value : null)),
    image: imageRefSchema.nullable(),
    type: z
      .string()
      .transform(tidyType)
      .pipe(
        z
          .string()
          .min(1, "Informe o tipo.")
          .max(ADVERTISER_TYPE_MAX_LENGTH, `Use até ${ADVERTISER_TYPE_MAX_LENGTH} caracteres.`),
      ),
    link: z.string().trim().pipe(z.url({ protocol: /^https$/, error: "Use um link https:// válido (ex.: https://site.com.br)." })),
    order: z.number({ error: "Informe a ordem." }).int("Use um número inteiro.").min(0, "Use 0 ou mais."),
  })
  .refine((advertiser) => advertiser.name !== null || advertiser.image !== null, {
    message: "Informe o nome ou uma imagem.",
    path: ["name"],
  });

export type AdvertiserInput = z.infer<typeof advertiserInputSchema>;

/**
 * Distinct types for the filter and the form suggestions. Free text, so
 * "Banner", "banner " and "BANNER" count as one (case, accents and spaces
 * ignored); the first spelling found is the one shown.
 */
export function advertiserTypes(advertisers: ReadonlyArray<Pick<Advertiser, "type">>): string[] {
  const byKey = new Map<string, string>();
  for (const { type } of advertisers) {
    const display = tidyType(type);
    const key = normalizeForSearch(display);
    if (key && !byKey.has(key)) byKey.set(key, display);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt"));
}

export type AdvertiserFilters = { query: string; type: string | null };

/** Search on name and link, filter by type (same normalization as advertiserTypes), ordered by `order` then name. */
export function filterAdvertisers(advertisers: Advertiser[], filters: AdvertiserFilters): Advertiser[] {
  const query = normalizeForSearch(filters.query);
  const type = filters.type ? normalizeForSearch(tidyType(filters.type)) : null;
  return advertisers
    .filter((advertiser) => !type || normalizeForSearch(tidyType(advertiser.type)) === type)
    .filter(
      (advertiser) =>
        !query ||
        normalizeForSearch(advertiser.name ?? "").includes(query) ||
        normalizeForSearch(advertiser.link).includes(query),
    )
    .sort((a, b) => a.order - b.order || (a.name ?? "").localeCompare(b.name ?? "", "pt"));
}

/** Reads `?q=` and `?tipo=` from the advertisers list URL. */
export function readAdvertiserFilters(params: Record<string, string | string[] | undefined>): AdvertiserFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const type = tidyType(first(params.tipo));
  return { query: first(params.q), type: type || null };
}
