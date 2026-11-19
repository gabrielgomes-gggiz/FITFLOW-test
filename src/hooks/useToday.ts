import { useEffect, useState } from "react";
import type { DateKey } from "@/types";
import { todayKey } from "@/utils/date";

/** Data de hoje que se atualiza sozinha à meia-noite e ao voltar para a aba. */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const update = () => setToday(todayKey());
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
    const timer = setTimeout(update, msToMidnight);
    const onVisible = () => document.visibilityState === "visible" && update();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [today]);
  return today;
}

/** Hora atual com atualização a cada minuto (para saudação e sugestões). */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
