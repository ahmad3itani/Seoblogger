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
        <div className="group relative bg-[#111827] border border-[#1e293b] rounded-lg p-4 hover:border-[#4F8EFF]/30 transition-colors">
            {/* Drag handle */}
            {draggable && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                </div>
            )}

            <div className={`${draggable ? 'ml-6' : ''}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                        {isFirst && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
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
                <h4 className="font-medium text-white mb-2 leading-tight">{product.name}</h4>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                    <div className="flex items-center gap-1">
                        <span className="text-gray-500">Price:</span>
                        <span className="text-orange-400 font-medium">{product.priceRange}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-gray-500">Rating:</span>
                        <span className="text-yellow-400">⭐ {product.rating}</span>
                    </div>
                </div>

                {/* Best for */}
                <p className="text-sm text-gray-400 mb-3">
                    <span className="text-gray-500">Best for:</span> {product.bestFor}
                </p>

                {/* Key features */}
                {product.keyFeatures && product.keyFeatures.length > 0 && (
                    <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Key Features:</p>
                        <div className="flex flex-wrap gap-1">
                            {product.keyFeatures.slice(0, 4).map((feature, i) => (
                                <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-[#1e293b] text-gray-400 text-xs"
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
                        className="inline-flex items-center gap-1 text-xs text-[#4F8EFF] hover:text-[#6ba3ff] transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                        View on Amazon
                    </a>
                )}
            </div>
        </div>
    );
}
