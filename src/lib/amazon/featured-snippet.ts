/**
 * Amazon Affiliate Featured Snippet Generator
 *
 * Generates the "Quick Answer" section that targets
 * Google's featured snippet position (Position 0).
 */

import type { AmazonProduct } from './generate';
import { getProductTier } from './comparison-table';

export interface FeaturedSnippetOptions {
  keyword: string;
  products: AmazonProduct[];
  niche: string;
  year?: number;
}

/**
 * Generate a featured snippet HTML block
 *
 * This appears at the TOP of the article, right after disclosure.
 * Optimized for Google's featured snippet extraction.
 */
export function generateFeaturedSnippet(options: FeaturedSnippetOptions): string {
  const { keyword, products, niche, year = new Date().getFullYear() } = options;

  if (products.length === 0) {
    return '';
  }

  // Find the top pick and budget pick
  const topPick = products[0];
  const budgetPick = products.find(p => {
    const tier = getProductTier(p.priceRange);
    return tier.tier === 'budget';
  }) || products[products.length - 1]; // Fallback to last if no explicit budget

  // Build the featured snippet HTML with conversion badges
  const editorChoiceBadge = '<span style="display: inline-block; background: #22C55E; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 4px; vertical-align: middle;">Editor\'s Choice</span>';
  const bestValueBadge = '<span style="display: inline-block; background: #3B82F6; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 4px; vertical-align: middle;">Best Value</span>';

  const topPickLink = topPick.affiliateUrl
    ? `${editorChoiceBadge}<a href="${topPick.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored" style="color: #FF9900; text-decoration: none; font-weight: 600;">${topPick.name}</a>`
    : `${editorChoiceBadge}${topPick.name}`;

  const budgetPickLink = budgetPick.affiliateUrl && budgetPick !== topPick
    ? `${bestValueBadge}<a href="${budgetPick.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored" style="color: #3B82F6; text-decoration: none; font-weight: 600;">${budgetPick.name}</a>`
    : budgetPick !== topPick ? `${bestValueBadge}${budgetPick.name}` : budgetPick.name;

  // Extract key feature from top pick
  const topFeature = topPick.keyFeatures?.[0] || 'excellent performance';

  return `
<div class="featured-snippet" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #FF9900; border-radius: 8px; padding: 1.25rem 1.5rem; margin: 1.5rem 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
  <p style="margin: 0 0 0.75rem 0; font-size: 1.1rem; line-height: 1.6;">
    <strong>🏆 Quick Answer:</strong> The best ${keyword} in ${year} is the ${topPickLink}, offering ${topFeature.toLowerCase()} at <strong>${topPick.priceRange}</strong>.
  </p>
  ${budgetPick !== topPick ? `<p style="margin: 0; font-size: 1rem; line-height: 1.5; color: #555;">💰 <strong>Budget Alternative:</strong> The ${budgetPickLink} delivers great value at just <strong>${budgetPick.priceRange}</strong>.</p>` : ''}
</div>
`.trim();
}

/**
 * Generate a quick verdict section for the conclusion
 */
export function generateQuickVerdict(products: AmazonProduct[], keyword: string): string {
  if (products.length === 0) return '';

  const topPick = products[0];
  const budgetPick = products.find(p => getProductTier(p.priceRange).tier === 'budget');
  const premiumPick = products.find(p => getProductTier(p.priceRange).tier === 'premium');

  const verdicts: string[] = [];

  // Conversion badges
  const editorsChoiceBadge = '<span style="display: inline-block; background: #22C55E; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">Editor\'s Choice</span>';
  const bestValueBadge = '<span style="display: inline-block; background: #3B82F6; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">Best Value</span>';
  const premiumBadge = '<span style="display: inline-block; background: #A855F7; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">Premium</span>';

  // Top pick (Editor's Choice)
  if (topPick) {
    verdicts.push(`<p style="margin: 0.5rem 0;"><strong>🥇 Best Overall:</strong> ${editorsChoiceBadge}<a href="${topPick.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored" style="color: #FF9900; font-weight: 600;">${topPick.name}</a> – ${topPick.bestFor}</p>`);
  }

  // Budget pick (Best Value)
  if (budgetPick && budgetPick !== topPick) {
    verdicts.push(`<p style="margin: 0.5rem 0;"><strong>💰 Best Budget:</strong> ${bestValueBadge}<a href="${budgetPick.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored" style="color: #3B82F6; font-weight: 600;">${budgetPick.name}</a> – Great value at ${budgetPick.priceRange}</p>`);
  }

  // Premium pick
  if (premiumPick && premiumPick !== topPick) {
    verdicts.push(`<p style="margin: 0.5rem 0;"><strong>✨ Best Premium:</strong> ${premiumBadge}<a href="${premiumPick.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored" style="color: #A855F7; font-weight: 600;">${premiumPick.name}</a> – ${premiumPick.bestFor}</p>`);
  }

  if (verdicts.length === 0) return '';

  return `
<div class="quick-verdict" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 1.5rem 0; border: 1px solid #fbbf24;">
  <h3 style="margin-top: 0; margin-bottom: 1rem; color: #92400e; font-size: 1.1rem;">📋 Final Verdict — Our Top Picks</h3>
  ${verdicts.join('\n  ')}
  <p style="margin: 1rem 0 0 0; padding-top: 0.75rem; border-top: 1px solid rgba(146,64,14,0.2); font-size: 0.9rem; color: #78350f;"><strong>Pro tip:</strong> Prices and availability may change. Click the links above to check current deals on Amazon.</p>
</div>
`.trim();
}

/**
 * Generate trust section ("Why Trust This Guide?")
 */
export function generateTrustSection(productCount: number, niche: string): string {
  return `
<div class="trust-section" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 8px; padding: 1.25rem 1.5rem; margin: 2rem 0;">
  <h3 style="margin-top: 0; color: #2e7d32;">🔍 Why Trust This Guide?</h3>
  <p style="margin-bottom: 0.5rem;">We analyzed <strong>${productCount}+ products</strong> in the ${niche} category, comparing features, prices, and thousands of user reviews. Our recommendations prioritize real value—not just popularity or brand recognition.</p>
  <p style="margin-bottom: 0; font-size: 0.9rem; color: #555;"><em>Disclosure: As an Amazon Associate, we earn from qualifying purchases. This comes at no extra cost to you and helps support our research.</em></p>
</div>
`.trim();
}

/**
 * Generate a "TL;DR" box for quick readers
 */
export function generateTLDR(products: AmazonProduct[], keyword: string): string {
  if (products.length < 3) return '';

  const top3 = products.slice(0, 3);

  const items = top3.map((p, i) => {
    const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    return `<li>${emoji} <strong><a href="${p.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored">${p.name}</a></strong> – ${p.bestFor}</li>`;
  }).join('\n');

  return `
<div class="tldr-box" style="background: #e3f2fd; border-radius: 8px; padding: 1rem 1.5rem; margin: 1.5rem 0;">
  <h4 style="margin-top: 0; color: #1565c0;">⚡ TL;DR – Top 3 ${keyword}</h4>
  <ol style="margin-bottom: 0; padding-left: 1rem;">
    ${items}
  </ol>
</div>
`.trim();
}
