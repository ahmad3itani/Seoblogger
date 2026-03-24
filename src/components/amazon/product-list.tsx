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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                        {products.length} Product{products.length !== 1 ? 's' : ''} Selected
                    </span>
                    <span className="text-xs text-gray-500">
                        (min {minProducts}, max {maxProducts})
                    </span>
                </div>

                {/* Tier distribution */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Tiers:</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                        {tierCounts.budget} Budget
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        {tierCounts.midRange} Mid
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
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
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-400">
                        <strong>Tip:</strong> Including budget and premium options helps capture more search traffic.
                        {tierCounts.budget === 0 && " Consider adding a budget-friendly option."}
                        {tierCounts.premium === 0 && " Consider adding a premium option."}
                    </p>
                </div>
            )}
        </div>
    );
}
