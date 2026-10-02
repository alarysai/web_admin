// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formError, formSuccess } from "@/lib/forms/form-state";

import type { StepRecord } from "../domain/steps";
import { StepForm, type StepFormAction } from "./StepForm";

afterEach(cleanup);

const saved: StepRecord = {
  id: "s1",
  order: 2,
  type: "question",
  text: { pt: "Qual tema?", en: null, es: null },
  image: null,
  videoUrl: null,
  options: [
    { id: "o1", text: { pt: "Ética", en: "Ethics", es: null }, image: null, promptInstruction: "fale de ética", nextStepId: "s5" },
    { id: "o2", text: { pt: "Redação", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null },
  ],
  nextStepId: "__end__",
  partOfPrompt: true,
  promptInstruction: null,
  infoFlag: null,
};

function renderForm(props: Partial<Parameters<typeof StepForm>[0]> = {}) {
  const action = vi.fn<StepFormAction>().mockResolvedValue(formSuccess("Passo salvo."));
  render(
    <StepForm
      questionnaireId="q1"
      step={null}
      defaultOrder={4}
      initialOptionId="first"
      jumpTargets={[
        { id: "s5", label: "#5 · Último" },
        { id: "s6", label: "#6 · Extra" },
      ]}
      action={action}
      {...props}
    />,
  );
  return action;
}

const optionBlocks = () => screen.getAllByText(/^Opção \d+$/).map((label) => label.closest("div")!.parentElement!);

describe("StepForm", () => {
  it("starts a new step as a question with one option and the next order", () => {
    renderForm();
    expect(screen.getByLabelText("Pergunta", { selector: "input" })).toBeChecked();
    expect(screen.getByLabelText("Ordem *")).toHaveValue(4);
    expect(screen.getAllByText(/^Opção \d+$/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remover opção 1" })).toBeDisabled();
  });

  it("switches to video: shows the link field and hides the options", async () => {
    renderForm();
    await userEvent.setup().click(screen.getByLabelText("Vídeo", { selector: "input" }));
    expect(screen.getByLabelText("Link do vídeo *")).toBeRequired();
    expect(screen.queryByText("Opções de resposta")).not.toBeInTheDocument();
  });

  it("adds and removes options", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Adicionar opção" }));
    await user.click(screen.getByRole("button", { name: "Adicionar opção" }));
    expect(screen.getAllByText(/^Opção \d+$/)).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Remover opção 2" }));
    expect(screen.getAllByText(/^Opção \d+$/)).toHaveLength(2);
  });

  it("shows the info flag fields only when enabled", async () => {
    renderForm();
    expect(screen.queryByText("Pergunta informativa")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByLabelText(/tem uma informação booleana/));
    expect(screen.getByText("Pergunta informativa")).toBeInTheDocument();
    expect(screen.getByLabelText("Não")).toBeChecked();
  });

  it("shows the saved step and submits options in order, with their jumps", async () => {
    const action = renderForm({ step: saved, defaultOrder: saved.order });
    expect(screen.getByDisplayValue("Qual tema?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ethics")).toBeInTheDocument();
    expect(screen.getByDisplayValue("fale de ética")).toBeInTheDocument();
    expect(screen.getByLabelText("Vira parte do prompt?")).toBeChecked();
    expect(screen.getByLabelText("Próximo passo")).toHaveValue("__end__");
    const [firstJump, secondJump] = screen.getAllByLabelText("Depois desta opção");
    expect(firstJump).toHaveValue("s5");
    expect(secondJump).toHaveValue("");

    await userEvent.setup().click(screen.getByRole("button", { name: "Salvar passo" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Passo salvo.");

    const data = action.mock.calls[0][1];
    expect([...data.keys()].filter((key) => key.endsWith(".id") && key.startsWith("options."))).toEqual([
      "options.o1.id",
      "options.o2.id",
    ]);
    expect(data.get("options.o1.nextStepId")).toBe("s5");
    expect(data.get("nextStepId")).toBe("__end__");
    expect(data.get("partOfPrompt")).toBe("on");
  });

  it("shows option errors next to the right option and keeps what was typed", () => {
    const state = formError(
      "Revise os campos destacados.",
      {
        type: "question",
        order: "2",
        "text.pt": "Qual tema?",
        "options.o1.id": "o1",
        "options.o1.text.pt": "",
        "options.o1.text.en": "Typed",
        "options.o2.id": "o2",
        "options.o2.text.pt": "Redação",
      },
      { "options.o1.text.pt": "Obrigatório em português." },
    );
    renderForm({ step: saved, defaultOrder: 2, initialState: state });

    const [first, second] = optionBlocks();
    expect(within(first).getByText("Obrigatório em português.")).toBeInTheDocument();
    expect(within(first).getByDisplayValue("Typed")).toBeInTheDocument();
    expect(within(second).queryByText("Obrigatório em português.")).not.toBeInTheDocument();
    // Unchecked on submit: must not come back checked from the saved step.
    expect(screen.getByLabelText("Vira parte do prompt?")).not.toBeChecked();
  });
});

describe("StepForm jumps", () => {
  it("offers follow-the-order, every other step and the end", () => {
    renderForm();
    const options = within(screen.getByLabelText("Próximo passo")).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Seguir a ordem", "Ir para #5 · Último", "Ir para #6 · Extra", "Encerrar o questionário"]);
  });

  it("lets an option jump somewhere else", async () => {
    const user = userEvent.setup();
    const action = renderForm();
    // Required fields first, or the browser blocks the submit.
    const [questionPt, optionPt] = screen.getAllByLabelText("Português *");
    await user.type(questionPt, "Qual tema?");
    await user.type(optionPt, "Ética");
    await user.selectOptions(screen.getByLabelText("Depois desta opção"), "s6");
    await user.click(screen.getByRole("button", { name: "Criar passo" }));
    await screen.findByRole("status");
    expect(action.mock.calls[0][1].get("options.first.nextStepId")).toBe("s6");
  });

  it("keeps a saved jump to a deleted step visible instead of dropping it", () => {
    renderForm({ step: { ...saved, nextStepId: "ghost" }, defaultOrder: 2 });
    expect(screen.getByLabelText("Próximo passo")).toHaveValue("ghost");
    expect(screen.getByRole("option", { name: "Passo inexistente (ghost)" })).toBeInTheDocument();
  });
});
