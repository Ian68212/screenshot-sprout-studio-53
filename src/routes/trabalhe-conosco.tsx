import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BriefcaseBusiness, CheckCircle2, FileUp, Send } from "lucide-react";
import { images } from "@/content/site";
import { PageHero, btn } from "@/components/site/primitives";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const field = "w-full rounded-sm border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-ring/30";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary";
const API = "https://portal.rodrinoxpro.com.br/colaborador/api/candidaturas";

export const Route = createFileRoute("/trabalhe-conosco")({
  head: () => ({ meta: pageMeta("Trabalhe Conosco", "Conheça oportunidades e envie seu currículo para fazer parte da equipe Rodrinox Pro.") }),
  component: TrabalheConosco,
});

function TrabalheConosco() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("curriculo");
    if (!(file instanceof File) || !file.size) {
      setMessage("Anexe seu currículo em PDF, DOC ou DOCX.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("O arquivo deve ter no máximo 5 MB.");
      return;
    }
    if (!data.get("consent")) {
      setMessage("Confirme a autorização para o tratamento dos seus dados.");
      return;
    }
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(API, { method: "POST", headers: { "X-Portal": "1" }, body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.erro || "Não foi possível enviar seu currículo.");
      form.reset();
      setSuccess(true);
      setMessage("Currículo recebido! A equipe de Recursos Humanos poderá analisar sua candidatura.");
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHero eyebrow="Faça parte da equipe" title="Construa seu próximo capítulo com a Rodrinox Pro." text="Estamos sempre atentos a profissionais que valorizam qualidade, compromisso e vontade de crescer." image={images.fabrica} />
      <section className="py-20 md:py-28">
        <div className="container-site grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="inline-flex h-12 w-12 items-center justify-center bg-primary text-accent"><BriefcaseBusiness className="h-6 w-6" /></span>
            <h2 className="mt-6 text-3xl font-bold text-primary">Oportunidades começam com uma boa conversa.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">Envie seus dados e seu currículo. Nosso time poderá consultar sua candidatura quando houver oportunidades compatíveis com seu perfil.</p>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-accent" /> Cadastro simples e rápido</li>
              <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-accent" /> Currículo em PDF, DOC ou DOCX</li>
              <li className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-accent" /> Dados acessíveis somente à equipe autorizada</li>
            </ul>
          </div>
          <form onSubmit={submit} className="grid gap-5 rounded-sm border bg-card p-6 shadow-card md:grid-cols-2 md:p-10">
            <div><label className={label} htmlFor="candidate-name">Nome completo *</label><input id="candidate-name" name="nome" className={field} required maxLength={150} /></div>
            <div><label className={label} htmlFor="candidate-email">E-mail *</label><input id="candidate-email" name="email" type="email" className={field} required maxLength={180} /></div>
            <div><label className={label} htmlFor="candidate-phone">Telefone / WhatsApp *</label><input id="candidate-phone" name="telefone" type="tel" className={field} required maxLength={30} /></div>
            <div><label className={label} htmlFor="candidate-area">Área de interesse *</label><select id="candidate-area" name="area" className={field} required defaultValue=""><option value="" disabled>Selecione</option><option>Produção</option><option>Soldagem</option><option>Caldeiraria</option><option>Montagem</option><option>PCP</option><option>Compras</option><option>Administrativo</option><option>Recursos Humanos</option><option>Outra área</option></select></div>
            <div className="md:col-span-2"><label className={label} htmlFor="candidate-role">Cargo pretendido</label><input id="candidate-role" name="cargo_pretendido" className={field} maxLength={120} placeholder="Ex.: Soldador, auxiliar de produção..." /></div>
            <div className="md:col-span-2"><label className={label} htmlFor="candidate-cv">Anexar currículo * (PDF, DOC ou DOCX — até 5 MB)</label><input id="candidate-cv" name="curriculo" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required className={cn(field, "file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground")} /></div>
            <label className="flex items-start gap-3 text-sm text-muted-foreground md:col-span-2"><input type="checkbox" name="consent" required className="mt-1 accent-accent" /> Autorizo a Rodrinox Pro a utilizar meus dados e currículo para processos de recrutamento e seleção, conforme sua política de privacidade.</label>
            {message && <p role="status" className={cn("text-sm font-medium md:col-span-2", success ? "text-green-700" : "text-destructive")}>{message}</p>}
            <div className="md:col-span-2"><button type="submit" disabled={sending} className={cn(btn.base, btn.accent, "disabled:cursor-wait disabled:opacity-60")}><FileUp className="h-4 w-4" />{sending ? "Enviando currículo..." : "Enviar currículo"}<Send className="h-4 w-4" /></button><p className="mt-3 text-xs text-muted-foreground">Seus dados serão utilizados exclusivamente para finalidades relacionadas ao recrutamento.</p></div>
          </form>
        </div>
      </section>
    </>
  );
}
