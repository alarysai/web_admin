// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListFilters } from "@/components/layout/ListFilters";
import { actionFailure, actionSuccess } from "@/lib/forms/action-result";
import { formError, formSuccess } from "@/lib/forms/form-state";

import type { Tip } from "../domain/tip";
import { TipActions } from "./TipActions";
import { TipForm, type TipFormAction } from "./TipForm";
import { TipTable } from "./TipTable";

afterEach(cleanup);

const saved: Tip = {
  id: "t1",
  categoryId: "etica",
  text: { pt: "Cite as fontes", en: "Cite sources", es: null },
  languages: ["pt"],
  order: 3,
  status: "active",
  updatedAt: null,
};

const categories = [
  { value: "etica", label: "Ética" },
  { value: "conhecimento", label: "Conhecimento (inativa)" },
];

describe("TipForm", () => {
  it("shows the saved tip and submits it", async () => {
    const action = vi.fn<TipFormAction>().mockResolvedValue(formSuccess("Dica salva."));
    render(<TipForm tip={saved} categories={categories} defaultOrder={3} action={action} />);
    expect(screen.getByLabelText("Categoria *")).toHaveValue("etica");
    expect(screen.getByDisplayValue("Cite sources")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Dica salva.");
    expect(action.mock.calls[0][1].get("text.pt")).toBe("Cite as fontes");
  });

  it("starts a new tip with the suggested order and shows field errors", () => {
    const state = formError("Revise os campos destacados.", { categoryId: "", "text.pt": "", order: "5" }, { categoryId: "Escolha uma categoria." });
    render(<TipForm tip={null} categories={categories} defaultOrder={5} action={vi.fn()} initialState={state} />);
    expect(screen.getByLabelText("Ordem *")).toHaveValue(5);
    expect(screen.getByText("Escolha uma categoria.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar dica" })).toBeInTheDocument();
  });
});

describe("TipTable", () => {
  it("lists tips with category, languages and status", () => {
    render(<TipTable tips={[saved, { ...saved, id: "t2", categoryId: "gone", status: "inactive" }]} categoryNames={{ etica: { pt: "Ética", en: null, es: null } }} filtered={false} />);
    const [first, second] = screen.getAllByRole("row").slice(1);
    expect(within(first).getByRole("link", { name: "Cite as fontes" })).toHaveAttribute("href", "/dicas/t1");
    expect(within(first).getByText("Ativa")).toBeInTheDocument();
    expect(within(second).getByText("Categoria removida")).toBeInTheDocument();
    expect(within(second).getByText("Inativa")).toBeInTheDocument();
  });

  it("has empty states for no tips and no matches", () => {
    const { rerender } = render(<TipTable tips={[]} categoryNames={{}} filtered={false} />);
    expect(screen.getByRole("link", { name: "Criar a primeira" })).toHaveAttribute("href", "/dicas/nova");
    rerender(<TipTable tips={[]} categoryNames={{}} filtered />);
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/dicas");
  });
});

describe("TipActions", () => {
  const actions = () => ({
    activate: vi.fn().mockResolvedValue(actionSuccess("Dica ativada: já aparece nos apps.")),
    deactivate: vi.fn().mockResolvedValue(actionSuccess("Dica desativada: saiu dos apps.", ["Questionários publicados…"])),
    remove: vi.fn().mockResolvedValue(actionFailure("Esta dica está ligada a passos de questionários. Remova a ligação antes de excluir:", ["Ética na IA (publicado)"])),
  });

  it("activates an inactive tip", async () => {
    const a = actions();
    render(<TipActions status="inactive" confirm={() => true} {...a} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Ativar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Dica ativada");
  });

  it("asks before deactivating and shows the warnings", async () => {
    const a = actions();
    const confirm = vi.fn(() => true);
    render(<TipActions status="active" confirm={confirm} {...a} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Desativar" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("sai dos apps"));
    expect(await screen.findByRole("status")).toHaveTextContent("Questionários publicados…");
  });

  it("shows where the tip is used when deleting is blocked", async () => {
    const a = actions();
    render(<TipActions status="active" confirm={() => true} {...a} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ética na IA (publicado)");
  });

  it("does nothing when the admin cancels the delete", async () => {
    const a = actions();
    render(<TipActions status="active" confirm={() => false} {...a} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir" }));
    expect(a.remove).not.toHaveBeenCalled();
  });
});

describe("ListFilters", () => {
  it("keeps the current filters and offers to clear them", () => {
    render(<ListFilters basePath="/dicas" query="etica" categoryId="etica" categories={categories} searchPlaceholder="Texto" />);
    expect(screen.getByRole("searchbox")).toHaveValue("etica");
    expect(screen.getByLabelText("Categoria")).toHaveValue("etica");
    expect(screen.getByRole("link", { name: "Limpar" })).toHaveAttribute("href", "/dicas");
  });

  it("hides Limpar without filters", () => {
    render(<ListFilters basePath="/dicas" query="" categoryId={null} categories={categories} searchPlaceholder="Texto" />);
    expect(screen.queryByRole("link", { name: "Limpar" })).not.toBeInTheDocument();
  });
});
