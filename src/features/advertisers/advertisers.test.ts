import { describe, expect, it, vi } from "vitest";

import { SESSION_EXPIRED_MESSAGE } from "@/lib/forms/form-state";

import { toAdvertiser } from "./data/advertiser-mapper";
import {
  advertiserInputSchema,
  advertiserTypes,
  filterAdvertisers,
  readAdvertiserFilters,
  tidyType,
  type Advertiser,
} from "./domain/advertiser";
import { activateAdvertiser, deactivateAdvertiser, deleteAdvertiserById } from "./server/advertiser-lifecycle";
import { saveAdvertiser, type SaveAdvertiserDeps } from "./server/save-advertiser";

const admin = { uid: "admin-1", email: null };

function advertiser(id: string, overrides: Partial<Advertiser> = {}): Advertiser {
  return {
    id,
    name: id,
    image: null,
    type: "Parceiro",
    link: "https://example.com",
    order: 0,
    status: "inactive",
    updatedAt: null,
    ...overrides,
  };
}

const paths = (result: { error?: { issues: { path: PropertyKey[] }[] } }) => result.error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("advertiserInputSchema", () => {
  const valid = { name: "Loja X", image: null, type: "  Patrocinador   ouro ", link: " https://lojax.com.br/promo ", order: 1 };

  it("accepts a valid advertiser and tidies the type and link", () => {
    expect(advertiserInputSchema.parse(valid)).toEqual({
      name: "Loja X",
      image: null,
      type: "Patrocinador ouro",
      link: "https://lojax.com.br/promo",
      order: 1,
    });
  });

  it("requires a name or an image", () => {
    expect(paths(advertiserInputSchema.safeParse({ ...valid, name: "  " }))).toEqual(["name"]);
    const imageOnly = { ...valid, name: null, image: { path: "content/advertisers/a/logo.png", url: "https://x.test/logo.png" } };
    expect(advertiserInputSchema.safeParse(imageOnly).success).toBe(true);
  });

  it.each([["http://lojax.com.br"], ["lojax.com.br"], ["javascript:alert(1)"], [""]])("rejects the link %j", (link) => {
    expect(paths(advertiserInputSchema.safeParse({ ...valid, link }))).toContain("link");
  });

  it("requires a type up to 40 characters", () => {
    expect(paths(advertiserInputSchema.safeParse({ ...valid, type: "   " }))).toContain("type");
    expect(paths(advertiserInputSchema.safeParse({ ...valid, type: "x".repeat(41) }))).toContain("type");
  });
});

describe("advertiser types", () => {
  it("tidies spaces", () => {
    expect(tidyType("  Banner    topo ")).toBe("Banner topo");
  });

  it("lists each type once, ignoring case, accents and spaces, sorted", () => {
    const list = [
      advertiser("a", { type: "Parceiro" }),
      advertiser("b", { type: "parceiro " }),
      advertiser("c", { type: "Patrocínio" }),
      advertiser("d", { type: "PATROCINIO" }),
      advertiser("e", { type: "" }),
    ];
    expect(advertiserTypes(list)).toEqual(["Parceiro", "Patrocínio"]);
  });
});

describe("filterAdvertisers / readAdvertiserFilters", () => {
  const list = [
    advertiser("b", { name: "Loja B", type: "Parceiro", order: 2 }),
    advertiser("a", { name: "Loja A", type: "patrocínio", order: 1, link: "https://promo.test" }),
  ];

  it("filters by type with the same normalization as the type list", () => {
    expect(filterAdvertisers(list, { query: "", type: "PATROCINIO" }).map((a) => a.id)).toEqual(["a"]);
  });

  it("searches name and link, ordered by order", () => {
    expect(filterAdvertisers(list, { query: "", type: null }).map((a) => a.id)).toEqual(["a", "b"]);
    expect(filterAdvertisers(list, { query: "loja b", type: null }).map((a) => a.id)).toEqual(["b"]);
    expect(filterAdvertisers(list, { query: "promo", type: null }).map((a) => a.id)).toEqual(["a"]);
  });

  it("reads ?q= and ?tipo=", () => {
    expect(readAdvertiserFilters({ q: "x", tipo: " Parceiro " })).toEqual({ query: "x", type: "Parceiro" });
    expect(readAdvertiserFilters({})).toEqual({ query: "", type: null });
  });
});

