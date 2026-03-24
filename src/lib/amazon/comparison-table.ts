/**
 * Amazon Affiliate Comparison Table Generator
 *
 * Generates consistent, well-formatted comparison tables
 * instead of relying on AI (which is inconsistent).
 */

import type { AmazonProduct } from './generate';

export interface TableOptions {
  showRating?: boolean;
  showPrice?: boolean;
  showBestFor?: boolean;
  showCta?: boolean;
  ctaText?: string;
  highlightFirst?: boolean;
}

const defaultOptions: TableOptions = {
  showRating: true,
  showPrice: true,
  showBestFor: true,
  showCta: true,
  ctaText: 'Check Price →',
  highlightFirst: true,
};

/**
 * Generate a styled comparison table HTML
 */
export function generateComparisonTable(
  products: AmazonProduct[],
  options: TableOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };

  if (products.length === 0) {
    return '';
  }

  const tableStyle = `
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.95rem;
  `.replace(/\s+/g, ' ').trim();

  const thStyle = `
    background: #f8f9fa;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e9ecef;
  `.replace(/\s+/g, ' ').trim();

  const tdStyle = `
    padding: 12px 16px;
    border-bottom: 1px solid #e9ecef;
    vertical-align: middle;
  `.replace(/\s+/g, ' ').trim();

  const firstRowStyle = opts.highlightFirst
    ? `background: rgba(34, 197, 94, 0.05);`
    : '';

  // Build header row
  const headers = ['Product'];
  if (opts.showBestFor) headers.push('Best For');
  if (opts.showPrice) headers.push('Price');
  if (opts.showRating) headers.push('Rating');
  if (opts.showCta) headers.push('');

  const headerHtml = headers
    .map(h => `<th style="${thStyle}">${h}</th>`)
    .join('');

  // Build data rows
  const rowsHtml = products
    .map((product, index) => {
      const isFirst = index === 0;
      const rowStyle = isFirst ? firstRowStyle : '';

      const cells: string[] = [];

      // Product name with tier badge
      let badge = '';
      if (isFirst && opts.highlightFirst) {
        badge = '<span style="background: #22C55E; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">Top Pick</span>';
      } else if (product.tierLabel && product.tierColor) {
        badge = `<span style="background: ${product.tierColor}22; color: ${product.tierColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">${product.tierLabel}</span>`;
      }
      cells.push(`<strong>${product.name}</strong>${badge}`);

      // Best for
      if (opts.showBestFor) {
        cells.push(product.bestFor || '—');
      }

      // Price
      if (opts.showPrice) {
        cells.push(`<strong>${product.priceRange}</strong>`);
      }

      // Rating
      if (opts.showRating) {
        cells.push(`⭐ ${product.rating || '4.5/5'}`);
      }

      // CTA
      if (opts.showCta && product.affiliateUrl) {
        cells.push(`<a href="${product.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored" style="color: #FF9900; text-decoration: none; font-weight: 600;">${opts.ctaText}</a>`);
      } else if (opts.showCta) {
        cells.push('—');
      }

      const cellsHtml = cells
        .map(c => `<td style="${tdStyle}">${c}</td>`)
        .join('');

      return `<tr style="${rowStyle}">${cellsHtml}</tr>`;
    })
    .join('');

  return `
<div class="comparison-table-wrapper" style="overflow-x: auto; margin: 2rem 0;">
  <table class="comparison-table" style="${tableStyle}">
    <thead>
      <tr>${headerHtml}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</div>
`.trim();
}

/**
 * Generate a simple product list (for quick comparisons)
 */
export function generateProductList(products: AmazonProduct[]): string {
  if (products.length === 0) return '';

  const items = products
    .map((p, i) => {
      const badge = i === 0 ? ' 🏆' : '';
      return `<li><strong><a href="${p.affiliateUrl}" target="_blank" rel="nofollow noopener sponsored">${p.name}</a></strong>${badge} – ${p.bestFor} (${p.priceRange})</li>`;
    })
    .join('\n');

  return `
<ul class="product-quick-list" style="margin: 1rem 0; padding-left: 1.5rem;">
${items}
</ul>
`.trim();
}

/**
 * Generate tier badges for products
 */
export function getProductTier(priceRange: string): {
  tier: 'budget' | 'mid-range' | 'premium';
  label: string;
  color: string;
} {
  // Extract price numbers from range like "$50-$100" or "CA$150"
  const prices = priceRange.match(/\d+/g);
  if (!prices || prices.length === 0) {
    return { tier: 'mid-range', label: 'Mid-Range', color: '#3B82F6' };
  }

  const avgPrice = prices.reduce((sum, p) => sum + parseInt(p, 10), 0) / prices.length;

  if (avgPrice < 50) {
    return { tier: 'budget', label: 'Budget Pick', color: '#22C55E' };
  } else if (avgPrice < 150) {
    return { tier: 'mid-range', label: 'Mid-Range', color: '#3B82F6' };
  } else {
    return { tier: 'premium', label: 'Premium', color: '#A855F7' };
  }
}
