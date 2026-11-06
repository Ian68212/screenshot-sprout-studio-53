import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { company, images } from "@/content/site";
import { PageHero, SectionTitle } from "@/components/site/primitives";
import { QuoteForm } from "@/components/site/QuoteForm";
import { whatsappUrl } from "@/lib/whatsapp";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: pageMeta("Contato e localização", "Fale com a Rodrinox Pro por telefone, e-mail ou WhatsApp. Atendimento para projetos industriais e fabricação metálica.") }),
  component: Contato,
});

export function ContactInfo() {
  const items = [
    { icon: Mail, label: "E-mail", value: company.email, href: `mailto:${company.email}` },
    { icon: Phone, label: "Telefone", value: company.phone, href: company.phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: company.whatsapp, href: whatsappUrl(company.whatsappNumber) },
    { icon: MapPin, label: "Endereço", value: company.address },
    { icon: Clock, label: "Horário", value: company.hours },
  ];
  return (
    <div>
      <SectionTitle eyebrow="Fale com a gente" title="Atendimento" />
      <ul className="mt-10 space-y-6">
        {items.map(({ icon: Icon, label, value, href }) => (
          <li key={label} className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary text-accent"><Icon className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="font-medium text-primary hover:text-accent">{value}</a> : <p className="font-medium text-primary">{value}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Contato() {
  return (
    <>
      <PageHero eyebrow="Contato" title="Vamos conversar sobre o seu projeto?" image={images.fabrica} />
      <section className="py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_2fr]">
          <ContactInfo />
          <QuoteForm />
        </div>
      </section>
      <section className="bg-secondary">
        <div className="container-site flex h-80 flex-col items-center justify-center text-center">
          <MapPin className="h-8 w-8 text-accent" />
          <p className="mt-3 font-display text-xl font-bold text-primary">Mapa de localização</p>
          <p className="mt-1 text-sm text-muted-foreground">[Informe o endereço para exibirmos o mapa]</p>
        </div>
      </section>
    </>
  );
}
