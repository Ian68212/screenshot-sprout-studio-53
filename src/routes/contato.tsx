import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { company, images } from "@/content/site";
import { PageHero, SectionTitle } from "@/components/site/primitives";
import { QuoteForm } from "@/components/site/QuoteForm";
import { whatsappUrl } from "@/lib/whatsapp";
import { pageMeta } from "@/lib/seo";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/contato")({
  head: () => ({ meta: pageMeta("Contato e localização", "Fale com a Rodrinox Pro por telefone, e-mail ou WhatsApp. Atendimento para projetos industriais e fabricação metálica.") }),
  component: Contato,
});

function ContactInfo() {
  const cms = usePublicSite();
  const p = cms.content("contato.dados", {});
  const email = String(p.email ?? company.email);
  const phone = String(p.telefone ?? company.phone);
  const phoneHref = String(p.telefone_link ?? company.phoneHref);
  const whatsapp = String(p.whatsapp ?? company.whatsapp);
  const whatsappNumber = String(p.whatsapp_numero ?? company.whatsappNumber);
  const address = String(p.endereco ?? company.address);
  const hours = String(p.horario ?? company.hours);
  const items = [
    {icon:Mail,label:"E-mail",value:email,href:`mailto:${email}`},
    {icon:Phone,label:"Telefone",value:phone,href:phoneHref},
    {icon:MessageCircle,label:"WhatsApp",value:whatsapp,href:whatsappUrl(whatsappNumber)},
    {icon:MapPin,label:"Endereço",value:address},
    {icon:Clock,label:"Horário",value:hours},
  ];
  return <div><SectionTitle eyebrow="Fale com a gente" title="Atendimento" /><ul className="mt-10 space-y-6">{items.map(({icon:Icon,label,value,href})=><li key={label} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary text-accent"><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>{href?<a href={href} target={href.startsWith("http")?"_blank":undefined} rel="noreferrer" className="whitespace-pre-line font-medium text-primary hover:text-accent">{value}</a>:<p className="whitespace-pre-line font-medium text-primary">{value}</p>}</div></li>)}</ul></div>;
}

function Contato() {
  const cms = usePublicSite();
  const p = cms.content("contato.dados", {});
  return <>
    <PageHero eyebrow={String(p.hero_chamada??"Contato")} title={String(p.hero_titulo??"Vamos conversar sobre o seu projeto?")} image={mediaUrl(p.hero_imagem_id,images.fabrica)} />
    <section className="py-20"><div className="container-site grid gap-12 lg:grid-cols-[1fr_2fr]"><ContactInfo /><QuoteForm /></div></section>
    <section className="bg-secondary"><div className="container-site flex h-80 flex-col items-center justify-center text-center"><MapPin className="h-8 w-8 text-accent" /><p className="mt-3 font-display text-xl font-bold text-primary">Mapa de localização</p>{p.mapa_url?<a href={String(p.mapa_url)} target="_blank" rel="noreferrer" className="mt-2 text-sm text-primary underline">Abrir localização no Google Maps</a>:<p className="mt-1 text-sm text-muted-foreground">Endereço da Rodrinox Pro</p>}</div></section>
  </>;
}
