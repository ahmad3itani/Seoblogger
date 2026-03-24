"use client";

import { useState } from "react";
import { ProductPreviewCard } from "./product-preview-card";
import type { AmazonProduct } from "@/lib/amazon/generate";

interface ProductListProps {
    products: AmazonProduct[];
    onProductsChange: (products: AmazonProduct[]) => void;
    maxProducts?: number;
    minProducts?: number;
}

export function ProductList({
    products,
    onProductsChange,
    maxProducts = 10,
    minProducts = 1,
}: ProductListProps) {
    const handleRemove = (index: number) => {
        if (products.length <= minProducts) return;
        const newProducts = products.filter((_, i) => i !== index);
        onProductsChange(newProducts);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newProducts = [...products];
        [newProducts[index - 1], newProducts[index]] = [newProducts[index], newProducts[index - 1]];
        onProductsChange(newProducts);
    };

    const handleMoveDown = (index: number) => {
        if (index === products.length - 1) return;
        const newProducts = [...products];
        [newProducts[index], newProducts[index + 1]] = [newProducts[index + 1], newProducts[index]];
        onProductsChange(newProducts);
    };

    const tierCounts = {
        budget: products.filter(p => p.tier === 'budget').length,
        midRange: products.filter(p => p.tier === 'mid-range').length,
        premium: products.filter(p => p.tier === 'premium').length,
    };

    return (
        <div className="space-y-4">
            {/* Header with stats */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
                border: "1px solid var(--border-subtle)"
            }}>
                <div className="flex items-center gap-3">
                    <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                        {products.length} Product{products.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-subtle)"
                    }}>
                        {minProducts}-{maxProducts} range
                    </span>
                </div>

                {/* Tier distribution */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium" style={{ color: "var(--text-muted)" }}>Tiers:</span>
                    <span className="px-2.5 py-1 rounded-lg font-semibold" style={{
                        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%)",
                        color: "#22C55E",
                        border: "1px solid rgba(34, 197, 94, 0.2)"
                    }}>
                        {tierCounts.budget} Budget
                    </span>
                    <span className="px-2.5 py-1 rounded-lg font-semibold" style={{
                        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)",
                        color: "#3B82F6",
                        border: "1px solid rgba(59, 130, 246, 0.2)"
                    }}>
                        {tierCounts.midRange} Mid
                    </span>
                    <span className="px-2.5 py-1 rounded-lg font-semibold" style={{
                        background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.08) 100%)",
                        color: "#A855F7",
                        border: "1px solid rgba(168, 85, 247, 0.2)"
                    }}>
                        {tierCounts.premium} Premium
                    </span>
                </div>
            </div>

            {/* Product cards */}
            <div className="space-y-3">
                {products.map((product, index) => (
                    <ProductPreviewCard
                        key={`${product.name}-${index}`}
                        product={product}
                        index={index}
                        onRemove={products.length > minProducts ? handleRemove : undefined}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        isFirst={index === 0}
                        isLast={index === products.length - 1}
                        draggable={false}
                    />
                ))}
            </div>

            {/* Warning if no tier diversity */}
            {(tierCounts.budget === 0 || tierCounts.premium === 0) && products.length >= 3 && (
                <div className="p-4 rounded-xl flex items-start gap-3" style={{
                    background: "linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(234, 179, 8, 0.06) 100%)",
                    border: "1px solid rgba(234, 179, 8, 0.25)"
                }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                        background: "rgba(234, 179, 8, 0.15)"
                    }}>
                        <span className="text-lg">💡</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: "#EAB308" }}>Tier Diversity Tip</p>
                        <p className="text-sm leading-relaxed" style={{ color: "#FDE047" }}>
                            Including budget and premium options helps capture more search traffic.
                            {tierCounts.budget === 0 && " Consider adding a budget-friendly option."}
                            {tierCounts.premium === 0 && " Consider adding a premium option."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
