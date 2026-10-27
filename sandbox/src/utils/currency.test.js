import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency.js";

describe("formatCurrency", () => {
  it("formats USD with two decimals", () => {
    expect(formatCurrency(1250)).toBe("$1,250.00");
  });
});
