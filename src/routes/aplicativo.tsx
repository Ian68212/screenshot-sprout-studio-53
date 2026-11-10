import { createFileRoute } from "@tanstack/react-router";
import { Apple, ArrowDownToLine, CheckCircle2, Smartphone } from "lucide-react";
import { pageMeta } from "@/lib/seo";

const androidApk =
  "https://github.com/Ian68212/screenshot-sprout-studio-53/releases/download/android-v1.0.26/Rodrinox-Pro-Android.apk";
const collaboratorPortal = "https://rodrinoxpro.com.br/colaborador/";

export const Route = createFileRoute("/aplicativo")({
  head: () => ({
    meta: pageMeta(
      "Aplicativo Rodrinox Pro | Download e instalação",
      "Baixe o aplicativo Rodrinox Pro para Android ou acesse o portal corporativo pelo iPhone."
    ),
  }),
  component: AppDownload,
});

function AppDownload() {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <section className="container-site mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Acesso corporativo</p>
          <h1 className="mt-4 text-4xl font-extrabold text-primary md:text-6xl">
            Aplicativo Rodrinox Pro
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Acesse os recursos corporativos da Rodrinox Pro pelo celular.
            Escolha seu dispositivo e siga as instruções de instalação.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-card md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Smartphone className="h-7 w-7" />
            </div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-widest text-accent">Android</p>
            <h2 className="mt-2 text-2xl font-bold text-primary">Baixar para Android</h2>
            <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
              Baixe o instalador oficial e abra o arquivo no celular. Se o Android
              solicitar autorização, permita a instalação para este arquivo.
            </p>
            <a
              href={androidApk}
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-center font-bold text-accent-foreground transition hover:brightness-95"
            >
              <ArrowDownToLine className="h-5 w-5" />
              Baixar aplicativo Android
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Versão 1.0.26 • APK • Acesso restrito a usuários autorizados
            </p>
          </article>

          <article className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-card md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <Apple className="h-7 w-7" />
            </div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-widest text-accent">iPhone</p>
            <h2 className="mt-2 text-2xl font-bold text-primary">Adicionar à tela inicial</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              No iPhone, use o portal corporativo como um app da web. Não é necessário
              baixar o APK Android.
            </p>
            <ol className="mt-5 flex-1 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3"><span className="font-bold text-accent">1.</span><span>Abra o portal pelo Safari no iPhone.</span></li>
              <li className="flex gap-3"><span className="font-bold text-accent">2.</span><span>Toque em Compartilhar e escolha “Adicionar à Tela de Início”.</span></li>
              <li className="flex gap-3"><span className="font-bold text-accent">3.</span><span>Ative “Abrir como App da Web”, se a opção aparecer, e toque em Adicionar.</span></li>
            </ol>
            <a
              href={collaboratorPortal}
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-center font-bold text-primary-foreground transition hover:brightness-110"
            >
              <Apple className="h-5 w-5" />
              Abrir portal no iPhone
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              O acesso exige e-mail corporativo e credenciais autorizadas.
            </p>
          </article>
        </div>

        <div className="mt-10 rounded-xl border border-border bg-muted/40 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h3 className="font-semibold text-primary">Acesso protegido</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                O download do aplicativo não libera acesso aos sistemas internos.
                Cada colaborador precisa utilizar suas próprias credenciais corporativas.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
