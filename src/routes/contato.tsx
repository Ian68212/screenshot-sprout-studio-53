import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { company, images } from "@/content/site";
import { PageHero, SectionTitle } from "@/components/site/primitives";
import { QuoteForm } from "@/components/site/QuoteForm";
import { whatsappUrl } from "@/lib/whatsapp";
import { pageMeta } from "@/lib/seo";
import { useSiteCms } from "@/lib/site-cms";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: pageMeta("Contato e localização", "Fale com a Rodrinox Pro por telefone, e-mail ou WhatsApp. Atendimento para projetos industriais e fabricação metálica.") }),
  component: Contato,
});

export function ContactInfo() {
  const cms = useSiteCms();
  const custom = cms.dados("contato.dados");
  const email = custom.email || company.email;
  const phone = custom.telefone || company.phone;
  const phoneHref = custom.telefone_link || company.phoneHref;
  const whatsapp = custom.whatsapp || company.whatsapp;
  const whatsappNumber = custom.whatsapp_numero || company.whatsappNumber;
  const items = [
    { icon: Mail, label: "E-mail", value: email, href: `mailto:${email}` },
    { icon: Phone, label: "Telefone", value: phone, href: phoneHref },
    { icon: MessageCircle, label: "WhatsApp", value: whatsapp, href: whatsappUrl(whatsappNumber) },
    { icon: MapPin, label: "Endereço", value: custom.endereco || company.address },
    { icon: Clock, label: "Horário", value: custom.horario || company.hours },
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
  const cms = useSiteCms();
  const custom = cms.dados("contato.dados");
  const mapUrl = custom.mapa_url && /^https:\/\//i.test(custom.mapa_url) ? custom.mapa_url : "";
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
          {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 text-sm text-primary underline">Abrir localização no mapa</a> : <p className="mt-1 text-sm text-muted-foreground">Localização disponível mediante configuração no painel administrativo.</p>}
        </div>
      </section>
    </>
  );
}
