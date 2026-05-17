import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Home page", () => {
  it("renders the hero heading and navigation links", async () => {
    const { default: Home } = await import("./page");

    render(<Home />);

    expect(screen.getByText(/Score Better/i)).toBeInTheDocument();
    expect(screen.getByText(/Precision AI/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /login/i })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /get started/i })).toHaveLength(3);
  });
});
