import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MathRenderer } from "./math-renderer";
import katex from "katex";

// Mock KaTeX to prevent canvas/DOM errors in test environments
vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn((math, options) => {
      return `<span class="mocked-katex" data-display="${!!options?.displayMode}">${math}</span>`;
    })
  }
}));

describe("MathRenderer Delimiter Parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully parse and render inline single dollar math ($)", () => {
    const { container } = render(<React.Suspense><MathRenderer content="Solve for $x^2 + y^2 = r^2$ in the equation." /></React.Suspense>);
    expect(katex.renderToString).toHaveBeenCalledWith("x^2 + y^2 = r^2", expect.objectContaining({ displayMode: false }));
    expect(container.innerHTML).toContain("Solve for");
    expect(container.innerHTML).toContain("in the equation.");
  });

  it("should successfully parse and render block double dollar math ($$)", () => {
    render(<React.Suspense><MathRenderer content="$$e^{i\pi} + 1 = 0$$" /></React.Suspense>);
    expect(katex.renderToString).toHaveBeenCalledWith("e^{i\\pi} + 1 = 0", expect.objectContaining({ displayMode: true }));
  });

  it("should successfully parse standard LaTeX inline math (\\( ... \\))", () => {
    render(<React.Suspense><MathRenderer content="Evaluate \\(\\sin(\\theta)\\)" /></React.Suspense>);
    expect(katex.renderToString).toHaveBeenCalledWith("\\\\sin(\\\\theta)\\", expect.objectContaining({ displayMode: false }));
  });

  it("should successfully parse standard LaTeX block math (\\[ ... \\])", () => {
    render(<React.Suspense><MathRenderer content="\\[\\int_a^b f(x) dx\\]" /></React.Suspense>);
    expect(katex.renderToString).toHaveBeenCalledWith("\\\\int_a^b f(x) dx\\", expect.objectContaining({ displayMode: true }));
  });
});
