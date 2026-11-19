import { useRef } from "react";
import type { DateKey } from "@/types";
import { addDays, formatRelativeDay, isValidDateKey } from "@/utils/date";
import { Icon } from "./Icon";

/** Navegação entre dias: anterior, seletor nativo de data e próximo (até hoje). */
export function DateNav({ date, today, onChange, label = "Dia exibido" }: { date: DateKey; today: DateKey; onChange: (d: DateKey) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const isToday = date >= today;
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-1" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Dia anterior"
        className="grid size-9 place-items-center rounded-full text-ink hover:bg-mist"
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <div className="relative">
        <button
          type="button"
          className="flex min-h-9 min-w-28 items-center justify-center gap-1.5 rounded-full px-3 font-bold text-ink hover:bg-mist"
          onClick={() => {
            const el = input.current;
            if (!el) return;
            try {
              el.showPicker();
            } catch {
              el.focus();
              el.click();
            }
          }}
          aria-label={`${formatRelativeDay(date, today)}. Escolher outra data`}
        >
          <Icon name="calendar" size={16} className="text-muted" />
          {formatRelativeDay(date, today)}
        </button>
        <input
          ref={input}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          max={today}
          value={date}
          onChange={(e) => {
            const v = e.target.value;
            if (isValidDateKey(v) && v <= today) onChange(v);
          }}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        disabled={isToday}
        aria-label="Próximo dia"
        className="grid size-9 place-items-center rounded-full text-ink hover:bg-mist disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}
