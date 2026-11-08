import { useEffect, useState } from "react";

export type SiteCmsItem = {
  id: number; tipo: "banner" | "servico" | "projeto" | "galeria";
  slug: string; titulo: string; resumo: string | null; descricao: string | null;
  ordem: number; imagem_id: number | null; imagem_mime: string | null;
};
export type SiteCmsContent = { chave: string; titulo: string; corpo: string | null };
type Payload = { itens: SiteCmsItem[]; conteudos: SiteCmsContent[] };

// Defina VITE_SITE_CMS_API na publicação do site se o portal estiver em outro domínio.
// O endpoint é somente de leitura e não exige credenciais.
const API = (import.meta.env.VITE_SITE_CMS_API || "/colaborador/api/public/site").replace(/\/$/, "");

export function useSiteCms() {
  const [data, setData] = useState<Payload>({ itens: [], conteudos: [] });
  useEffect(() => {
    let active = true;
    fetch(API, { headers: { Accept: "application/json" } })
      .then((r) => { if (!r.ok) throw new Error("CMS indisponível"); return r.json(); })
      .then((payload: Payload) => { if (active && payload && Array.isArray(payload.itens)) setData(payload); })
      .catch(() => { /* O site mantém o conteúdo local como fallback. */ });
    return () => { active = false; };
  }, []);
  const imagem = (id: number | null | undefined) => id ? `${API}/midias/${id}` : "";
  const conteudo = (chave: string) => data.conteudos.find((c) => c.chave === chave);
  const dados = (chave: string): Record<string, string> => {
    const item = conteudo(chave);
    if (!item?.corpo) return {};
    try { return JSON.parse(item.corpo) as Record<string, string>; } catch { return {}; }
  };
  return { ...data, imagem, conteudo, dados };
}
