"use client";

import { GripVertical, Trash2, ExternalLink } from "lucide-react";
import type { AmazonProduct } from "@/lib/amazon/generate";

interface ProductPreviewCardProps {
    product: AmazonProduct;
    index: number;
    onRemove?: (index: number) => void;
    onMoveUp?: (index: number) => void;
    onMoveDown?: (index: number) => void;
    isFirst?: boolean;
    isLast?: boolean;
    draggable?: boolean;
}

export function ProductPreviewCard({
    product,
    index,
    onRemove,
    onMoveUp,
    onMoveDown,
    isFirst = false,
    isLast = false,
    draggable = false,
}: ProductPreviewCardProps) {
    const tierBadge = product.tierLabel && product.tierColor ? (
        <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
                backgroundColor: `${product.tierColor}22`,
                color: product.tierColor,
            }}
        >
            {product.tierLabel}
        </span>
    ) : null;

    return (
        <div className="group relative rounded-lg p-5 transition-all" style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 1px 3px rgba(28, 25, 23, 0.04)",
        }}>
            {/* Drag handle */}
            {draggable && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                </div>
            )}

            <div className={`${draggable ? 'ml-6' : ''}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold" style={{
                            background: "var(--brand-primary)",
                            color: "white",
                        }}>
                            {index + 1}
                        </div>
                        {isFirst && (
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium" style={{
                                background: "var(--brand-accent)",
                                color: "white",
                            }}>
                                Top Pick
                            </span>
                        )}
                        {tierBadge}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isFirst && onMoveUp && (
                            <button
                                onClick={() => onMoveUp(index)}
                                className="p-1 text-gray-500 hover:text-white transition-colors"
                                title="Move up"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </button>
                        )}
                        {!isLast && onMoveDown && (
                            <button
                                onClick={() => onMoveDown(index)}
                                className="p-1 text-gray-500 hover:text-white transition-colors"
                                title="Move down"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}
                        {onRemove && (
                            <button
                                onClick={() => onRemove(index)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                title="Remove"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Product name */}
                <h4 className="font-semibold text-base mb-4 leading-snug" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {product.name}
                </h4>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Price</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{product.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                        <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Rating</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>★ {product.rating}</span>
                    </div>
                </div>

                {/* Best for */}
                <div className="mb-4 p-3 rounded-md" style={{ background: "var(--bg-surface)", borderLeft: "3px solid var(--brand-primary)" }}>
                    <div className="text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Best For</div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{product.bestFor}</p>
                </div>

                {/* Key features */}
                {product.keyFeatures && product.keyFeatures.length > 0 && (
                    <div className="mb-4">
                        <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Key Features</div>
                        <div className="flex flex-wrap gap-2">
                            {product.keyFeatures.slice(0, 4).map((feature, i) => (
                                <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-md text-xs"
                                    style={{
                                        background: "var(--bg-surface)",
                                        color: "var(--text-secondary)",
                                        border: "1px solid var(--border-subtle)"
                                    }}
                                >
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Affiliate link preview */}
                {product.affiliateUrl && (
                    <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all"
                        style={{
                            background: "var(--brand-primary)",
                            color: "white",
                        }}
                    >
                        <ExternalLink className="w-4 h-4" />
                        View on Amazon
                    </a>
                )}
            </div>
        </div>
    );
}
