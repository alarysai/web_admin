// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeleteStepButton } from "./DeleteStepButton";

afterEach(cleanup);

describe("DeleteStepButton", () => {
  it("does nothing when the admin cancels", async () => {
    const deleteStep = vi.fn();
    render(<DeleteStepButton stepLabel="Qual tema?" deleteStep={deleteStep} confirm={() => false} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir" }));
    expect(deleteStep).not.toHaveBeenCalled();
  });

  it("asks with the step text and deletes after confirming", async () => {
    const confirm = vi.fn(() => true);
    const deleteStep = vi.fn().mockResolvedValue({ ok: true });
    render(<DeleteStepButton stepLabel="Qual tema?" deleteStep={deleteStep} confirm={confirm} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('"Qual tema?"'));
    expect(deleteStep).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error when deleting fails", async () => {
    const deleteStep = vi.fn().mockResolvedValue({ ok: false, message: "Este passo já tinha sido excluído." });
    render(<DeleteStepButton stepLabel="x" deleteStep={deleteStep} confirm={() => true} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Este passo já tinha sido excluído.");
  });
});
