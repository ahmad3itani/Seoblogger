"use client";

import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface IntentBadgeProps {
    intent: 'informational' | 'commercial' | 'transactional';
    confidence: 'high' | 'medium' | 'low';
    isAffiliateReady: boolean;
    suggestion?: string;
    colors: {
        bg: string;
        text: string;
        border: string;
    };
    description: string;
    showDetails?: boolean;
}

export function IntentBadge({
    intent,
    confidence,
    isAffiliateReady,
    suggestion,
    colors,
    description,
    showDetails = true,
}: IntentBadgeProps) {
    const Icon = isAffiliateReady ? CheckCircle : AlertCircle;

    const intentLabel = {
        informational: 'Informational',
        commercial: 'Commercial',
        transactional: 'Transactional',
    }[intent];

    return (
        <div className="space-y-3">
            {/* Main badge */}
            <div className="flex items-center gap-3 flex-wrap">
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transition-all hover:scale-105"
                    style={{
                        background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}80 100%)`,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <Icon className="w-5 h-5" />
                    <span>{intentLabel} Intent</span>
                </div>

                {/* Confidence indicator */}
                <div className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)"
                }}>
                    {confidence} confidence
                </div>
            </div>

            {/* Details */}
            {showDetails && (
                <div className="pl-1">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{description}</p>

                    {/* Warning for informational intent */}
                    {!isAffiliateReady && suggestion && (
                        <div className="mt-3 flex items-start gap-3 p-3 rounded-xl" style={{
                            background: "linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(234, 179, 8, 0.06) 100%)",
                            border: "1px solid rgba(234, 179, 8, 0.25)"
                        }}>
                            <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#EAB308" }} />
                            <p className="text-sm leading-relaxed" style={{ color: "#FDE047" }}>{suggestion}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Compact version for inline use
 */
export function IntentBadgeCompact({
    intent,
    colors,
}: Pick<IntentBadgeProps, 'intent' | 'colors'>) {
    const Icon = intent === 'informational' ? AlertCircle : CheckCircle;

    const intentLabel = {
        informational: 'Info',
        commercial: 'Commercial',
        transactional: 'Buy Intent',
    }[intent];

    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{
                backgroundColor: colors.bg,
                color: colors.text,
            }}
        >
            <Icon className="w-3 h-3" />
            {intentLabel}
        </span>
    );
}
