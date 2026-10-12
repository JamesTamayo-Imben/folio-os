"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "./adminApi";
import { Icon } from "@/components/os/Icon";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
type CalendarSettings = { unavailableDates: string[]; weeklyUnavailableDays: number[]; monthlyUnavailableDays: number[] };

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CalendarTab() {
  const [settings, setSettings] = useState<CalendarSettings>({ unavailableDates: [], weeklyUnavailableDays: [], monthlyUnavailableDays: [] });
  const [draft, setDraft] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<CalendarSettings>("/api/admin/portfolio-content/calendar").then((result) => {
      if (result.ok) setSettings(result.data);
      else setError(result.error.message);
      setLoading(false);
    });
  }, []);

  const saveSettings = async (next: CalendarSettings, successMessage: string) => {
    setSaving(true); setError(""); setNotice("");
    const result = await api<CalendarSettings>("/api/admin/portfolio-content/calendar", { method: "PUT", json: next });
    setSaving(false);
    if (!result.ok) { setError(result.error.message); return false; }
    setSettings(result.data);
    setNotice(successMessage);
    return true;
  };

  const addUnavailableDate = async () => {
    if (!draft || settings.unavailableDates.includes(draft)) return;
    if (settings.unavailableDates.length >= 180) { setError("You can add up to 180 one-off unavailable dates."); return; }
    if (await saveSettings({ ...settings, unavailableDates: [...settings.unavailableDates, draft].sort() }, "Unavailable date added and published.")) setDraft("");
  };

  const removeUnavailableDate = (date: string) => {
    void saveSettings({ ...settings, unavailableDates: settings.unavailableDates.filter((value) => value !== date) }, "Unavailable date removed. That date is available unless a recurring rule also applies.");
  };

  const toggleWeeklyDay = (day: number) => {
    const nextDays = settings.weeklyUnavailableDays.includes(day)
      ? settings.weeklyUnavailableDays.filter((value) => value !== day)
      : [...settings.weeklyUnavailableDays, day];
    void saveSettings({ ...settings, weeklyUnavailableDays: nextDays }, `Every ${WEEKDAYS[day]} ${nextDays.includes(day) ? "marked unavailable" : "set back to available"}.`);
  };

  const toggleMonthlyDay = (day: number) => {
    const nextDays = settings.monthlyUnavailableDays.includes(day)
      ? settings.monthlyUnavailableDays.filter((value) => value !== day)
      : [...settings.monthlyUnavailableDays, day];
    void saveSettings({ ...settings, monthlyUnavailableDays: nextDays }, `Day ${day} of each month ${nextDays.includes(day) ? "marked unavailable" : "set back to available"}.`);
  };

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const unavailableReason = (date: Date) => {
    const key = toISODate(date);
    if (settings.unavailableDates.includes(key)) return "One-off";
    if (settings.weeklyUnavailableDays.includes(date.getDay())) return `Every ${WEEKDAYS[date.getDay()]}`;
    if (settings.monthlyUnavailableDays.includes(date.getDate())) return `Day ${date.getDate()} monthly`;
    return null;
  };

  const moveMonth = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <section className="adm-content-tab">
      <div className="adm-bar"><div><h2>Calendar availability</h2><p className="dim small">Every date is available by default. Add only the dates or repeating days when you are unavailable.</p></div><span className="dim small" role="status">{saving ? "Saving…" : notice || "Changes publish immediately"}</span></div>
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="calendar-rule-section">
        <div><h3>Unavailable every week</h3><p className="dim small">Choose days that repeat every week, such as every Sunday.</p></div>
        <div className="calendar-weekday-choices" role="group" aria-label="Weekly unavailable days">
          {WEEKDAYS.map((day, index) => <button key={day} type="button" className={`calendar-weekday-choice ${settings.weeklyUnavailableDays.includes(index) ? "is-unavailable" : ""}`} aria-pressed={settings.weeklyUnavailableDays.includes(index)} disabled={loading || saving} onClick={() => toggleWeeklyDay(index)}>{day.slice(0, 3)}</button>)}
        </div>
        <p className="calendar-rule-summary">{settings.weeklyUnavailableDays.length ? `Unavailable every ${settings.weeklyUnavailableDays.map((day) => WEEKDAYS[day]).join(", every ")}.` : "No weekly unavailable days."}</p>
      </section>

      <section className="calendar-rule-section">
        <div><h3>Unavailable every month</h3><p className="dim small">Choose dates of the month that repeat, such as the 1st or the 15th. Months without that day skip it.</p></div>
        <div className="calendar-monthday-choices" role="group" aria-label="Monthly unavailable dates">
          {MONTH_DAYS.map((day) => <button key={day} type="button" className={`calendar-monthday-choice ${settings.monthlyUnavailableDays.includes(day) ? "is-unavailable" : ""}`} aria-pressed={settings.monthlyUnavailableDays.includes(day)} aria-label={`Day ${day} of every month`} disabled={loading || saving} onClick={() => toggleMonthlyDay(day)}>{day}</button>)}
        </div>
        <p className="calendar-rule-summary">{settings.monthlyUnavailableDays.length ? `Unavailable on day${settings.monthlyUnavailableDays.length === 1 ? "" : "s"} ${settings.monthlyUnavailableDays.join(", ")} of each month.` : "No monthly unavailable dates."}</p>
      </section>

      <section className="calendar-rule-section calendar-oneoff-section">
        <div><h3>Unavailable on specific dates</h3><p className="dim small">Add a one-time date. It will not repeat.</p></div>
        <div className="calendar-admin-controls"><label className="calendar-date-field" htmlFor="unavailable-date">Choose a date<input id="unavailable-date" type="date" value={draft} onChange={(event) => setDraft(event.target.value)} /></label><button type="button" className="btn" onClick={() => void addUnavailableDate()} disabled={loading || saving || !draft || settings.unavailableDates.includes(draft)}>{saving ? "Saving…" : "Add unavailable date"}</button></div>
        {settings.unavailableDates.length ? <ul className="adm-date-list adm-date-list-unavailable">{settings.unavailableDates.map((date) => <li key={date}><span className="adm-date-status"><i />{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { dateStyle: "full" })}</span><button type="button" className="link-btn" disabled={saving} onClick={() => removeUnavailableDate(date)}>Remove</button></li>)}</ul> : <p className="adm-empty-note">No one-off unavailable dates.</p>}
      </section>

      <section className="admin-calendar-preview" aria-label="Calendar preview">
        <header className="admin-calendar-head"><div><p className="local-eyebrow">PUBLIC PREVIEW · OTHER DAYS ARE AVAILABLE</p><h3>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3></div><div className="calendar-nav"><button type="button" className="icon-action" onClick={() => moveMonth(-1)} aria-label="Previous month"><Icon name="arrow" size={17} className="calendar-arrow-prev" /></button><button type="button" className="calendar-today" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button><button type="button" className="icon-action" onClick={() => moveMonth(1)} aria-label="Next month"><Icon name="arrow" size={17} /></button></div></header>
        <div className="calendar-grid admin-calendar-grid" role="grid" aria-label={`${month.toLocaleDateString(undefined, { month: "long", year: "numeric" })} availability`}>
          {WEEKDAYS.map((day) => <div key={day} className="calendar-weekday" role="columnheader">{day.slice(0, 3)}</div>)}
          {calendarDays.map((day) => {
            const key = toISODate(day);
            const reason = unavailableReason(day);
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = key === toISODate(new Date());
            return <button key={key} type="button" role="gridcell" aria-label={`${day.toLocaleDateString()}, ${reason ? `unavailable (${reason})` : "available"}`} className={`calendar-day admin-calendar-day ${inMonth ? "" : "outside-month"} ${isToday ? "is-today" : ""} ${reason ? "date-unavailable" : "date-available"} ${draft === key ? "is-picked" : ""}`} onClick={() => setDraft(key)}><span>{day.getDate()}</span>{reason && <i>{reason}</i>}</button>;
          })}
        </div>
        <div className="calendar-legend"><span><i className="legend-unavailable" />Unavailable</span><span><i className="legend-today" />Today</span><span>Unmarked days are available</span></div>
      </section>
    </section>
  );
}
