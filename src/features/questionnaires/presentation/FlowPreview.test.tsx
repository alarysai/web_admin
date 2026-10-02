// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { unreachableSteps, validateFlow } from "../domain/flow";
import type { StepRecord } from "../domain/steps";
import { FlowMap } from "./FlowMap";
import { FlowSimulator } from "./FlowSimulator";

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
  },
  {
    id: "tema",
    order: 2,
    type: "question",
    text: { pt: "Qual tema?", en: "Which topic?", es: null },
    image: null,
    videoUrl: null,
    options: [
      { id: "etica", text: { pt: "Ética", en: "Ethics", es: null }, image: null, promptInstruction: "foque em ética", nextStepId: "__end__" },
      { id: "outro", text: { pt: "Outro", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null },
    ],
    nextStepId: null,
    partOfPrompt: true,
    promptInstruction: null,
    infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: true, tipId: null },
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
  },
];

describe("FlowSimulator", () => {
  it("walks the flow following option jumps and shows the prompt parts", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);

    expect(screen.getByText("Assista à introdução")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Qual tema?")).toBeInTheDocument();
    expect(screen.getByText("Isso é ético? Sim")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ética" }));

    expect(screen.getByText("Fim do questionário.")).toBeInTheDocument();
    expect(screen.getByText(/Resposta: “Ética”/)).toBeInTheDocument();
    expect(screen.getByText(/foque em ética/)).toBeInTheDocument();
  });

  it("follows the order when the option has no jump, and restarts", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Outro" }));
    expect(screen.getByText("Obrigado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Recomeçar" }));
    expect(screen.getByText("Assista à introdução")).toBeInTheDocument();
  });

  it("switches language with fallback to Portuguese", async () => {
    const user = userEvent.setup();
    render(<FlowSimulator steps={steps} />);
    await user.selectOptions(screen.getByLabelText("Idioma"), "en");
    expect(screen.getByText("Watch the intro")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("button", { name: "Ethics" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outro" })).toBeInTheDocument();
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

  it("shows cycles and unreachable steps", () => {
    const looping = [{ ...steps[0], nextStepId: "fim" }, steps[1], { ...steps[2], nextStepId: "intro" }];
    render(<FlowMap steps={looping} issues={validateFlow(looping)} unreachable={unreachableSteps(looping)} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Ciclo no fluxo: #1 → #3 → #1");
    expect(screen.getByText(/Nenhum caminho chega a: #2 · Qual tema\?/)).toBeInTheDocument();
  });
});
