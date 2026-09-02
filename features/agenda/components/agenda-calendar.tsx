"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgendaRow } from "@/features/agenda/components/agenda-manager";
import { formatDateTime } from "@/lib/format";
import { agendaType } from "@/lib/status";
import { TINGGI_KONTROL } from "@/components/ui/control";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year!, month! - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function AgendaCalendar({
  monthKey,
  items,
}: {
  monthKey: string;
  items: AgendaRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(year!, month! - 1, 1);
  const daysInMonth = new Date(year!, month!, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const byDay = new Map<string, AgendaRow[]>();
  for (const item of items) {
    const date = new Date(item.startAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  function goToMonth(nextMonth: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tampilan", "kalender");
    params.set("bulan", nextMonth);
    setSelectedDay(null);
    router.push(`?${params.toString()}`);
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedItems = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>
            {MONTH_NAMES[month! - 1]} {year}
          </CardTitle>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="iconSm"
              aria-label="Bulan sebelumnya"
              onClick={() => goToMonth(shiftMonth(monthKey, -1))}
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                goToMonth(
                  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
                )
              }
            >
              Hari ini
            </Button>
            <Button
              variant="outline"
              size="iconSm"
              aria-label="Bulan berikutnya"
              onClick={() => goToMonth(shiftMonth(monthKey, 1))}
            >
              <ChevronRight size={15} aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <div className="p-3 sm:p-4">
          <div
            role="grid"
            aria-label={`Kalender ${MONTH_NAMES[month! - 1]} ${year}`}
            className="grid grid-cols-7 gap-1"
          >
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                role="columnheader"
                className="pb-1 text-center text-[11px] font-medium text-muted-foreground"
              >
                <span className="sm:hidden">{weekday.charAt(0)}</span>
                <span className="hidden sm:inline">{weekday}</span>
              </div>
            ))}

            {Array.from({ length: leadingBlanks }).map((_, index) => (
              <div key={`blank-${index}`} aria-hidden="true" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-label={`${day} ${MONTH_NAMES[month! - 1]}, ${dayItems.length} agenda`}
                  aria-selected={isSelected}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={cn(
                    "flex min-h-14 flex-col items-center gap-1 rounded-md border p-1.5 transition-colors sm:min-h-20",
                    isSelected
                      ? "border-primary bg-accent"
                      : "border-transparent hover:bg-muted",
                    dayItems.length === 0 && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-[13px]",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {day}
                  </span>

                  <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {dayItems.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-primary"
                      />
                    ))}
                  </span>

                  <span className="hidden w-full flex-col gap-0.5 sm:flex">
                    {dayItems.slice(0, 2).map((item) => (
                      <span
                        key={item.id}
                        className="truncate rounded-xs bg-accent px-1 text-left text-[11px] text-accent-foreground"
                      >
                        {item.title}
                      </span>
                    ))}
                    {dayItems.length > 2 ? (
                      <span className="text-left text-[11px] text-muted-foreground">
                        +{dayItems.length - 2} lagi
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedDay ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Agenda {Number(selectedDay.slice(8))} {MONTH_NAMES[month! - 1]}{" "}
              {year}
            </CardTitle>
          </CardHeader>

          {selectedItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground sm:px-5">
              Tidak ada agenda pada tanggal ini.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {selectedItems.map((item) => {
                const type = agendaType(item.agendaType);

                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                        <span>{formatDateTime(item.startAt)}</span>
                        {item.location ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} aria-hidden="true" />
                            {item.location}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Badge tone={type.tone} className="w-fit shrink-0">
                      {type.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}

export function AgendaViewToggle({
  current,
}: {
  current: "daftar" | "kalender";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTo(view: "daftar" | "kalender") {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "daftar") {
      params.delete("tampilan");
      params.delete("bulan");
    } else {
      params.set("tampilan", "kalender");
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  }

  return (
    <div
      role="group"
      aria-label="Tampilan agenda"
      className={cn(
        TINGGI_KONTROL,
        "inline-flex items-center rounded-md border border-border bg-muted p-1",
      )}
    >
      {(["daftar", "kalender"] as const).map((view) => (
        <button
          key={view}
          type="button"
          aria-pressed={current === view}
          onClick={() => switchTo(view)}
          className={cn(
            "h-full rounded-sm px-3 text-[13px] font-medium capitalize transition-colors",
            current === view
              ? "bg-card text-foreground shadow-raised"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {view}
        </button>
      ))}
    </div>
  );
}
