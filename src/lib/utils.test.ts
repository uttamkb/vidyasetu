import { cn } from "./utils";

describe("cn utility", () => {
  it("returns a merged class string", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("preserves repeated class names when duplicates are passed explicitly", () => {
    expect(cn("foo", "foo", "bar")).toBe("foo foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });
});
