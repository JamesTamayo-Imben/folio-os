"use client";
import { useMemo, useState } from "react";
import { useSiteProfile } from "../os/site-profile-context";
import { Icon } from "../os/Icon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthLabel = (date: Date) => date.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function AvailabilityCalendar({ unavailableDates: unavailableValues = [], weeklyUnavailableDays = [], monthlyUnavailableDays = [] }: { unavailableDates?: string[]; weeklyUnavailableDays?: number[]; monthlyUnavailableDays?: number[] }) {
  const profile = useSiteProfile();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const today = new Date();
  const unavailableDates = new Set(unavailableValues);
  const dates = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const moveMonth = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div className="local-app calendar-app">
      <header className="calendar-heading"><div><p className="local-eyebrow">YOUR SCHEDULE</p><h2>{monthLabel(month)}</h2></div><div className="calendar-nav"><button className="icon-action" onClick={() => moveMonth(-1)} aria-label="Previous month"><Icon name="arrow" size={17} className="calendar-arrow-prev" /></button><button className="calendar-today" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button><button className="icon-action" onClick={() => moveMonth(1)} aria-label="Next month"><Icon name="arrow" size={17} /></button></div></header>
      <div className="availability-card"><span className="availability-indicator is-available" /><div><strong>Availability</strong><p>{profile.availability || "Available unless marked unavailable."}</p></div><span className="calendar-readonly">AVAILABLE BY DEFAULT</span></div>
      <div className="calendar-grid" role="grid" aria-label={monthLabel(month)}>
        {WEEKDAYS.map((day) => <div key={day} className="calendar-weekday" role="columnheader">{day}</div>)}
        {dates.map((date) => {
          const isToday = date.toDateString() === today.toDateString();
          const inMonth = date.getMonth() === month.getMonth();
          const dateKey = isoDate(date);
          const reason = unavailableDates.has(dateKey)
            ? "Unavailable"
            : weeklyUnavailableDays.includes(date.getDay())
              ? "Weekly unavailability"
              : monthlyUnavailableDays.includes(date.getDate())
                ? "Monthly unavailability"
                : "Available";
          const isUnavailable = reason !== "Available";
          return <div key={dateKey} role="gridcell" aria-label={`${date.toLocaleDateString()}, ${reason.toLowerCase()}`} aria-current={isToday ? "date" : undefined} className={`calendar-day ${inMonth ? "" : "outside-month"} ${isToday ? "is-today" : ""} ${isUnavailable ? "date-unavailable" : "date-available"}`}><span>{date.getDate()}</span>{isUnavailable && <i>{reason}{isToday ? " · Today" : ""}</i>}{isToday && !isUnavailable && <i>Today · Available</i>}</div>;
        })}
      </div>
      <div className="calendar-legend"><span><i className="legend-available" /> Available by default</span><span><i className="legend-unavailable" /> Unavailable</span></div>
      <p className="calendar-footnote">This calendar displays availability dates published by the portfolio owner. It does not expose private appointments.</p>
    </div>
  );
}
