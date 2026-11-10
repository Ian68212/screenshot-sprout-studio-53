import { useQuery } from "@tanstack/react-query";

export type PublicSiteItem = {
  id: number;
  tipo: "banner" | "servico" | "projeto" | "galeria";
  slug: string;
  titulo: string;
  resumo?: string | null;
  descricao?: string | null;
  ordem: number;
  imagem_id?: number | null;
  imagem_mime?: string | null;
};

type PublicSiteResponse = {
  itens: PublicSiteItem[];
  conteudos: Array<{ chave: string; titulo: string; corpo: string; atualizado_em?: string }>;
};

export function mediaUrl(id: unknown, fallback: string) {
  const value = Number(id);
  return Number.isSafeInteger(value) && value > 0
    ? `/colaborador/api/public/site/midias/${value}`
    : fallback;
}

export function usePublicSite() {
  const query = useQuery<PublicSiteResponse>({
    queryKey: ["rodrinox-public-site"],
    queryFn: async () => {
      const response = await fetch("/colaborador/api/public/site/", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Não foi possível carregar o conteúdo publicado.");
      return response.json();
    },
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const content = (key: string, fallback: Record<string, unknown> = {}) => {
    const item = query.data?.conteudos?.find((entry) => entry.chave === key);
    if (!item?.corpo) return fallback;
    try {
      const parsed = JSON.parse(item.corpo);
      return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
    } catch {
      return fallback;
    }
  };

  const items = (tipo: PublicSiteItem["tipo"]) =>
    (query.data?.itens || [])
      .filter((item) => item.tipo === tipo)
      .sort((a, b) => a.ordem - b.ordem || a.id - b.id);

  return { data: query.data, isLoading: query.isLoading, content, items };
}
