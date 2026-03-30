# BloggerSEO Design System - Editorial Precision

## Overview

BloggerSEO uses the **Editorial Precision** design language - a distinctive aesthetic that blends magazine editorial design with data dashboard clarity. This system breaks away from generic AI SaaS patterns to create a memorable, professional interface.

## Design Principles

1. **Clarity over decoration** - Every element serves a purpose
2. **Data-forward hierarchy** - Important metrics and actions are immediately visible
3. **Confident restraint** - Use color and motion sparingly for maximum impact
4. **Professional speed** - Interface feels fast and responsive
5. **Distinctive without gimmicks** - Memorable through precision, not decoration

## Color Palette

### Primary Colors
- **Terracotta** `#C2553D` - Primary brand color, warm and distinctive
- **Forest Green** `#2D5F4F` - Accent color, sophisticated and professional
- **Warm White** `#FDFCFB` - Canvas background
- **Warm Black** `#1C1917` - Primary text

### Semantic Colors
- **Success**: Forest Green `#2D5F4F`
- **Warning**: Amber `#D97706`
- **Error**: Red `#DC2626`

### Neutral Scale (Warm-tinted)
- **Canvas**: `#FDFCFB`
- **Surface**: `#F8F6F4`
- **Card**: `#FFFFFF`
- **Border Subtle**: `#E8E5E1`
- **Border Default**: `#D4CFC8`
- **Border Strong**: `#B8AFA5`

### Text Scale
- **Primary**: `#1C1917` - Almost black, warm tint
- **Secondary**: `#57534E` - Medium gray, warm
- **Tertiary**: `#78716C` - Light gray, warm

## Typography

### Font Stack
- **Display**: Used for headings, distinctive serif or unique sans
- **Body**: Clean, highly legible sans-serif for data-dense interfaces
- **Mono**: For code, URLs, technical data

### Hierarchy
- **H1**: 3xl (30px), font-semibold, -0.02em letter-spacing
- **H2**: 2xl (24px), font-semibold, -0.02em letter-spacing
- **H3**: xl (20px), font-semibold
- **H4**: lg (18px), font-semibold
- **Body**: base (16px), regular
- **Small**: sm (14px), regular
- **Tiny**: xs (12px), regular

### Features
- Kerning enabled (`kern`)
- Ligatures enabled (`liga`, `calt`)
- Tabular numbers for data tables (`tabular-nums`)

## Spacing Scale

Generous, editorial rhythm:
- **1**: 4px (0.25rem)
- **2**: 8px (0.5rem)
- **3**: 12px (0.75rem)
- **4**: 16px (1rem)
- **5**: 24px (1.5rem)
- **6**: 32px (2rem)
- **8**: 48px (3rem)
- **10**: 64px (4rem)
- **12**: 96px (6rem)

## Components

### Cards
```css
.editorial-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(28, 25, 23, 0.04);
}
```

### Buttons
- **Primary**: Terracotta background, white text
- **Secondary**: Surface background, primary text
- **Ghost**: Transparent, primary text with border

### Inputs
- **Background**: Surface gray
- **Border**: Default border
- **Focus**: Terracotta ring
- **Height**: 40px (2.5rem)

### Badges
- **Primary**: Terracotta background, white text
- **Accent**: Forest green background, white text
- **Neutral**: Surface background, secondary text

## Layout Patterns

### Page Structure
```
Header (border-bottom, pb-8, mb-8)
  Icon + Title + Description
  Actions/Navigation

Content (max-w-7xl)
  Grid layouts with generous gaps (gap-6)
  Cards with consistent padding (p-6)
```

### Data Display
- Use tables with tabular numbers
- Clear visual hierarchy with font weights
- Subtle borders, not heavy containers
- Progressive disclosure for complex data

## Motion Design

### Easing
- **Natural deceleration**: `cubic-bezier(0.16, 1, 0.3, 1)`
- **Duration**: 200ms for most transitions
- **Properties**: Only transform and opacity (never layout properties)

### Animations
- State changes (loading, success, error)
- Hover feedback (subtle, no scale transforms)
- Entrance animations (fade in, slide up)
- **Avoid**: Bounce, elastic, decorative animations

## Anti-Patterns (What NOT to Do)

### AI Slop Tells
❌ Purple + Cyan color schemes
❌ Dark mode with glowing neon accents
❌ Gradient text on headings
❌ Glassmorphism everywhere
❌ Ambient glow orbs
❌ Card nesting (cards inside cards)
❌ Bounce/elastic easing
❌ Generic fonts (Inter, Roboto, Arial)

### Design Mistakes
❌ Gray text on colored backgrounds
❌ Decorative elements without purpose
❌ Uniform padding everywhere
❌ Everything wrapped in containers
❌ Overuse of shadows and blur
❌ Gradient backgrounds on every surface

## Implementation Guidelines

### CSS Variables
All colors, spacing, and design tokens are defined as CSS variables in `globals.css`. Always use variables, never hard-code values.

### Component Styling
- Use inline styles with CSS variables for dynamic theming
- Keep Tailwind classes for layout and utilities
- Avoid mixing hard-coded colors with design tokens

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch targets minimum 44x44px
- Fluid typography and spacing

### Accessibility
- WCAG AA contrast ratios (4.5:1 for text)
- Semantic HTML (proper headings, landmarks)
- Keyboard navigation support
- Focus indicators on all interactive elements
- ARIA labels where needed

## Usage Examples

### Page Header
```tsx
<div className="border-b pb-8 mb-8" style={{ borderColor: "var(--border-subtle)" }}>
  <div className="flex items-start gap-5">
    <div className="w-12 h-12 rounded-lg flex items-center justify-center"
         style={{ background: "var(--brand-primary)", color: "white" }}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
        Page Title
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>Description</p>
    </div>
  </div>
</div>
```

### Form Input
```tsx
<div>
  <Label className="text-sm mb-2 block font-medium" 
         style={{ color: "var(--text-secondary)" }}>
    Label
  </Label>
  <Input className="h-10 text-sm"
         style={{ background: "var(--bg-surface)", 
                  border: "1px solid var(--border-default)" }} />
</div>
```

### Card
```tsx
<div className="rounded-lg p-6"
     style={{ background: "var(--bg-card)", 
              border: "1px solid var(--border-subtle)" }}>
  Content
</div>
```

## Resources

- Design Context: `.impeccable.md`
- Global Styles: `src/app/globals.css`
- Component Examples: `src/components/amazon/`

---

**Last Updated**: March 2026
**Design Language**: Editorial Precision v1.0
