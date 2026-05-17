import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocationAutocomplete } from "./location-autocomplete";

// Mock fetch
global.fetch = vi.fn();

describe("LocationAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with placeholder and value", () => {
    render(
      <LocationAutocomplete
        id="test"
        type="district"
        value="Patna"
        onChange={() => {}}
        placeholder="Search district"
      />
    );
    expect(screen.getByPlaceholderText("Search district")).toHaveValue("Patna");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(
      <LocationAutocomplete
        id="test"
        type="district"
        value=""
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bhu" } });
    expect(onChange).toHaveBeenCalledWith("Bhu");
  });

  it("fetches suggestions after debouncing", async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ suggestions: ["Bhubaneswar", "Bhuj"] }),
    });

    const onChange = vi.fn();
    render(
      <LocationAutocomplete
        id="test"
        type="district"
        value="Bhu"
        onChange={onChange}
      />
    );

    fireEvent.focus(screen.getByRole("textbox"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("query=Bhu"));
    }, { timeout: 1000 });

    expect(await screen.findByText("Bhubaneswar")).toBeInTheDocument();
    expect(screen.getByText("Bhuj")).toBeInTheDocument();
  });

  it("selects a suggestion on click", async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ suggestions: ["Bhubaneswar"] }),
    });

    const onChange = vi.fn();
    render(
      <LocationAutocomplete
        id="test"
        type="district"
        value="Bhu"
        onChange={onChange}
      />
    );

    fireEvent.focus(screen.getByRole("textbox"));
    
    const suggestion = await screen.findByText("Bhubaneswar");
    fireEvent.click(suggestion);

    expect(onChange).toHaveBeenCalledWith("Bhubaneswar");
  });
});
