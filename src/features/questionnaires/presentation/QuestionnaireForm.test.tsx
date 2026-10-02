// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formError, formSuccess, type FormState } from "@/lib/forms/form-state";

import type { Questionnaire } from "../domain/questionnaire";
import { QuestionnaireForm, type QuestionnaireFormAction } from "./QuestionnaireForm";

afterEach(cleanup);

const categories = [
  { value: "c1", label: "Ética" },
  { value: "c2", label: "Redação" },
];

const saved: Questionnaire = {
  id: "q1",
  title: { pt: "Ética na IA", en: "AI ethics", es: null },
  description: null,
  categoryId: "c2",
  languages: ["pt"],
  order: 4,
  status: "draft",
  updatedAt: null,
};

describe("QuestionnaireForm", () => {
  it("starts empty for a new questionnaire", () => {
    render(<QuestionnaireForm questionnaire={null} categories={categories} action={vi.fn()} />);
    expect(screen.getByLabelText("Português *", { selector: "input[name='title.pt']" })).toHaveValue("");
    expect(screen.getByLabelText("Categoria *")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Criar questionário" })).toBeEnabled();
  });

  it("shows the saved values when editing", () => {
    render(<QuestionnaireForm questionnaire={saved} categories={categories} action={vi.fn()} />);
    expect(screen.getByDisplayValue("Ética na IA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI ethics")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria *")).toHaveValue("c2");
    expect(screen.getByLabelText("Ordem *")).toHaveValue(4);
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("submits the fields to the action", async () => {
    const action = vi.fn<QuestionnaireFormAction>().mockResolvedValue(formSuccess("Questionário salvo."));
    const user = userEvent.setup();
    render(<QuestionnaireForm questionnaire={saved} categories={categories} action={action} />);

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Questionário salvo.");
    const formData = action.mock.calls[0][1];
    expect(formData.get("title.pt")).toBe("Ética na IA");
    expect(formData.get("categoryId")).toBe("c2");
    expect(formData.get("order")).toBe("4");
  });

  it("shows field errors and keeps what was typed", async () => {
    const errorState: FormState = formError(
      "Revise os campos destacados.",
      { "title.pt": "", "title.en": "Typed in English", order: "-1", categoryId: "c1" },
      { "title.pt": "Obrigatório em português.", order: "Use 0 ou mais." },
    );
    render(<QuestionnaireForm questionnaire={null} categories={categories} action={vi.fn()} initialState={errorState} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Revise os campos destacados.");
    expect(screen.getByText("Obrigatório em português.")).toBeInTheDocument();
    expect(screen.getByText("Use 0 ou mais.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Typed in English")).toBeInTheDocument();
    expect(screen.getByLabelText("Ordem *")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Categoria *")).toHaveValue("c1");
  });

  it("disables the button while saving", async () => {
    let finish: (state: FormState) => void = () => {};
    const action = vi.fn<QuestionnaireFormAction>(() => new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<QuestionnaireForm questionnaire={saved} categories={categories} action={action} />);

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();

    finish(formSuccess("Questionário salvo."));
    expect(await screen.findByRole("button", { name: "Salvar alterações" })).toBeEnabled();
  });
});
