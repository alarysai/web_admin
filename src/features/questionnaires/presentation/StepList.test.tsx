// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StepRecord } from "../domain/steps";
import { StepList } from "./StepList";

afterEach(cleanup);

const steps: StepRecord[] = [
  {
    id: "s1",
    order: 1,
    type: "video",
    text: { pt: "Assista à introdução", en: null, es: null },
    image: null,
    videoUrl: "https://youtu.be/abc",
    options: [],
    nextStepId: null,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
  },
  {
    id: "s2",
    order: 2,
    type: "question",
    text: { pt: "Qual tema?", en: null, es: null },
    image: null,
    videoUrl: null,
    options: [
      { id: "a", text: { pt: "A", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null },
      { id: "b", text: { pt: "B", en: null, es: null }, image: null, promptInstruction: null, nextStepId: null },
    ],
    nextStepId: null,
    partOfPrompt: true,
    promptInstruction: null,
    infoFlag: { label: { pt: "Isso é ético?", en: null, es: null }, value: true, tipId: null },
  },
];

describe("StepList", () => {
  it("lists steps in order with type, options and markers", () => {
    render(<StepList questionnaireId="q1" steps={steps} deleteAction={() => vi.fn()} />);
    const [video, question] = screen.getAllByRole("listitem");

    expect(within(video).getByText("Vídeo")).toBeInTheDocument();
    expect(within(video).getByText("Assista à introdução")).toBeInTheDocument();
    expect(within(video).queryByText(/opção/)).not.toBeInTheDocument();

    expect(within(question).getByText("2 opção(ões)")).toBeInTheDocument();
    expect(within(question).getByText("Entra no prompt")).toBeInTheDocument();
    expect(within(question).getByText("Informação booleana")).toBeInTheDocument();
    expect(within(question).getByRole("link", { name: "Editar" })).toHaveAttribute("href", "/questionarios/q1/passos/s2");
  });

  it("invites to create the first step", () => {
    render(<StepList questionnaireId="q1" steps={[]} deleteAction={() => vi.fn()} />);
    expect(screen.getByRole("link", { name: "Criar o primeiro passo" })).toHaveAttribute("href", "/questionarios/q1/passos/novo");
  });
});
