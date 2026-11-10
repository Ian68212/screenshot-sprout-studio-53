import { createFileRoute } from "@tanstack/react-router";
import { images, values } from "@/content/site";
import { PageHero, Reveal, SectionTitle } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/empresa")({
  head: () => ({ meta: pageMeta("A empresa", "Conheça a Rodrinox Pro: soluções industriais e fabricação de componentes metálicos com visão técnica, inovação e compromisso.") }),
  component: Empresa,
});

function Empresa() {
  const cms = usePublicSite();
  const p = cms.content("empresa.institucional", {});
  const text = (key: string, fallback: string) => String(p[key] ?? fallback);
  return <>
    <PageHero eyebrow={text("hero_chamada","A empresa")} title={text("hero_titulo","Mais do que soluções. Parcerias que geram resultados.")} image={mediaUrl(p.hero_imagem_id, images.fabrica)} />
    <section className="py-24"><div className="container-site grid gap-14 lg:grid-cols-2">
      <Reveal><SectionTitle eyebrow="Quem somos" title={text("heading","Engenharia, tecnologia e soluções para a indústria.")} /></Reveal>
      <Reveal delay={120} className="space-y-5 text-lg leading-relaxed text-muted-foreground">
        <p>{text("apresentacao","A Rodrinox Pro é especializada em soluções industriais e na fabricação de componentes metálicos. Trabalhamos para conectar necessidades industriais a caminhos eficientes, com atenção aos detalhes, tecnologia e relacionamento próximo com cada cliente.")}</p>
        <p className="whitespace-pre-line">{text("historia","Toda grande conquista começa com um sonho. A Rodrinox Pro nasceu da vontade de transformar ideias em soluções, desafios em oportunidades e trabalho em resultados.")}</p>
      </Reveal>
    </div></section>
    <section className="bg-secondary py-24"><div className="container-site">
      <SectionTitle center eyebrow="Nossos valores" title="O que nos move" />
      <div className="mt-14 grid gap-6 md:grid-cols-3">{values.map((v,n)=><Reveal key={v.title} delay={n*100} className="bg-card p-10 shadow-card"><span className="font-display text-4xl font-extrabold text-accent">0{n+1}</span><h3 className="mt-4 text-xl font-bold text-primary">{v.title}</h3><p className="mt-3 text-muted-foreground">{v.text}</p></Reveal>)}</div>
      <div className="mt-6 grid gap-6 md:grid-cols-3">{[["Missão","missao"],["Visão","visao"],["Valores","valores"]].map(([label,key])=><div key={key} className="border bg-card p-8"><h3 className="font-bold text-primary">{label}</h3><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{text(key, "Conteúdo a ser definido no gerenciador do site.")}</p></div>)}</div>
    </div></section><CtaBand />
  </>;
}
