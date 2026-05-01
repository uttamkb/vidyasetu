import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("Home page", () => {
  it("renders the hero heading and navigation links", async () => {
    const { default: Home } = await import("./page");

    render(<Home />);

    expect(screen.getByText(/Your Learning Journey Starts Here/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /login/i })).toHaveLength(2);
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toBeInTheDocument();
  });
});
