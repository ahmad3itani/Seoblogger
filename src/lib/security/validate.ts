/**
 * Input validation and sanitization utilities for API routes.
 * Prevents oversized inputs, injection attacks, and abuse.
 */

/**
 * Sanitize a string input - trim, limit length, strip control characters
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
    if (typeof input !== "string") return "";
    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // strip control chars
}

/**
 * Validate and clamp a number within bounds
 */
export function sanitizeNumber(input: unknown, min: number, max: number, fallback: number): number {
    const num = typeof input === "number" ? input : Number(input);
    if (isNaN(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

/**
 * Validate that required string fields are present and non-empty
 */
export function validateRequired(fields: Record<string, unknown>): string | null {
    for (const [key, value] of Object.entries(fields)) {
        if (!value || (typeof value === "string" && value.trim().length === 0)) {
            return `${key} is required`;
        }
    }
    return null;
}

/**
 * Sanitize an array of strings - filter out non-strings, trim, limit count
 */
export function sanitizeStringArray(input: unknown, maxItems: number = 100, maxItemLength: number = 200): string[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((item): item is string => typeof item === "string")
        .slice(0, maxItems)
        .map(item => sanitizeString(item, maxItemLength));
}

/**
 * Check if a string looks like it contains potential injection patterns
 */
export function hasSuspiciousPatterns(input: string): boolean {
    const patterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,           // onclick=, onerror=, etc.
        /data:\s*text\/html/i,
        /vbscript:/i,
    ];
    return patterns.some(pattern => pattern.test(input));
}
