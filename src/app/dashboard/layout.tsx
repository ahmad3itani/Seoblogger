"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { isFeatureAvailable, getFeatureGate } from "@/lib/supabase/plan-gates";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Sparkles, LayoutDashboard, PenTool, FileText, Settings, LogOut,
    Menu, X, ChevronRight, CheckCircle2, Megaphone, RefreshCw, Layers,
    Network, CalendarClock, Calendar, Lightbulb, Globe, ChevronDown,
    Check, TrendingUp, BarChart3, Lock, Crown, Activity, Link as LinkIcon,
    ShoppingCart, Zap, Bot,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
    href: string;
    label: string;
    icon: any;
    feature: string | null;
    minPlan?: string;
}
interface NavSection {
    title: string | null;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: null,
        items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: null },
        ],
    },
    {
        title: "Content",
        items: [
            { href: "/dashboard/new",          label: "New Article",     icon: PenTool,      feature: null },
            { href: "/dashboard/articles",     label: "My Articles",     icon: FileText,     feature: null },
            { href: "/dashboard/bulk",         label: "Bulk Generator",  icon: Layers,       feature: "hasBulkGeneration",  minPlan: "starter" },
            { href: "/dashboard/amazon",       label: "Amazon Affiliate",icon: ShoppingCart, feature: null },
            { href: "/dashboard/brand-voice",  label: "Brand Voices",    icon: Megaphone,    feature: null },
            { href: "/dashboard/quality-pass", label: "Quality Pass",    icon: Sparkles,     feature: "hasQualityPass",     minPlan: "pro" },
        ],
    },
    {
        title: "SEO Tools",
        items: [
            { href: "/dashboard/keywords",    label: "Keyword Research", icon: TrendingUp, feature: null },
            { href: "/dashboard/ideas",       label: "Trend Ideas",      icon: Lightbulb,  feature: "hasTrendIdeas",     minPlan: "starter" },
            { href: "/dashboard/clustering",  label: "Keyword Clustering",icon: Network,   feature: "hasAutoClustering", minPlan: "pro" },
            { href: "/dashboard/audit/full",  label: "Site Audit",       icon: Activity,   feature: null },
            { href: "/dashboard/refresh",     label: "Content Refresh",  icon: RefreshCw,  feature: "hasContentRefresh", minPlan: "pro" },
            { href: "/dashboard/linker",      label: "Internal Linker",  icon: LinkIcon,   feature: null },
        ],
    },
    {
        title: "Marketing",
        items: [
            { href: "/dashboard/marketing",             label: "Marketing Hub", icon: Bot, feature: null },
            { href: "/dashboard/marketing/quick-audit", label: "Quick Audit",   icon: Zap, feature: null },
        ],
    },
    {
        title: "Scheduling",
        items: [
            { href: "/dashboard/campaigns", label: "Campaigns", icon: CalendarClock, feature: "hasScheduling", minPlan: "starter" },
            { href: "/dashboard/calendar",  label: "Calendar",  icon: Calendar,      feature: "hasScheduling", minPlan: "starter" },
        ],
    },
    {
        title: null,
        items: [
            { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, feature: "hasAnalytics", minPlan: "pro" },
            { href: "/dashboard/settings",  label: "Settings",  icon: Settings,  feature: null },
        ],
    },
];

