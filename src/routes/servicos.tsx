import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { images, services as defaults } from "@/content/site";
import { PageHero, Reveal, btn } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/servicos")({
  head: () => ({ meta: pageMeta("Serviços e soluções industriais", "Corte a laser, dobra de chapas, soldagem a laser, TIG e especiais, cilindros, projetos personalizados e componentes metálicos.") }),
  component: Servicos,
});

function Servicos() {
  const cms = usePublicSite();
  const p = cms.content("servicos.pagina", {});
  const saved = cms.items("servico");
  const list = saved.length ? saved.map(s=>({slug:s.slug,title:s.titulo,description:s.descricao||s.resumo||"",image:mediaUrl(s.imagem_id,defaults.find(d=>d.slug===s.slug)?.image ?? images.componentes)})) : defaults;
  return <>
    <PageHero eyebrow={String(p.hero_chamada??"Serviços e soluções")} title={String(p.hero_titulo??"Soluções completas em processamento de metais.")} text={String(p.hero_texto??"A disponibilidade e o escopo de cada serviço são confirmados com nossa equipe.")} image={mediaUrl(p.hero_imagem_id,images.soldaLaser)} />
    <section className="py-20 md:py-28"><div className="container-site space-y-20 md:space-y-28">
      {p.heading || p.descricao ? <div><h2 className="text-3xl font-bold text-primary">{String(p.heading??"")}</h2><p className="mt-4 max-w-3xl text-muted-foreground">{String(p.descricao??"")}</p></div> : null}
      {list.map((s,n)=><article key={s.slug} id={s.slug} className="grid scroll-mt-32 items-center gap-10 lg:grid-cols-2 lg:gap-16"><Reveal className={cn(n%2===1&&"lg:order-2")}><img src={s.image} alt={s.title} className="aspect-[4/3] w-full object-cover shadow-card" loading="lazy" /></Reveal><Reveal delay={120}><span className="font-display text-sm font-bold text-accent">{String(n+1).padStart(2,"0")} / {String(list.length).padStart(2,"0")}</span><h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">{s.title}</h2><div className="mt-5 h-0.5 w-14 bg-accent" /><p className="mt-5 text-lg leading-relaxed text-muted-foreground">{s.description}</p><Link to="/orcamento" search={{servico:s.title}} className={cn(btn.base,btn.accent,"mt-8")}>Solicitar orçamento <ArrowRight className="h-4 w-4" /></Link></Reveal></article>)}
    </div></section><CtaBand />
  </>;
}
