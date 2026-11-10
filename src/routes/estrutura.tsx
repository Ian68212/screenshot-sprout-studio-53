import { createFileRoute } from "@tanstack/react-router";
import { images } from "@/content/site";
import { PageHero, Reveal, SectionTitle } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/estrutura")({
  head: () => ({ meta: pageMeta("Estrutura e capacidade produtiva", "Conheça a estrutura produtiva da Rodrinox Pro para corte a laser, dobra, soldagem e fabricação de componentes metálicos.") }),
  component: Estrutura,
});

const defaults = [
  { title:"Corte a laser", description:"Processamento de chapas metálicas com precisão.", image:images.heroLaser },
  { title:"Dobra de chapas", description:"Conformação de chapas conforme o projeto.", image:images.dobra },
  { title:"Soldagem a laser", description:"Uniões precisas e acabamento controlado.", image:images.soldaLaser },
  { title:"Soldagem TIG", description:"Soldagem especializada para diferentes aplicações.", image:images.soldaTig },
];

function Estrutura() {
  const cms = usePublicSite();
  const p = cms.content("estrutura.institucional", {});
  const text = (key:string, fallback:string) => String(p[key] ?? fallback);
  const areas = defaults.map((d,n)=>({title:text(`area${n+1}_titulo`,d.title),description:text(`area${n+1}_descricao`,d.description),image:mediaUrl(p[`area${n+1}_imagem_id`],d.image)}));
  const metrics = [1,2,3].map(n=>({value:text(`metrica${n}_valor`,"—"),label:text(`metrica${n}_label`,["Área fabril","Equipamentos","Equipe técnica"][n-1]!)}));
  return <>
    <PageHero eyebrow={text("hero_chamada","Estrutura")} title={text("hero_titulo","Capacidade produtiva para o seu projeto.")} image={mediaUrl(p.hero_imagem_id,images.fabrica)} />
    <section className="py-24"><div className="container-site">
      <SectionTitle eyebrow="Nosso parque fabril" title={text("heading","Processos integrados em um só lugar.")} text={text("descricao","Integramos corte, dobra e soldagem para atender da peça unitária a projetos completos.")} />
      <div className="mt-14 grid gap-6 sm:grid-cols-2">{areas.map((a,n)=><Reveal key={n} delay={(n%2)*100} className="group overflow-hidden border bg-card"><div className="overflow-hidden"><img src={a.image} alt={a.title} className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" /></div><div className="p-7"><h3 className="text-xl font-bold text-primary">{a.title}</h3><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{a.description}</p></div></Reveal>)}</div>
      <div className="mt-14 grid gap-px bg-border sm:grid-cols-3">{metrics.map((m,n)=><div key={n} className="bg-secondary p-8 text-center"><p className="font-display text-3xl font-extrabold text-primary">{m.value}</p><p className="mt-2 text-sm text-muted-foreground">{m.label}</p></div>)}</div>
    </div></section><CtaBand />
  </>;
}
