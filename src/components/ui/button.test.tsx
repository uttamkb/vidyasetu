import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button component", () => {
  it("renders button children", () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("accepts variant and custom className", () => {
    render(
      <Button variant="destructive" className="custom-class">
        Delete
      </Button>
    );

    const button = screen.getByRole("button", { name: /delete/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("custom-class");
  });
});
