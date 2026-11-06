import { describe, expect, it } from "vitest";
import { buildQuoteMessage, whatsappUrl } from "@/lib/whatsapp";
import { company } from "@/content/site";

describe("orçamento via WhatsApp", () => {
  it("envia para o WhatsApp (11) 96598-8004", () => {
    expect(whatsappUrl(company.whatsappNumber)).toBe("https://wa.me/5511965988004");
  });
  it("inclui os dados do formulário na mensagem", () => {
    const msg = buildQuoteMessage({ name: "Ana", phone: "11 9999", service: "Soldagem TIG", message: "Peças" });
    expect(msg).toContain("Nome: Ana");
    expect(msg).toContain("Serviço: Soldagem TIG");
    expect(msg).not.toContain("Empresa:");
  });
});
