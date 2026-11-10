import { createFileRoute, Link } from "@tanstack/react-router";
import { images } from "@/content/site";
import { PageHero, Reveal, SectionTitle, btn } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: pageMeta("Projetos especiais", "Projetos industriais personalizados da Rodrinox Pro: cilindros, estruturas e componentes metálicos desenvolvidos sob medida.") }),
  component: Projetos,
});

const defaults = [
  {slug:"cilindros-industriais",title:"Cilindros industriais",area:"Cilindros",description:"Desenvolvimento e fabricação conforme a aplicação.",image:images.cilindros},
  {slug:"componentes-metalicos",title:"Componentes metálicos",area:"Componentes metálicos",description:"Peças fabricadas conforme desenho e necessidade.",image:images.componentes},
  {slug:"projeto-personalizado",title:"Projeto personalizado",area:"Projeto personalizado",description:"Soluções industriais desenvolvidas sob medida.",image:images.projetos},
];

function Projetos() {
  const cms = usePublicSite();
  const p = cms.content("projetos.pagina", {});
  const saved = cms.items("projeto");
  const cases = saved.length ? saved.map(x=>({title:x.titulo,area:x.resumo||"Projeto especial",description:x.descricao||"",image:mediaUrl(x.imagem_id,defaults.find(d=>d.slug===x.slug)?.image ?? images.projetos)})) : defaults;
  return <>
    <PageHero eyebrow={String(p.hero_chamada??"Projetos especiais")} title={String(p.hero_titulo??"Soluções sob medida para cada desafio.")} image={mediaUrl(p.hero_imagem_id,images.projetos)} />
    <section className="py-24"><div className="container-site">
      <SectionTitle eyebrow="Casos" title={String(p.heading??"Projetos desenvolvidos")} text={String(p.descricao??"Cada projeto começa pelo entendimento da necessidade do cliente e termina com uma entrega acompanhada de perto.")} />
      <div className="mt-14 grid gap-8 md:grid-cols-3">{cases.map((x,n)=><Reveal key={n} delay={n*100} className="group"><div className="overflow-hidden"><img src={x.image} alt={x.area} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" /></div><p className="eyebrow mt-5">{x.area}</p><h3 className="mt-2 text-xl font-bold text-primary">{x.title}</h3><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{x.description}</p></Reveal>)}</div>
      <div className="mt-16 text-center"><Link to="/orcamento" search={{servico:"Projetos industriais personalizados"}} className={cn(btn.base,btn.accent)}>Tenho um projeto especial</Link></div>
    </div></section><CtaBand />
  </>;
}
