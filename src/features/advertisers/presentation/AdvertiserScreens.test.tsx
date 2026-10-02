// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formError, formSuccess } from "@/lib/forms/form-state";

import type { Advertiser } from "../domain/advertiser";
import { AdvertiserForm, type AdvertiserFormAction } from "./AdvertiserForm";
import { AdvertiserTable } from "./AdvertiserTable";

afterEach(cleanup);

const saved: Advertiser = {
  id: "a1",
  name: "Loja X",
  image: null,
  type: "Parceiro",
  link: "https://lojax.com.br",
  order: 2,
  status: "active",
  updatedAt: null,
};

describe("AdvertiserForm", () => {
  it("suggests the types already in use", () => {
    render(<AdvertiserForm advertiser={null} knownTypes={["Parceiro", "Patrocinador"]} defaultOrder={3} action={vi.fn()} />);
    const input = screen.getByLabelText("Tipo *");
    expect(input).toHaveAttribute("list", "advertiser-types");
    const options = [...document.querySelectorAll("#advertiser-types option")].map((option) => option.getAttribute("value"));
    expect(options).toEqual(["Parceiro", "Patrocinador"]);
    expect(screen.getByLabelText("Ordem *")).toHaveValue(3);
  });

  it("shows the saved advertiser and submits it", async () => {
    const action = vi.fn<AdvertiserFormAction>().mockResolvedValue(formSuccess("Anunciante salvo."));
    render(<AdvertiserForm advertiser={saved} knownTypes={[]} defaultOrder={2} action={action} />);
    expect(screen.getByLabelText("Nome *")).toHaveValue("Loja X");
    expect(screen.getByLabelText("Link *")).toHaveValue("https://lojax.com.br");

    await userEvent.setup().click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Anunciante salvo.");
    expect(action.mock.calls[0][1].get("type")).toBe("Parceiro");
  });

  it("shows field errors and keeps what was typed", () => {
    const state = formError(
      "Revise os campos destacados.",
      { name: "Loja X", type: "Parceiro", link: "http://lojax.com.br", order: "2" },
      { link: "Use um link https:// válido (ex.: https://site.com.br)." },
    );
    render(<AdvertiserForm advertiser={null} knownTypes={[]} defaultOrder={1} action={vi.fn()} initialState={state} />);
    expect(screen.getByLabelText("Link *")).toHaveValue("http://lojax.com.br");
    expect(screen.getByLabelText("Link *")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Use um link https:\/\/ válido/)).toBeInTheDocument();
  });
});

describe("AdvertiserTable", () => {
  it("lists name, type, link and status", () => {
    render(<AdvertiserTable advertisers={[saved, { ...saved, id: "a2", name: null, type: "", status: "inactive" }]} filtered={false} />);
    const [first, second] = screen.getAllByRole("row").slice(1);
    expect(within(first).getByRole("link", { name: "Loja X" })).toHaveAttribute("href", "/anunciantes/a1");
    expect(within(first).getByRole("link", { name: "https://lojax.com.br" })).toHaveAttribute("target", "_blank");
    expect(within(first).getByText("Ativo")).toBeInTheDocument();
    expect(within(second).getByRole("link", { name: "(sem nome)" })).toBeInTheDocument();
    expect(within(second).getByText("Inativo")).toBeInTheDocument();
  });

  it("has empty states for no advertisers and no matches", () => {
    const { rerender } = render(<AdvertiserTable advertisers={[]} filtered={false} />);
    expect(screen.getByRole("link", { name: "Criar o primeiro" })).toHaveAttribute("href", "/anunciantes/novo");
    rerender(<AdvertiserTable advertisers={[]} filtered />);
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/anunciantes");
  });
});
