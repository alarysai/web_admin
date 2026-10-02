// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Questionnaire } from "../domain/questionnaire";
import { QuestionnaireTable } from "./QuestionnaireTable";

afterEach(cleanup);

const names = { c1: { pt: "Ética", en: null, es: null } };

const rows: Questionnaire[] = [
  {
    id: "q1",
    title: { pt: "Ética na IA", en: null, es: null },
    description: null,
    categoryId: "c1",
    languages: ["pt", "en"],
    order: 1,
    status: "published",
    updatedAt: new Date("2026-10-02T12:00:00Z"),
  },
  {
    id: "q2",
    title: { pt: "Rascunho", en: null, es: null },
    description: null,
    categoryId: "missing",
    languages: ["pt"],
    order: 2,
    status: "draft",
    updatedAt: null,
  },
];

describe("QuestionnaireTable", () => {
  it("lists questionnaires with category, languages, status and a link to edit", () => {
    render(<QuestionnaireTable questionnaires={rows} categoryNames={names} filtered={false} />);

    const first = screen.getAllByRole("row")[1];
    expect(within(first).getByRole("link", { name: "Ética na IA" })).toHaveAttribute("href", "/questionarios/q1");
    expect(within(first).getByText("Ética")).toBeInTheDocument();
    expect(within(first).getByText("pt · en")).toBeInTheDocument();
    expect(within(first).getByText("Publicado")).toBeInTheDocument();

    const second = screen.getAllByRole("row")[2];
    expect(within(second).getByText("Categoria removida")).toBeInTheDocument();
    expect(within(second).getByText("Rascunho", { selector: "span" })).toBeInTheDocument();
    expect(within(second).getByText("—")).toBeInTheDocument();
  });

  it("invites to create the first questionnaire when there is none", () => {
    render(<QuestionnaireTable questionnaires={[]} categoryNames={names} filtered={false} />);
    expect(screen.getByText(/Nenhum questionário cadastrado ainda/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar o primeiro" })).toHaveAttribute("href", "/questionarios/novo");
  });

  it("offers to clear the filters when nothing matches", () => {
    render(<QuestionnaireTable questionnaires={[]} categoryNames={names} filtered />);
    expect(screen.getByText(/Nenhum questionário encontrado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/questionarios");
  });
});
