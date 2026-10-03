import { describe, expect, it } from "vitest";

import { describeCycle, findCycle, resolveNext, stepsAfterDelete, transitionsOf, unreachableSteps, validateFlow } from "./flow";
import type { StepRecord } from "./steps";
import { DEFAULT_ANSWER_FIELDS } from "./schemas";

function video(id: string, order: number, nextStepId: string | null = null): StepRecord {
  return {
    id,
    order,
    type: "video",
    text: { pt: id, en: null, es: null },
    image: null,
    videoUrl: "https://youtu.be/x",
    options: [],
    nextStepId,
    partOfPrompt: false,
    promptInstruction: null,
    infoFlag: null,
    ...DEFAULT_ANSWER_FIELDS,
  };
}

function question(id: string, order: number, jumps: Array<string | null>, nextStepId: string | null = null): StepRecord {
  return {
    ...video(id, order, nextStepId),
    type: "question",
    videoUrl: null,
    options: jumps.map((jump, index) => ({
      id: `${id}-o${index + 1}`,
      text: { pt: `opção ${index + 1}`, en: null, es: null },
      image: null,
      promptInstruction: null,
      nextStepId: jump,
      tipId: null,
    })),
  };
}

describe("resolveNext", () => {
  const steps = [video("a", 1), question("b", 2, [null, "d"], "__end__"), video("c", 3), video("d", 4)];

  it("follows the order when there is no jump, and ends after the last step", () => {
    expect(resolveNext(steps[0], null, steps)).toBe("b");
    expect(resolveNext(steps[3], null, steps)).toBeNull();
  });

  it("prefers the option jump, then the step jump", () => {
    expect(resolveNext(steps[1], steps[1].options[1], steps)).toBe("d");
    expect(resolveNext(steps[1], steps[1].options[0], steps)).toBeNull(); // step jump: __end__
  });

  it("treats __end__ as the end", () => {
    expect(resolveNext(video("x", 1, "__end__"), null, [video("x", 1, "__end__"), video("y", 2)])).toBeNull();
  });
});

describe("transitionsOf", () => {
  it("has one transition per option in questions, and one in videos", () => {
    const steps = [question("q", 1, ["v", null]), video("v", 2)];
    expect(transitionsOf(steps[0], steps)).toEqual([
      { via: "option", optionId: "q-o1", target: "v" },
      { via: "option", optionId: "q-o2", target: "v" },
    ]);
    expect(transitionsOf(steps[1], steps)).toEqual([{ via: "continue", optionId: null, target: null }]);
  });
});

describe("validateFlow", () => {
  it("accepts a linear flow and a branching flow without cycles", () => {
    expect(validateFlow([video("a", 1), video("b", 2)])).toEqual([]);
    expect(validateFlow([question("a", 1, ["c", null]), video("b", 2, "__end__"), video("c", 3)])).toEqual([]);
  });

  it("reports jumps to missing steps, from the step and from options", () => {
    expect(validateFlow([question("a", 1, ["ghost"], "phantom")])).toEqual([
      { kind: "missing-target", stepId: "a", optionId: null, target: "phantom" },
      { kind: "missing-target", stepId: "a", optionId: "a-o1", target: "ghost" },
    ]);
  });

  it("reports a cycle even if another option could leave it", () => {
    // b's first option goes back to a: the user could loop forever.
    const issues = validateFlow([video("a", 1), question("b", 2, ["a", "__end__"])]);
    expect(issues).toEqual([{ kind: "cycle", path: ["a", "b", "a"] }]);
  });

  it("reports a self jump as a cycle", () => {
    expect(findCycle([video("a", 1, "a")])).toEqual(["a", "a"]);
  });

  it("detects a cycle created only by the order", () => {
    // c jumps back to a; a and b just follow the order.
    expect(findCycle([video("a", 1), video("b", 2), video("c", 3, "a")])).toEqual(["a", "b", "c", "a"]);
  });

  it("accepts an empty questionnaire", () => {
    expect(validateFlow([])).toEqual([]);
  });
});

describe("unreachableSteps", () => {
  it("lists steps no path reaches", () => {
    expect(unreachableSteps([video("a", 1, "c"), video("b", 2), video("c", 3)])).toEqual(["b"]);
    expect(unreachableSteps([video("a", 1), video("b", 2)])).toEqual([]);
  });
});

describe("stepsAfterDelete", () => {
  it("removes the step and resets jumps to it", () => {
    const after = stepsAfterDelete("b", [video("a", 1, "b"), video("b", 2), question("c", 3, ["b"])]);
    expect(after.map((step) => step.id)).toEqual(["a", "c"]);
    expect(after[0].nextStepId).toBeNull();
    expect(after[1].options[0].nextStepId).toBeNull();
  });
});

describe("describeCycle", () => {
  it("uses the order numbers the admin sees", () => {
    expect(describeCycle(["a", "c", "a"], [video("a", 1), video("c", 7)])).toBe("#1 → #7 → #1");
  });
});
