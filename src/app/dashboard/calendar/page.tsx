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

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        View scheduled, published, and draft articles on your content calendar.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center justify-center min-w-[150px] font-semibold text-lg">
                        {format(currentDate, "MMMM yyyy")}
                    </div>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Card className="glass-card shadow-xl shadow-black/5">
                <CardHeader className="pb-4">
                    <div className="grid grid-cols-7 gap-1">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                                {day}
                            </div>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {days.map(day => {
                                const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isCurrentDay = isToday(day);

                                return (
                                    <div
                                        key={day.toString()}
                                        className={`min-h-[100px] p-2 rounded-lg border ${isCurrentMonth ? "bg-card border-border/50" : "bg-muted/10 border-transparent text-muted-foreground opacity-40"
                                            } ${isCurrentDay ? "ring-2 ring-violet-500 bg-violet-500/5" : ""}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-semibold ${isCurrentDay ? "text-violet-500" : ""}`}>
                                                {format(day, dateFormat)}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted/60">
                                                    {dayEvents.length}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            {dayEvents.slice(0, 3).map(event => {
                                                const statusColors = {
                                                    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                                    published: "bg-green-500/10 text-green-500 border-green-500/20",
                                                    draft: "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                };
                                                const statusIcons = {
                                                    scheduled: Clock,
                                                    published: CheckCircle2,
                                                    draft: FileText
                                                };
                                                const Icon = statusIcons[event.type as keyof typeof statusIcons];
                                                
                                                return (
                                                    <Link
                                                        key={event.id}
                                                        href={`/dashboard/articles?id=${event.id}`}
                                                        className={`text-[10px] px-1.5 py-1 rounded border truncate flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ${statusColors[event.type as keyof typeof statusColors]}`}
                                                        title={`${event.title} (${event.wordCount} words)`}
                                                    >
                                                        <Icon className="w-2.5 h-2.5 shrink-0" />
                                                        <span className="truncate font-medium">{event.title}</span>
                                                    </Link>
                                                );
                                            })}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-muted-foreground text-center">
                                                    +{dayEvents.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {!isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="glass-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm">Scheduled</CardTitle>
                                    <CardDescription className="text-xs">Ready to publish</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {events.filter(e => e.type === 'scheduled').length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm">Published</CardTitle>
                                    <CardDescription className="text-xs">This period</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {events.filter(e => e.type === 'published').length}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm">Drafts</CardTitle>
                                    <CardDescription className="text-xs">Need scheduling</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {events.filter(e => e.type === 'draft').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div >
    );
}
