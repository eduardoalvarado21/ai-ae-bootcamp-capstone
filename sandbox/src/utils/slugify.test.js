import { describe, expect, it } from "vitest";
import { slugify } from "./slugify.js";

describe("slugify", () => {
  it("creates a url-safe slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});
