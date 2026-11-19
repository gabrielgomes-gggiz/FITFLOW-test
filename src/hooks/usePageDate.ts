import { useCallback, useEffect, useState } from "react";
import type { DateKey } from "@/types";
import { isValidDateKey } from "@/utils/date";
import { navigate, useLocation } from "./useRouter";
import { useToday } from "./useToday";

/**
 * Dia exibido numa página de registros. Aceita ?data=AAAA-MM-DD (links do histórico)
 * e ?registrar=1 (atalhos do início) — o parâmetro é consumido e removido da URL.
 */
export function usePageDate() {
  const today = useToday();
  const { path, query } = useLocation();
  const fromUrl = query.get("data");
  const [date, setDate] = useState<DateKey>(() => (fromUrl && isValidDateKey(fromUrl) && fromUrl <= today ? fromUrl : today));
  const [openRequested, setOpenRequested] = useState(() => query.get("registrar") === "1" || query.get("criar") === "1");

  useEffect(() => {
    if (query.has("registrar") || query.has("criar") || query.has("data")) navigate(path, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Se a data selecionada for "hoje" e o dia virar, acompanha.
  useEffect(() => {
    setDate((d) => (d > today ? today : d));
  }, [today]);

  const clearOpenRequest = useCallback(() => setOpenRequested(false), []);
  return { date: date > today ? today : date, setDate, today, openRequested, clearOpenRequest };
}
