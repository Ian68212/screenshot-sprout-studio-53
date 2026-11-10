import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { gallery as defaults, images } from "@/content/site";
import { PageHero, Reveal } from "@/components/site/primitives";
import { CtaBand } from "@/components/site/Footer";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { mediaUrl, usePublicSite } from "@/lib/site-cms";

export const Route = createFileRoute("/galeria")({
  head: () => ({ meta: pageMeta("Galeria de fotos", "Galeria de fotos da Rodrinox Pro: corte a laser, dobra, soldagem e fabricação de componentes metálicos.") }),
  component: Galeria,
});

function Galeria() {
  const cms = usePublicSite();
  const p = cms.content("galeria.pagina", {});
  const saved = cms.items("galeria");
  const gallery = saved.length ? saved.map(x=>({src:mediaUrl(x.imagem_id,defaults.find(d=>d.alt===x.descricao)?.src ?? images.componentes),alt:x.descricao||x.titulo})) : defaults;
  const [open,setOpen] = useState<number|null>(null);
  return <>
    <PageHero eyebrow={String(p.hero_chamada??"Galeria")} title={String(p.hero_titulo??"Nosso trabalho em imagens.")} image={mediaUrl(p.hero_imagem_id,images.componentes)} />
    <section className="py-24"><div className="container-site">
      {p.heading || p.descricao ? <div className="mb-10"><h2 className="text-3xl font-bold text-primary">{String(p.heading??"")}</h2><p className="mt-3 text-muted-foreground">{String(p.descricao??"")}</p></div> : null}
      <div className="grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-4">{gallery.map((g,n)=><Reveal key={n} delay={(n%4)*60} className={cn(n%5===0&&"sm:col-span-2 sm:row-span-2")}><button onClick={()=>setOpen(n)} className="group h-full w-full overflow-hidden" aria-label={`Ampliar: ${g.alt}`}><img src={g.src} alt={g.alt} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" /></button></Reveal>)}</div>
    </div></section>
    {open!==null&&gallery[open]&&<div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-deep/95 p-4" onClick={()=>setOpen(null)}><button className="absolute right-5 top-5 text-navy-foreground" aria-label="Fechar"><X className="h-8 w-8" /></button><figure onClick={e=>e.stopPropagation()}><img src={gallery[open]!.src} alt={gallery[open]!.alt} className="max-h-[80vh] w-auto" /><figcaption className="mt-3 text-center text-sm text-navy-foreground/80">{gallery[open]!.alt}</figcaption></figure></div>}
    <CtaBand />
  </>;
}
