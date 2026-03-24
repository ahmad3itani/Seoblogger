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
        <div className="space-y-2">
            {/* Main badge */}
            <div className="flex items-center gap-2 flex-wrap">
                <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                    }}
                >
                    <Icon className="w-4 h-4" />
                    <span>{intentLabel} Intent</span>
                </div>

                {/* Confidence indicator */}
                <span className="text-xs text-gray-500">
                    {confidence} confidence
                </span>
            </div>

            {/* Details */}
            {showDetails && (
                <div className="pl-1">
                    <p className="text-sm text-gray-400">{description}</p>

                    {/* Warning for informational intent */}
                    {!isAffiliateReady && suggestion && (
                        <div className="mt-2 flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                            <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-400">{suggestion}</p>
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