describe("toAdvertiser", () => {
  it("fills safe defaults and treats unknown status as inactive", () => {
    expect(toAdvertiser("a1", { status: "on", image: { path: "x" } })).toMatchObject({
      name: null,
      image: null,
      type: "",
      link: "",
      status: "inactive",
    });
  });
});

describe("saveAdvertiser", () => {
  const form = (overrides: Record<string, string> = {}) => {
    const data = new FormData();
    Object.entries({ name: "Loja X", type: "Parceiro", link: "https://lojax.com.br", order: "1", ...overrides }).forEach(([key, value]) =>
      data.append(key, value),
    );
    return data;
  };

  function deps(overrides: Partial<SaveAdvertiserDeps> = {}): SaveAdvertiserDeps {
    return {
      getCurrentAdmin: vi.fn().mockResolvedValue(admin),
      create: vi.fn().mockResolvedValue("new-ad"),
      update: vi.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  it("creates and updates", async () => {
    const d = deps();
    await expect(saveAdvertiser(null, form(), d)).resolves.toEqual({ ok: true, id: "new-ad", created: true });
    await expect(saveAdvertiser("a1", form(), d)).resolves.toEqual({ ok: true, id: "a1", created: false });
    expect(d.update).toHaveBeenCalledWith(
      "a1",
      { name: "Loja X", image: null, type: "Parceiro", link: "https://lojax.com.br", order: 1 },
      "admin-1",
    );
  });

  it("returns field errors for an http link and a missing name", async () => {
    const result = await saveAdvertiser(null, form({ name: "", link: "http://lojax.com.br" }), deps());
    expect(result).toMatchObject({ ok: false, state: { fieldErrors: { name: "Informe o nome ou uma imagem.", link: expect.stringContaining("https://") } } });
  });

  it("refuses without a session and reports an advertiser deleted meanwhile", async () => {
    expect(await saveAdvertiser(null, form(), deps({ getCurrentAdmin: vi.fn().mockResolvedValue(null) }))).toMatchObject({
      ok: false,
      state: { message: SESSION_EXPIRED_MESSAGE },
    });
    expect(await saveAdvertiser("gone", form(), deps({ update: vi.fn().mockResolvedValue(false) }))).toMatchObject({
      ok: false,
      state: { message: "Este anunciante não existe mais." },
    });
  });
});

describe("advertiser lifecycle", () => {
  const base = { getCurrentAdmin: vi.fn().mockResolvedValue(admin), setStatus: vi.fn().mockResolvedValue(true) };

  it("activates valid data", async () => {
    const setStatus = vi.fn().mockResolvedValue(true);
    const result = await activateAdvertiser("a1", { ...base, setStatus, findAdvertiser: vi.fn().mockResolvedValue(advertiser("a1")) });
    expect(result).toMatchObject({ ok: true });
    expect(setStatus).toHaveBeenCalledWith("a1", "active", "admin-1");
  });

  it("refuses to activate malformed legacy data", async () => {
    const setStatus = vi.fn();
    const broken = advertiser("a1", { name: null, link: "http://old.test" });
    const result = await activateAdvertiser("a1", { ...base, setStatus, findAdvertiser: vi.fn().mockResolvedValue(broken) });
    expect(result).toMatchObject({ ok: false, problems: expect.arrayContaining(["Informe o nome ou uma imagem."]) });
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("deactivates and deletes, refusing without a session", async () => {
    await expect(deactivateAdvertiser("a1", base)).resolves.toMatchObject({ ok: true });
    const remove = vi.fn().mockResolvedValue(true);
    await expect(deleteAdvertiserById("a1", { getCurrentAdmin: base.getCurrentAdmin, remove })).resolves.toMatchObject({ ok: true });
    expect(remove).toHaveBeenCalledWith("a1");
    await expect(deleteAdvertiserById("a1", { getCurrentAdmin: vi.fn().mockResolvedValue(null), remove: vi.fn() })).resolves.toMatchObject({
      ok: false,
      message: SESSION_EXPIRED_MESSAGE,
    });
  });
});
