// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { unreachableSteps, validateFlow } from "../domain/flow";
import type { StepRecord } from "../domain/steps";
import { FlowMap } from "./FlowMap";
import { FlowSimulator } from "./FlowSimulator";
import { DEFAULT_ANSWER_FIELDS } from "../domain/schemas";

afterEach(cleanup);

const steps: StepRecord[] = [
  {
    id: "intro",
    order: 1,
    type: "video",
    text: { pt: "Assista à introdução", en: "Watch the intro", es: null },
    image: null,
    videoUrl: "https://youtu.be/x",
    options: [],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
  },
  {
    id: "tema",
    order: 2,
    type: "question",
    text: { pt: "Qual tema?", en: "Which topic?", es: null },
    image: null,
    videoUrl: null,
    options: [
      { id: "etica", text: { pt: "Ética", en: "Ethics", es: null }, image: null, promptInstruction: "foque em ética", nextStepId: "__end__", tipId: null },
      { id: "outro", text: { pt: "Outro", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null, tipId: null },
    ],
    nextStepId: null,
    partOfPrompt: true,
    promptInstruction: null,
    infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: true, tipId: null },
    ...DEFAULT_ANSWER_FIELDS,
  },
  {
    id: "fim",
    order: 3,
    type: "video",
    text: { pt: "Obrigado", en: null, es: null },
    image: null,
    videoUrl: "https://youtu.be/y",
    options: [],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
  },
];

describe("FlowSimulator", () => {
  const tipTexts = { consent: { pt: "Peça consentimento antes de usar fotos de pessoas.", en: null, es: null } };

  async function choose(user: ReturnType<typeof userEvent.setup>, label: string) {
    await user.click(screen.getByLabelText(label));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
  }

  it("walks the flow following option jumps and shows the prompt parts", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);

    expect(screen.getByText("Assista à introdução")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Qual tema?")).toBeInTheDocument();
    expect(screen.getByText("Dica: Isso é ético?")).toBeInTheDocument();
    await choose(user, "Ética");

    expect(screen.getByText("Fim do questionário.")).toBeInTheDocument();
    expect(screen.getByText(/Resposta: “Ética”/)).toBeInTheDocument();
    expect(screen.getByText(/foque em ética/)).toBeInTheDocument();
  });

  it("follows the order when the option has no jump, and restarts", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await choose(user, "Outro");
    expect(screen.getByText("Obrigado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Recomeçar" }));
    expect(screen.getByText("Assista à introdução")).toBeInTheDocument();
  });

  it("needs a choice before continuing a required question", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Pular" })).not.toBeInTheDocument();
  });

  it("switches language with fallback to Portuguese", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);
    await user.selectOptions(screen.getByLabelText("Idioma"), "en");
    expect(screen.getByText("Watch the intro")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText("Ethics")).toBeInTheDocument();
    expect(screen.getByLabelText("Outro")).toBeInTheDocument();
  });

  it("shows the selected option's tip, over the info flag tip", async () => {
    const user = userEvent.setup();
    const withTips: StepRecord[] = [
      {
        ...steps[1],
        infoFlag: null,
        options: [{ ...steps[1].options[0], tipId: "consent" }, steps[1].options[1]],
      },
    ];
    render(<FlowSimulator steps={withTips} tipTexts={tipTexts} />);
    expect(screen.queryByText(/consentimento/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Ética"));
    expect(screen.getByText("Peça consentimento antes de usar fotos de pessoas.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Outro"));
    expect(screen.queryByText(/consentimento/)).not.toBeInTheDocument();
  });

  it("multiple choice: checkboxes, the step's jump, answers in the step's order", async () => {
    const user = userEvent.setup();
    const multiple: StepRecord[] = [{ ...steps[1], answerType: "multiple_choice", infoFlag: null }, steps[2]];
    render(<FlowSimulator steps={multiple} />);
    expect(screen.getByLabelText("Ética")).toHaveAttribute("type", "checkbox");

    await user.click(screen.getByLabelText("Outro"));
    await user.click(screen.getByLabelText("Ética"));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    // Ética jumps to the end in single choice; in multiple choice the step's flow (order) wins.
    expect(screen.getByText("Obrigado")).toBeInTheDocument();
    expect(screen.getByText(/Resposta: “Ética, Outro”/)).toBeInTheDocument();
  });

  it("open text: limit counter, placeholder and the typed answer", async () => {
    const user = userEvent.setup();
    const open: StepRecord[] = [
      {
        ...steps[1],
        answerType: "open_text",
        options: [],
        infoFlag: null,
        maxLength: 20,
        placeholder: { pt: "Descreva a cena", en: null, es: null },
      },
    ];
    render(<FlowSimulator steps={open} />);
    const field = screen.getByPlaceholderText("Descreva a cena");
    expect(field).toHaveAttribute("maxLength", "20");
    await user.type(field, "Um gato astronauta");
    expect(screen.getByText("18/20")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/Resposta: “Um gato astronauta”/)).toBeInTheDocument();
  });

  it("optional questions can be skipped, following the step's jump", async () => {
    const user = userEvent.setup();
    const optional: StepRecord[] = [{ ...steps[1], required: false, infoFlag: null }, steps[2]];
    render(<FlowSimulator steps={optional} />);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Pular" }));
    expect(screen.getByText("Obrigado")).toBeInTheDocument();
  });

  it("reports a jump to a missing step instead of breaking", async () => {
    render(<FlowSimulator steps={[{ ...steps[0], nextStepId: "ghost" }]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Salto para um passo que não existe (ghost).")).toBeInTheDocument();
  });
});

describe("FlowMap", () => {
  it("lists every transition and confirms a valid flow", () => {
    render(<FlowMap steps={steps} issues={validateFlow(steps)} unreachable={unreachableSteps(steps)} />);
    expect(screen.getByRole("status")).toHaveTextContent("Fluxo válido");
    expect(screen.getByText("“Ética” → Fim")).toBeInTheDocument();
    expect(screen.getByText("“Outro” → #3 · Obrigado")).toBeInTheDocument();
  });

  it("shows Continuar for multiple choice and Pular for optional questions", () => {
    const flow: StepRecord[] = [{ ...steps[1], answerType: "multiple_choice", required: false }, steps[2]];
    render(<FlowMap steps={flow} issues={validateFlow(flow)} unreachable={unreachableSteps(flow)} />);
    expect(screen.getByText("Continuar → #3 · Obrigado")).toBeInTheDocument();
    expect(screen.getByText("Pular → #3 · Obrigado")).toBeInTheDocument();
    expect(screen.getByText(/Múltipla escolha · opcional/)).toBeInTheDocument();
  });

  it("shows cycles and unreachable steps", () => {
    const looping = [{ ...steps[0], nextStepId: "fim" }, steps[1], { ...steps[2], nextStepId: "intro" }];
    render(<FlowMap steps={looping} issues={validateFlow(looping)} unreachable={unreachableSteps(looping)} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Ciclo no fluxo: #1 → #3 → #1");
    expect(screen.getByText(/Nenhum caminho chega a: #2 · Qual tema\?/)).toBeInTheDocument();
  });
});
