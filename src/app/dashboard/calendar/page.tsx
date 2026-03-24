"use client";

import { useState, useEffect } from "react";
import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Clock, CheckCircle2, FileText, Plus } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/calendar")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setEvents(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsLoading(false);
            });
    }, []);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const statCards = [
        { label: "Scheduled", sub: "Ready to publish", icon: Clock, color: "#00C2FF", count: events.filter(e => e.type === 'scheduled').length },
        { label: "Published", sub: "This period", icon: CheckCircle2, color: "#22C55E", count: events.filter(e => e.type === 'published').length },
        { label: "Drafts", sub: "Need scheduling", icon: FileText, color: "#F59E0B", count: events.filter(e => e.type === 'draft').length },
    ];

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,76,241,0.12)", border: "1px solid rgba(108,76,241,0.25)" }}>
                        <CalendarIcon className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Content Calendar</h1>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>View scheduled, published, and draft articles</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-[140px] text-center text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {format(currentDate, "MMMM yyyy")}
                    </div>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-2xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <div className="px-6 pt-5 pb-3">
                    <div className="grid grid-cols-7 gap-1">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-[10px] font-semibold uppercase tracking-wider py-2" style={{ color: "var(--text-muted)" }}>
                                {day}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-4 pb-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-1.5">
                            {days.map(day => {
                                const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isCurrentDay = isToday(day);

                                return (
                                    <div
                                        key={day.toString()}
                                        className="min-h-[90px] p-1.5 rounded-lg transition-all"
                                        style={{
                                            background: isCurrentDay ? "rgba(108,76,241,0.06)" : isCurrentMonth ? "rgba(255,255,255,0.02)" : "transparent",
                                            border: isCurrentDay ? "1px solid rgba(108,76,241,0.25)" : "1px solid transparent",
                                            opacity: isCurrentMonth ? 1 : 0.3,
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-semibold" style={{ color: isCurrentDay ? "var(--brand-primary)" : "var(--text-secondary)" }}>
                                                {format(day, dateFormat)}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <span className="text-[8px] px-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            {dayEvents.slice(0, 2).map(event => {
                                                const colors: Record<string, { bg: string; text: string; border: string }> = {
                                                    scheduled: { bg: "rgba(0,194,255,0.06)", text: "#00C2FF", border: "rgba(0,194,255,0.15)" },
                                                    published: { bg: "rgba(34,197,94,0.06)", text: "#22C55E", border: "rgba(34,197,94,0.15)" },
                                                    draft: { bg: "rgba(245,158,11,0.06)", text: "#F59E0B", border: "rgba(245,158,11,0.15)" },
                                                };
                                                const c = colors[event.type] || colors.draft;
                                                const statusIcons = { scheduled: Clock, published: CheckCircle2, draft: FileText };
                                                const Icon = statusIcons[event.type as keyof typeof statusIcons];

                                                return (
                                                    <Link key={event.id} href={`/dashboard/articles?id=${event.id}`}
                                                        className="text-[8px] px-1 py-0.5 rounded flex items-center gap-0.5 truncate transition-opacity hover:opacity-80"
                                                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                                        title={`${event.title} (${event.wordCount} words)`}
                                                    >
                                                        <Icon className="w-2 h-2 shrink-0" />
                                                        <span className="truncate font-medium">{event.title}</span>
                                                    </Link>
                                                );
                                            })}
                                            {dayEvents.length > 2 && (
                                                <div className="text-[8px] text-center" style={{ color: "var(--text-muted)" }}>+{dayEvents.length - 2}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {statCards.map((s, i) => (
                        <div key={i} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}12` }}>
                                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{s.label}</p>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.sub}</p>
                            </div>
                            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.count}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
