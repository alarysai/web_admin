import { asDate, asEnum, asImage, asNumber, asString } from "@/lib/content/firestore-mapping";

import { ADVERTISER_STATUSES, type Advertiser } from "../domain/advertiser";

/** Firestore document → advertiser. Unknown status is treated as inactive (hidden from the apps). */
export function toAdvertiser(id: string, data: Record<string, unknown> | undefined): Advertiser {
  const raw = data ?? {};
  return {
    id,
    name: asString(raw.name),
    image: asImage(raw.image),
    type: asString(raw.type) ?? "",
    link: asString(raw.link) ?? "",
    order: asNumber(raw.order),
    status: asEnum(raw.status, ADVERTISER_STATUSES, "inactive"),
    updatedAt: asDate(raw.updatedAt),
  };
}
