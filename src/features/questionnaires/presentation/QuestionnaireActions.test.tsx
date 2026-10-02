// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LifecycleResult } from "../server/questionnaire-lifecycle";
import { QuestionnaireActions } from "./QuestionnaireActions";

afterEach(cleanup);

const ok = (message: string, warnings: string[] = []): LifecycleResult => ({ ok: true, message, warnings });

function renderActions(props: Partial<Parameters<typeof QuestionnaireActions>[0]> = {}) {
  const actions = {
    publish: vi.fn().mockResolvedValue(ok("Questionário publicado: já aparece nos apps.")),
    unpublish: vi.fn().mockResolvedValue(ok("Questionário despublicado.")),
    duplicate: vi.fn().mockResolvedValue(ok("")),
    remove: vi.fn().mockResolvedValue(ok("Questionário excluído.")),
  };
  render(<QuestionnaireActions status="draft" title="Ética" confirm={() => true} {...actions} {...props} />);
  return actions;
}

describe("QuestionnaireActions", () => {
  it("publishes a draft and shows the warnings", async () => {
    const publish = vi.fn().mockResolvedValue(ok("Questionário publicado: já aparece nos apps.", ["A categoria está inativa."]));
    renderActions({ publish });
    await userEvent.setup().click(screen.getByRole("button", { name: "Publicar" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Questionário publicado");
    expect(status).toHaveTextContent("A categoria está inativa.");
  });

  it("lists what blocks publishing", async () => {
    const publish = vi.fn().mockResolvedValue({ ok: false, message: "Ainda não dá para publicar:", problems: ["Adicione ao menos um passo."] });
    renderActions({ publish });
    await userEvent.setup().click(screen.getByRole("button", { name: "Publicar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Adicione ao menos um passo.");
  });

  it("asks before unpublishing and does nothing when cancelled", async () => {
    const confirm = vi.fn(() => false);
    const actions = renderActions({ status: "published", confirm });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Despublicar" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("sai dos apps"));
    expect(actions.unpublish).not.toHaveBeenCalled();
  });

  it("disables delete while published", () => {
    renderActions({ status: "published" });
    expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
    expect(screen.getByText("Para excluir, despublique primeiro.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publicar" })).not.toBeInTheDocument();
  });

  it("deletes a draft after confirming", async () => {
    const confirm = vi.fn(() => true);
    const actions = renderActions({ confirm });
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Não dá para desfazer"));
    expect(actions.remove).toHaveBeenCalledOnce();
  });

  it("duplicates without asking", async () => {
    const confirm = vi.fn(() => true);
    const actions = renderActions({ confirm });
    await userEvent.setup().click(screen.getByRole("button", { name: "Duplicar" }));
    expect(actions.duplicate).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });
});