const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    free:       { bg: "rgba(255,255,255,0.06)", text: "#8B9BB4",   border: "rgba(255,255,255,0.10)" },
    starter:    { bg: "rgba(59,130,246,0.10)",  text: "#3B82F6",   border: "rgba(59,130,246,0.25)"  },
    pro:        { bg: "rgba(249,115,22,0.12)",  text: "#F97316",   border: "rgba(249,115,22,0.25)"  },
    enterprise: { bg: "rgba(139,92,246,0.12)",  text: "#8B5CF6",   border: "rgba(139,92,246,0.25)"  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [activeBlog, setActiveBlog] = useState<any>(null);
    const [loadingBlogs, setLoadingBlogs] = useState(false);
    const [showSignOutDialog, setShowSignOutDialog] = useState(false);

    const currentPlan = profile?.plan?.name || "free";

    useEffect(() => { if (user) fetchBlogs(); }, [user]);

    const fetchBlogs = async () => {
        try {
            setLoadingBlogs(true);
            const res = await fetch("/api/blogs");
            const data = await res.json();
            if (data.blogs) {
                setBlogs(data.blogs);
                const def = data.blogs.find((b: any) => b.isDefault) || data.blogs[0];
                setActiveBlog(def);
            }
        } catch (e) {
            console.error("Failed to fetch blogs:", e);
        } finally {
            setLoadingBlogs(false);
        }
    };

    const handleSwitchBlog = async (blogId: string) => {
        const updated = blogs.map(b => ({ ...b, isDefault: b.id === blogId }));
        setBlogs(updated);
        setActiveBlog(updated.find(b => b.id === blogId) || null);
        try {
            await fetch("/api/blogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blogId }) });
        } catch { fetchBlogs(); }
    };

    const handleSignOut = async () => {
        await signOut();
        setShowSignOutDialog(false);
        router.push("/");
    };

    const currentGate = getFeatureGate(pathname);
    const isCurrentRouteBlocked = currentGate?.requiredFeature
        ? !isFeatureAvailable(currentPlan, currentGate.requiredFeature)
        : false;

    useEffect(() => {
        if (!loading && !user) router.replace("/auth/login");
    }, [loading, user, router]);

    const handleSelectFreePlan = async () => {
        const res = await fetch("/api/user/select-plan", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planName: "free" }),
        });
        if (res.ok) window.location.reload();
    };

    /* ── Loading ── */
    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-space)" }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--brand-orange)", borderTopColor: "transparent" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
                </div>
            </div>
        );
    }

    /* ── Plan selection wall ── */
    if (profile && !profile.planSelected) {
        return (
            <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-space)" }}>
                <div className="max-w-2xl mx-auto px-4 text-center">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                        style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.25)" }}
                    >
                        <Crown className="w-8 h-8" style={{ color: "var(--brand-orange)" }} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                        Choose Your Plan
                    </h1>
                    <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                        Select a plan to get started. Upgrade or change any time.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                        <div
                            className="rounded-xl p-5 text-left transition-all hover:border-orange-500/30"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
                        >
                            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Free</h3>
                            <div className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                                $0<span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>/mo</span>
                            </div>
                            <ul className="space-y-1.5 mb-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                                {["5 articles/month", "1 blog connected", "Basic SEO tools"].map(f => (
                                    <li key={f} className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />{f}
                                    </li>
                                ))}
                            </ul>
                            <Button onClick={handleSelectFreePlan} className="w-full text-sm btn-ghost">
                                Start Free
                            </Button>
                        </div>
                        <div
                            className="rounded-xl p-5 text-left relative"
                            style={{ background: "var(--bg-card)", border: "1px solid rgba(249,115,22,0.35)", boxShadow: "0 0 30px rgba(249,115,22,0.08)" }}
                        >
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                                <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: "var(--brand-orange)", color: "#fff" }}>
                                    Recommended
                                </span>
                            </div>
                            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Starter & Pro</h3>
                            <div className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                                $12<span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>+/mo</span>
                            </div>
                            <ul className="space-y-1.5 mb-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                                {["More articles & images", "Bulk gen & scheduling", "All Pro tools"].map(f => (
                                    <li key={f} className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: "var(--brand-orange)" }} />{f}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/pricing">
                                <Button className="w-full text-sm btn-primary">View Plans</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const planStyle = PLAN_COLORS[currentPlan] || PLAN_COLORS.free;
    const userName = profile?.name || profile?.email?.split("@")[0] || "User";
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-space)" }}>

            {/* ── SIDEBAR ── */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-40 h-full w-60 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
                style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)", flexShrink: 0 }}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-14 px-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg btn-primary flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                            BloggerSEO
                        </span>
                    </Link>
                    <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)} style={{ color: "var(--text-muted)" }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
                    {NAV_SECTIONS.map((section, si) => (
                        <div key={si} className={section.title ? "mt-4 first:mt-0" : ""}>
                            {section.title && (
                                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                                    {section.title}
                                </div>
                            )}
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                                const isLocked = item.feature ? !isFeatureAvailable(currentPlan, item.feature) : false;
                                return (
                                    <Link key={item.href} href={isLocked ? "/pricing" : item.href}>
                                        <div
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group"
                                            style={
                                                isActive
                                                    ? { background: "rgba(249,115,22,0.12)", color: "var(--brand-orange)", borderLeft: "2px solid var(--brand-orange)" }
                                                    : isLocked
                                                        ? { color: "var(--text-muted)", paddingLeft: "14px" }
                                                        : { color: "var(--text-secondary)", paddingLeft: "14px" }
                                            }
                                        >
                                            <item.icon
                                                className="w-3.5 h-3.5 flex-shrink-0"
                                                style={{
                                                    color: isActive ? "var(--brand-orange)" : isLocked ? "rgba(139,155,180,0.3)" : "rgba(139,155,180,0.6)",
                                                }}
                                            />
                                            <span className={isLocked ? "opacity-50" : ""}>{item.label}</span>
                                            {isLocked ? (
                                                <Lock className="w-2.5 h-2.5 ml-auto" style={{ color: "#8B5CF6", opacity: 0.6 }} />
                                            ) : isActive ? (
                                                <ChevronRight className="w-3 h-3 ml-auto" style={{ color: "var(--brand-orange)" }} />
                                            ) : null}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Credits */}
                {profile?.credits && (
                    <div className="px-3 pb-2">
                        <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Credits</span>
                                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {profile.credits.remaining}/{profile.credits.total}
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${Math.min(100, profile.credits.percentUsed)}%`,
                                        background: profile.credits.percentUsed > 80 ? "#ef4444" : profile.credits.percentUsed > 50 ? "#f59e0b" : "linear-gradient(90deg,#F97316,#FB923C)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Upgrade CTA */}
                {currentPlan === "free" && (
                    <div className="px-3 pb-2">
                        <Link href="/pricing">
                            <div
                                className="p-3 rounded-xl cursor-pointer transition-all hover:brightness-110"
                                style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)" }}
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Crown className="w-3 h-3" style={{ color: "var(--brand-orange)" }} />
                                    <span className="text-[11px] font-semibold" style={{ color: "var(--brand-orange)" }}>Upgrade Plan</span>
                                </div>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    Unlock bulk gen, campaigns & more
                                </p>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0 12px" }} />

                {/* User */}
                <div className="p-3">
                    <div
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}
                    >
                        <Link href="/dashboard/profile">
                            <Avatar className="w-7 h-7 cursor-pointer">
                                <AvatarFallback
                                    className="text-white text-xs font-semibold"
                                    style={{ background: "linear-gradient(135deg, #F97316, #8B5CF6)", fontSize: "11px" }}
                                >
                                    {userInitial}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                                {userName}
                            </p>
                            <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: planStyle.bg, color: planStyle.text, border: `1px solid ${planStyle.border}` }}
                            >
                                {profile?.plan?.displayName || "Free Plan"}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowSignOutDialog(true)}
                            className="p-1 transition-colors rounded"
                            title="Sign out"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top bar */}
                <header
                    className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 lg:px-6 gap-4"
                    style={{ background: "rgba(5,9,18,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border-subtle)" }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            className="lg:hidden p-2 rounded-lg transition-colors"
                            style={{ color: "var(--text-secondary)" }}
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1
                            className="text-sm font-semibold capitalize whitespace-nowrap hidden sm:block"
                            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                        >
                            {NAV_ITEMS.find(i => pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href)))?.label || "Dashboard"}
                        </h1>
                    </div>

                    {/* Blog switcher */}
                    <div className="flex-1 flex justify-center max-w-xs">
                        {blogs.length > 0 ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    className="inline-flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-medium transition-all outline-none"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-glass)", color: "var(--text-secondary)" }}
                                >
                                    <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--brand-orange)" }} />
                                    <span className="truncate max-w-[140px]">{activeBlog?.name || "Select Blog"}</span>
                                    <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-50" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="center"
                                    className="w-60"
                                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-glass)" }}
                                >
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                                        Your Blogs
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator style={{ background: "var(--border-subtle)" }} />
                                    {blogs.map(blog => (
                                        <DropdownMenuItem
                                            key={blog.id}
                                            className="flex flex-col items-start gap-0.5 p-2 cursor-pointer"
                                            onClick={() => handleSwitchBlog(blog.id)}
                                            style={{ color: "var(--text-primary)" }}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-medium truncate">{blog.name}</span>
                                                {blog.isDefault && <Check className="w-3 h-3" style={{ color: "var(--brand-orange)" }} />}
                                            </div>
                                            <span className="text-[10px] truncate w-full" style={{ color: "var(--text-muted)" }}>{blog.url}</span>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator style={{ background: "var(--border-subtle)" }} />
                                    <DropdownMenuItem className="p-0">
                                        <Link href="/dashboard/settings" className="w-full text-center text-xs py-2 block" style={{ color: "var(--brand-orange)" }}>
                                            Manage Blogs
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : loadingBlogs ? (
                            <div className="h-8 px-3 flex items-center gap-2 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}>
                                <div className="w-3.5 h-3.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                                <div className="w-20 h-2.5 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
                            </div>
                        ) : (
                            <Link href="/dashboard/settings">
                                <button className="text-xs font-medium px-3 h-8 rounded-lg transition-colors" style={{ color: "var(--brand-orange)", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.20)" }}>
                                    + Connect Blog
                                </button>
                            </Link>
                        )}
                    </div>

                    <Link href="/dashboard/new">
                        <Button size="sm" className="btn-primary h-8 px-4 text-xs gap-1.5">
                            <PenTool className="w-3 h-3" /> New Article
                        </Button>
                    </Link>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ background: "var(--bg-space)" }}>
                    {isCurrentRouteBlocked ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                                style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.22)" }}
                            >
                                <Lock className="w-8 h-8" style={{ color: "var(--brand-orange)" }} />
                            </div>
                            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                                {currentGate?.label} requires{" "}
                                <span className="gradient-text">
                                    {currentGate?.minPlan === "enterprise" ? "Enterprise" : currentGate?.minPlan === "starter" ? "Starter" : "Pro"}
                                </span>
                            </h2>
                            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                                Upgrade your plan to unlock this feature.
                            </p>
                            <Link href="/pricing">
                                <Button className="btn-primary gap-2">
                                    <Crown className="w-4 h-4" /> View Plans
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ErrorBoundary>{children}</ErrorBoundary>
                    )}
                </main>
            </div>

            {/* Sign-out dialog */}
            <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
                <AlertDialogContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-glass)" }}>
                    <AlertDialogHeader>
                        <AlertDialogTitle style={{ color: "var(--text-primary)" }}>Sign out?</AlertDialogTitle>
                        <AlertDialogDescription style={{ color: "var(--text-secondary)" }}>
                            You&apos;ll need to sign in again to access your dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSignOut}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            Sign Out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
            )}
        </div>
    );
}
