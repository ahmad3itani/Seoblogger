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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium"
                    style={{
                        background: isAffiliateReady ? "var(--brand-accent)" : "var(--brand-warning)",
                        color: "white",
                    }}
                >
                    <Icon className="w-4 h-4" />
                    <span>{intentLabel} Intent</span>
                </div>

                {/* Confidence indicator */}
                <div className="px-3 py-1.5 rounded-md text-xs font-medium" style={{
                    background: "var(--bg-surface)",
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
                        <div className="mt-3 flex items-start gap-3 p-3 rounded-md" style={{
                            background: "var(--bg-surface)",
                            borderLeft: "3px solid var(--brand-warning)"
                        }}>
                            <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--brand-warning)" }} />
                            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{suggestion}</p>
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
