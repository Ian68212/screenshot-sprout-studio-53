import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { company, services } from "@/content/site";
import { buildQuoteMessage, whatsappUrl } from "@/lib/whatsapp";
import { btn } from "./primitives";
import { cn } from "@/lib/utils";

const field = "w-full rounded-sm border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-ring/30";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary";

export function QuoteForm({ defaultService = "" }: { defaultService?: string }) {
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (!get("name") || !get("phone") || !get("message")) {
      setError("Preencha nome, telefone e a descrição da sua necessidade.");
      return;
    }
    if (!f.get("consent")) {
      setError("Confirme que concorda em enviar seus dados.");
      return;
    }
    setError("");
    const text = buildQuoteMessage({
      name: get("name"), company: get("company"), phone: get("phone"),
      email: get("email"), service: get("service"), message: get("message"),
    });
    window.open(whatsappUrl(company.whatsappNumber, text), "_blank", "noopener");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 rounded-sm border bg-card p-6 shadow-card md:grid-cols-2 md:p-10" noValidate>
      <div><label className={label} htmlFor="q-name">Seu nome *</label><input id="q-name" name="name" className={field} maxLength={100} /></div>
      <div><label className={label} htmlFor="q-company">Empresa</label><input id="q-company" name="company" className={field} maxLength={100} /></div>
      <div><label className={label} htmlFor="q-phone">Telefone / WhatsApp *</label><input id="q-phone" name="phone" type="tel" className={field} maxLength={30} /></div>
      <div><label className={label} htmlFor="q-email">E-mail</label><input id="q-email" name="email" type="email" className={field} maxLength={150} /></div>
      <div className="md:col-span-2">
        <label className={label} htmlFor="q-service">Serviço de interesse</label>
        <select id="q-service" name="service" defaultValue={defaultService} className={field}>
          <option value="">Selecione um serviço</option>
          {services.map((s) => <option key={s.slug} value={s.title}>{s.title}</option>)}
          <option value="Outro">Outro</option>
        </select>
      </div>
      <div className="md:col-span-2"><label className={label} htmlFor="q-msg">Como podemos ajudar? *</label><textarea id="q-msg" name="message" rows={5} className={field} maxLength={1500} placeholder="Descreva a peça, material, quantidade e prazos desejados." /></div>
      <label className="flex items-start gap-3 text-sm text-muted-foreground md:col-span-2">
        <input type="checkbox" name="consent" className="mt-1 accent-accent" />
        Concordo em enviar meus dados de contato à Rodrinox Pro para atendimento desta solicitação.
      </label>
      {error && <p role="alert" className="text-sm font-medium text-destructive md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <button type="submit" className={cn(btn.base, btn.accent)}><Send className="h-4 w-4" />Enviar solicitação pelo WhatsApp</button>
        <p className="mt-3 text-xs text-muted-foreground">O WhatsApp abrirá com a mensagem preenchida. Basta confirmar o envio.</p>
      </div>
    </form>
  );
}
