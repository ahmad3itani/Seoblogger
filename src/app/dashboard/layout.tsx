"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import { isFeatureAvailable, FEATURE_GATES } from "@/lib/supabase/plan-gates";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
    Sparkles,
    LayoutDashboard,
    PenTool,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Megaphone,
    RefreshCw,
    Layers,
    Network,
    CalendarClock,
    Calendar,
    Lightbulb,
    Globe,
    ChevronDown,
    Check,
    TrendingUp,
    BarChart3,
    Lock,
    Crown,
    User,
    Activity,
    Link as LinkIcon,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: null },
    { href: "/dashboard/new", label: "New Article", icon: PenTool, feature: null },
    { href: "/dashboard/keywords", label: "Keyword Research", icon: TrendingUp, feature: null },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, feature: "hasAnalytics", minPlan: "pro" },
    { href: "/dashboard/bulk", label: "Bulk Generator", icon: Layers, feature: "hasBulkGeneration", minPlan: "pro" },
    { href: "/dashboard/ideas", label: "Trend Ideas", icon: Lightbulb, feature: "hasTrendIdeas", minPlan: "pro" },
    { href: "/dashboard/clustering", label: "Auto Clustering", icon: Network, feature: "hasAutoClustering", minPlan: "pro" },
    { href: "/dashboard/campaigns", label: "Campaigns", icon: CalendarClock, feature: "hasScheduling", minPlan: "pro" },
    { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, feature: "hasScheduling", minPlan: "pro" },
    { href: "/dashboard/articles", label: "My Articles", icon: FileText, feature: null },
    { href: "/dashboard/audit/full", label: "Advanced Site Audit", icon: Activity, feature: null },
    { href: "/dashboard/refresh", label: "Content Refresh", icon: RefreshCw, feature: "hasContentRefresh", minPlan: "pro" },
    { href: "/dashboard/linker", label: "Internal Linker", icon: LinkIcon, feature: null },
    { href: "/dashboard/brand-voice", label: "Brand Voices", icon: Megaphone, feature: null },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, feature: null },
    { href: "/dashboard/profile", label: "Profile", icon: User, feature: null },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [blogs, setBlogs] = useState<any[]>([]);
    const [activeBlog, setActiveBlog] = useState<any>(null);
    const [loadingBlogs, setLoadingBlogs] = useState(false);

    const currentPlan = profile?.plan?.name || "free";

    useEffect(() => {
        if (user) {
            fetchBlogs();
        }
    }, [user]);

    const fetchBlogs = async () => {
        try {
            setLoadingBlogs(true);
            const res = await fetch("/api/blogs");
            const data = await res.json();
            if (data.blogs) {
                setBlogs(data.blogs);
                const defaultBlog = data.blogs.find((b: any) => b.isDefault) || data.blogs[0];
                setActiveBlog(defaultBlog);
            }
        } catch (error) {
            console.error("Failed to fetch blogs in layout:", error);
        } finally {
            setLoadingBlogs(false);
        }
    };

    const handleSwitchBlog = async (blogId: string) => {
        try {
            const res = await fetch("/api/blogs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blogId }),
            });
            if (res.ok) {
                fetchBlogs();
            }
        } catch (error) {
            console.error("Failed to switch blog:", error);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth/login");
    };

    // Check if current route is feature-gated and blocked
    const currentGate = FEATURE_GATES.find(
        (g) => pathname === g.route || (g.route !== "/dashboard" && pathname.startsWith(g.route + "/"))
    );
    const isCurrentRouteBlocked = currentGate?.requiredFeature
        ? !isFeatureAvailable(currentPlan, currentGate.requiredFeature)
        : false;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#FF6600] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const planBadgeColor: Record<string, string> = {
        free: "bg-gray-100 text-gray-600 border-gray-200",
        starter: "bg-blue-50 text-blue-600 border-blue-200",
        pro: "bg-orange-50 text-[#FF6600] border-orange-200",
        enterprise: "bg-amber-50 text-amber-600 border-amber-200",
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
            >
                {/* Logo - Blogger style */}
                <div className="flex items-center justify-between h-14 px-4 bg-[#FF6600]">
                    <Link href="/" className="flex items-center gap-2">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.976 24H2.026C.9 24 0 23.1 0 21.976V2.026C0 .9.9 0 2.025 0H22.05C23.1 0 24 .9 24 2.025v19.95C24 23.1 23.1 24 21.976 24zM12 3.975H9c-2.775 0-5.025 2.25-5.025 5.025v6c0 2.774 2.25 5.024 5.025 5.024h6c2.774 0 5.024-2.25 5.024-5.024v-3c0-.6-.45-1.05-1.05-1.05h-3.975c-.6 0-1.05-.45-1.05-1.05V6.975c0-.6-.45-1.05-1.05-1.05H12z" />
                        </svg>
                        <span className="text-base font-semibold text-white">Blogger</span>
                    </Link>
                    <button
                        className="lg:hidden p-1 text-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/dashboard" && pathname.startsWith(item.href));

                        const isLocked = item.feature
                            ? !isFeatureAvailable(currentPlan, item.feature)
                            : false;

                        return (
                            <Link
                                key={item.href}
                                href={isLocked ? "/pricing" : item.href}
                                title={isLocked ? `Upgrade to ${item.minPlan || "Pro"} to unlock` : ""}
                            >
                                <div
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group ${isActive
                                        ? "bg-[#FFF4E6] text-[#FF6600] border-l-4 border-[#FF6600]"
                                        : isLocked
                                            ? "text-gray-400 hover:text-gray-500 hover:bg-gray-50"
                                            : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                                        }`}
                                >
                                    <item.icon
                                        className={`w-4 h-4 ${isActive
                                            ? "text-[#FF6600]"
                                            : isLocked
                                                ? "text-sidebar-foreground/20"
                                                : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                                            }`}
                                    />
                                    <span className={isLocked ? "opacity-50" : ""}>{item.label}</span>
                                    {isLocked ? (
                                        <Lock className="w-3 h-3 ml-auto text-amber-500/60" />
                                    ) : isActive ? (
                                        <ChevronRight className="w-3 h-3 ml-auto text-[#FF6600]" />
                                    ) : null}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Upgrade CTA for free users */}
                {currentPlan === "free" && (
                    <div className="px-3 pb-2">
                        <Link href="/pricing">
                            <div className="p-3 rounded-lg bg-gradient-to-br from-[#FF6600]/10 to-indigo-500/10 border border-[#FF6600]/20 hover:border-[#FF6600]/40 transition-colors cursor-pointer">
                                <div className="flex items-center gap-2 mb-1">
                                    <Crown className="w-3.5 h-3.5 text-[#FF6600]" />
                                    <span className="text-xs font-semibold text-[#FF6600]">Upgrade to Pro</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Unlock analytics, bulk gen, campaigns & more
                                </p>
                            </div>
                        </Link>
                    </div>
                )}

                <Separator className="bg-sidebar-border" />

                {/* User section */}
                <div className="p-4">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg glass-card">
                        <Link href="/dashboard/profile">
                            <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-[#FF6600]/50 transition-all">
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-[#FF6600] text-white text-xs">
                                    {(profile?.name || profile?.email || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                                {profile?.name || profile?.email?.split("@")[0] || "User"}
                            </p>
                            <Badge className={`text-[9px] px-1.5 py-0 h-4 ${planBadgeColor[currentPlan] || planBadgeColor.free}`}>
                                {profile?.plan?.displayName || "Free Plan"}
                            </Badge>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F5F5F5]">
                {/* Top bar - Blogger style */}
                <header className="sticky top-0 z-30 h-14 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200 bg-white shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base font-semibold text-gray-900 capitalize whitespace-nowrap hidden sm:block">
                            {NAV_ITEMS.find(
                                (item) =>
                                    pathname === item.href ||
                                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                            )?.label || "Dashboard"}
                        </h1>
                    </div>

                    {/* Blog Switcher */}
                    <div className="flex-1 flex justify-center max-w-sm">
                        {blogs.length > 0 ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-50 h-9 px-3 gap-2 bg-white border border-gray-200 max-w-full">
                                    <Globe className="w-4 h-4 text-[#FF6600] shrink-0" />
                                    <span className="text-xs font-medium truncate text-gray-700">
                                        {activeBlog?.name || "Select Blog"}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-64 bg-white border-gray-200">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-[10px] text-gray-500 uppercase tracking-wider px-2 py-1.5">
                                            Your Blogs
                                        </DropdownMenuLabel>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator className="bg-gray-200" />
                                    {blogs.map((blog) => (
                                        <DropdownMenuItem
                                            key={blog.id}
                                            className="flex flex-col items-start gap-1 p-2 cursor-pointer focus:bg-gray-50"
                                            onClick={() => handleSwitchBlog(blog.id)}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-sm font-medium truncate text-gray-900">{blog.name}</span>
                                                {blog.isDefault && (
                                                    <Check className="w-3 h-3 text-[#FF6600]" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 truncate w-full">
                                                {blog.url}
                                            </span>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator className="bg-gray-200" />
                                    <DropdownMenuItem className="p-0">
                                        <Link href="/dashboard/settings" className="w-full text-center text-xs text-[#FF6600] hover:text-[#FF8533] py-2 cursor-pointer block">
                                            Manage Blogs
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : loadingBlogs ? (
                            <div className="h-9 px-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md animate-pulse">
                                <div className="w-4 h-4 rounded-full bg-gray-200" />
                                <div className="w-24 h-3 bg-gray-200 rounded" />
                            </div>
                        ) : (
                            <Link href="/dashboard/settings">
                                <Button variant="ghost" size="sm" className="h-9 px-3 gap-2 text-[#FF6600] hover:text-[#FF8533] hover:bg-orange-50">
                                    Connect Blog
                                </Button>
                            </Link>
                        )}
                    </div>

                    <Link href="/dashboard/new">
                        <Button size="sm" className="bg-[#FF6600] hover:bg-[#FF8533] text-white border-0 shadow-sm">
                            <PenTool className="w-3.5 h-3.5 mr-1.5" />
                            New Article
                        </Button>
                    </Link>
                </header>

                {/* Page content - show upgrade wall if feature is blocked */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F5F5F5]">
                    {isCurrentRouteBlocked ? (
                        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6600]/10 to-indigo-500/10 flex items-center justify-center mb-6 border border-[#FF6600]/20">
                                <Lock className="w-8 h-8 text-[#FF6600]" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">
                                {currentGate?.label} requires{" "}
                                <span className="gradient-text">
                                    {currentGate?.minPlan === "enterprise" ? "Enterprise" : "Pro"}
                                </span>
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                Upgrade your plan to unlock {currentGate?.label?.toLowerCase()} and other premium features.
                            </p>
                            <Link href="/pricing">
                                <Button className="glow-button text-white border-0 gap-2">
                                    <Crown className="w-4 h-4" />
                                    View Plans & Upgrade
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ErrorBoundary>{children}</ErrorBoundary>
                    )}
                </main>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
