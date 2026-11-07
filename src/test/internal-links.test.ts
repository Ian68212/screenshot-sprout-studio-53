import { describe, expect, it } from "vitest";
import { nav } from "@/content/site";

describe("Official site internal navigation", () => {
  it("keeps all navigation links on rodrinoxpro.com.br without tracking parameters", () => {
    for (const item of nav) {
      const url = new URL(item.to, "https://rodrinoxpro.com.br");
      expect(url.origin).toBe("https://rodrinoxpro.com.br");
      expect(url.search).toBe("");
    }
  });
});