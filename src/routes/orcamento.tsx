import { createFileRoute } from "@tanstack/react-router";
import { images } from "@/content/site";
import { PageHero } from "@/components/site/primitives";
import { QuoteForm } from "@/components/site/QuoteForm";
import { ContactInfo } from "./contato";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/orcamento")({
  validateSearch: (s: Record<string, unknown>): { servico?: string } => (typeof s.servico === "string" ? { servico: s.servico } : {}),
  head: () => ({ meta: pageMeta("Solicitar orçamento", "Solicite um orçamento à Rodrinox Pro para corte a laser, dobra, soldagem e fabricação de componentes metálicos.") }),
  component: Orcamento,
});

function Orcamento() {
  const { servico } = Route.useSearch();
  return (
    <>
      <PageHero eyebrow="Orçamento" title="Solicite um orçamento." text="Preencha os dados e nossa equipe receberá sua solicitação pelo WhatsApp. Sem cadastro, sem complicação." image={images.dobra} />
      <section className="py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_2fr]">
          <ContactInfo />
          <QuoteForm defaultService={servico ?? ""} />
        </div>
      </section>
    </>
  );
}
