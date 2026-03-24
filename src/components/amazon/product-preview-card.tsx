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
        <div className="group relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl" style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
            border: "1px solid var(--border-subtle)",
        }}>
            {/* Drag handle */}
            {draggable && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                </div>
            )}

            <div className={`${draggable ? 'ml-6' : ''}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{
                            background: "linear-gradient(135deg, rgba(255, 153, 0, 0.15) 0%, rgba(255, 153, 0, 0.08) 100%)",
                            color: "#FF9900",
                            border: "1px solid rgba(255, 153, 0, 0.2)"
                        }}>
                            {index + 1}
                        </div>
                        {isFirst && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
                                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%)",
                                color: "#22C55E",
                                border: "1px solid rgba(34, 197, 94, 0.25)"
                            }}>
                                ⭐ Top Pick
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
                <h4 className="font-semibold text-base mb-3 leading-snug group-hover:text-orange-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                    {product.name}
                </h4>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255, 153, 0, 0.08)", border: "1px solid rgba(255, 153, 0, 0.15)" }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Price:</span>
                        <span className="text-sm font-bold" style={{ color: "#FF9900" }}>{product.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.15)" }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Rating:</span>
                        <span className="text-sm font-bold" style={{ color: "#EAB308" }}>⭐ {product.rating}</span>
                    </div>
                </div>

                {/* Best for */}
                <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(108, 76, 241, 0.05)", border: "1px solid rgba(108, 76, 241, 0.1)" }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1 font-semibold" style={{ color: "var(--text-muted)" }}>Best For</div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{product.bestFor}</p>
                </div>

                {/* Key features */}
                {product.keyFeatures && product.keyFeatures.length > 0 && (
                    <div className="mb-4">
                        <div className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: "var(--text-muted)" }}>Key Features</div>
                        <div className="flex flex-wrap gap-2">
                            {product.keyFeatures.slice(0, 4).map((feature, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.04)",
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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{
                            background: "linear-gradient(135deg, rgba(255, 153, 0, 0.15) 0%, rgba(255, 153, 0, 0.08) 100%)",
                            color: "#FF9900",
                            border: "1px solid rgba(255, 153, 0, 0.25)"
                        }}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on Amazon
                    </a>
                )}
            </div>
        </div>
    );
}
