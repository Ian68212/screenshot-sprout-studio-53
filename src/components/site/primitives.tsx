import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const btn = {
  base: "inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-300",
  accent: "bg-accent text-accent-foreground hover:brightness-110 hover:-translate-y-0.5",
  navy: "bg-primary text-primary-foreground hover:bg-navy-deep",
  outlineLight: "border border-navy-foreground/40 text-navy-foreground hover:bg-navy-foreground hover:text-primary",
  outline: "border border-primary/25 text-primary hover:bg-primary hover:text-primary-foreground",
};

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-visible={visible} className={cn("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, text, light, center }: { eyebrow: string; title: string; text?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className={cn("mt-3 text-3xl font-bold md:text-5xl", light ? "text-navy-foreground" : "text-primary")}>{title}</h2>
      <div className={cn("mt-5 h-0.5 w-14 bg-accent", center && "mx-auto")} />
      {text && <p className={cn("mt-5 text-base leading-relaxed md:text-lg", light ? "text-navy-foreground/75" : "text-muted-foreground")}>{text}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, text, image }: { eyebrow: string; title: string; text?: string; image: string }) {
  return (
    <section className="relative flex min-h-[420px] items-end overflow-hidden bg-navy-deep pt-32 md:min-h-[480px]">
      <img src={image} alt="" className="animate-hero-zoom absolute inset-0 h-full w-full object-cover" width={1920} height={1080} />
      <div className="bg-hero-overlay absolute inset-0" />
      <div className="container-site relative pb-14 md:pb-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold text-navy-foreground md:text-6xl">{title}</h1>
        {text && <p className="mt-5 max-w-xl text-lg text-navy-foreground/80">{text}</p>}
      </div>
    </section>
  );
}
