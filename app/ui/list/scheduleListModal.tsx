"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/shared/components/ui/Modal";

const timeZone = "America/Argentina/Buenos_Aires";

function getParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "00";
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute") };
}

function formatCalendarDate(value: Date) {
  const { year, month, day, hour, minute } = getParts(value);
  return `${year}${month}${day}T${hour}${minute}00`;
}

function getDefaultDateTime() {
  const now = getParts(new Date());
  const start = new Date(
    `${now.year}-${now.month}-${now.day}T${now.hour}:${now.minute}:00-03:00`,
  );
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const next = getParts(start);
  return {
    date: `${next.year}-${next.month}-${next.day}`,
    time: `${next.hour}:${next.minute}`,
  };
}

export default function ScheduleListModal({
  listName,
  listUrl,
  onClose,
}: {
  listName: string;
  listUrl: string;
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    const defaults = getDefaultDateTime();
    setDate(defaults.date);
    setTime(defaults.time);
  }, []);

  const calendarUrl = useMemo(() => {
    if (!date || !time) return "";
    const start = new Date(`${date}T${time}:00-03:00`);
    if (Number.isNaN(start.getTime())) return "";
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Compras: ${listName}`,
      dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
      ctz: timeZone,
      details: `Lista de compras: ${listUrl}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [date, listName, listUrl, time]);

  return (
    <Modal isOpen title={`Agendar ${listName}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Agendar lista</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Elige cuándo quieres hacer estas compras. Se abrirá Google Calendar
            con la lista y su enlace incluidos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Fecha
            <input
              type="date"
              className="field mt-2"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Hora
            <input
              type="time"
              className="field mt-2"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <a
            className={`btn-primary ${!calendarUrl ? "pointer-events-none opacity-50" : ""}`}
            href={calendarUrl || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!calendarUrl}
            onClick={(event) => {
              if (!calendarUrl) event.preventDefault();
              else onClose();
            }}
          >
            Abrir Google Calendar
          </a>
        </div>
      </div>
    </Modal>
  );
}
