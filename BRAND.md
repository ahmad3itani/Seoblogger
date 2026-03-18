# BloggerSEO — Visual Brand Identity

## Brand Essence
**Tagline**: Publish SEO Articles to Blogger in Minutes
**Voice**: Confident, technical yet accessible, results-focused
**Personality**: The smart, fast expert that does the heavy lifting so you don't have to

---

## Color Palette

### Primary
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Ember Orange | `#FF6B35` | 255, 107, 53 | CTAs, highlights, brand identity |
| Ember Orange Light | `#FF8C5A` | 255, 140, 90 | Hover states, gradients |
| Orange Glow | `rgba(255,107,53,0.35)` | — | Box shadows, ambient glow |

### Accent
| Name | Hex | Usage |
|------|-----|-------|
| Electric Blue | `#4F8EFF` | Secondary accents, info states, blue highlights |
| Deep Purple | `#7C3AED` | Pro badges, gradient pairs |
| Success Green | `#22C55E` | Success states, free badges |

### Backgrounds (Dark Premium)
| Name | Hex | Usage |
|------|-----|-------|
| Deep Space | `#050912` | Page background |
| Surface Dark | `#0D1526` | Card backgrounds |
| Card | `#111827` | Elevated surfaces |
| Hover | `#1A2540` | Hover states on cards |

### Text
| Name | Value | Usage |
|------|-------|-------|
| Primary | `#F0F4FF` | Main headings & body |
| Secondary | `#8B9BB4` | Subtext, descriptions |
| Muted | `#4A5568` | Placeholders, labels |

---

## Typography

### Display Font — Space Grotesk
Used for: headings, numbers, CTAs
CSS variable: `var(--font-display)`
Weights: 400, 500, 600, 700

```css
font-family: 'Space Grotesk', sans-serif;
```

**Scale:**
- Hero: `72px / font-bold / tracking-tight`
- Section H2: `48px / font-bold`
- Card H3: `18px / font-semibold`
- Body: `16px / font-normal / leading-relaxed`

### Body Font — Inter
Used for: body copy, UI text, navigation
CSS variable: `var(--font-sans)`

### Mono Font — Geist Mono
Used for: code, stats, token counts
CSS variable: `var(--font-geist-mono)`

---

## Gradient Recipes

```css
/* Brand orange gradient */
linear-gradient(135deg, #FF6B35 0%, #FF8C5A 40%, #FFB347 100%)

/* Blue to purple */
linear-gradient(135deg, #4F8EFF 0%, #7C3AED 100%)

/* Multi-color hero */
linear-gradient(135deg, #FF6B35 0%, #FF8C5A 30%, #4F8EFF 70%, #7C3AED 100%)

/* Dark hero mesh */
radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,107,53,0.12), transparent 60%),
radial-gradient(ellipse 60% 40% at 80% 60%, rgba(79,142,255,0.10), transparent 55%)
```

---

## Glassmorphism System

```css
/* Standard glass card */
background: rgba(17, 24, 39, 0.70);
backdrop-filter: blur(24px) saturate(1.5);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 16px;

/* Orange-tinted glass */
background: rgba(255,107,53,0.08);
border: 1px solid rgba(255,107,53,0.25);

/* Navbar glass (on scroll) */
background: rgba(13, 21, 38, 0.60);
backdrop-filter: blur(20px) saturate(1.4);
```

---

## 3D & Motion Language

### Card Tilt (CSS)
```css
/* On mouse move */
transform: perspective(900px) rotateX(Ydeg) rotateY(Xdeg) translateZ(4px);
transition: transform 0.15s ease;
```

### Hero Mockup
```css
transform: perspective(1200px) rotateX(8deg) rotateY(-12deg) rotateZ(2deg);
```

### Hover Elevation
```css
transform: translateY(-3px);
box-shadow: 0 0 40px rgba(255,107,53,0.07), 0 24px 64px rgba(0,0,0,0.35);
```

### Float Animations
- Slow float: `6s ease-in-out infinite` — 0 to -12px
- Medium float: `4.5s` — 0 to -16px with slight rotation
- Fast bounce: `3s` — 0 to -6px (gentle)

---

## Icon System

Icons from **Lucide React**. Icon badges:

```css
/* Orange badge */
.icon-badge-orange {
  background: rgba(255,107,53,0.12);
  border: 1px solid rgba(255,107,53,0.25);
  color: #FF6B35;
  width: 44px; height: 44px;
  border-radius: 12px;
}
```

---

## Component Patterns

### CTA Button (Primary)
```css
background: linear-gradient(135deg, #FF6B35, #FF8C5A);
border-radius: 10px;
font-weight: 600;
transition: transform 0.25s, box-shadow 0.25s;

:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255,107,53,0.45);
}
```

### Tag Pill
```css
background: rgba(255,107,53,0.10);
border: 1px solid rgba(255,107,53,0.22);
color: #FF6B35;
border-radius: 999px;
padding: 4px 12px;
font-size: 12px; font-weight: 500;
```

### Pricing Card (Featured)
```css
background: linear-gradient(160deg, #0F1D38 0%, #0D1526 100%);
border: 1px solid rgba(255,107,53,0.30);
box-shadow: 0 0 0 1px rgba(255,107,53,0.15),
            0 0 60px rgba(255,107,53,0.10);
```

---

## Background Textures

- **Dot grid**: `radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)` @ `28px 28px`
- **Line grid**: `linear-gradient` 1px lines @ `60px 60px`, opacity 0.03
- **Ambient orbs**: fixed position, blur(80px), opacity 0.18, animated drift

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| Section padding | `py-24` (96px) | Between major sections |
| Card padding | `p-7` (28px) | Standard card inner padding |
| Gap between cards | `gap-4` to `gap-6` | Grid gaps |
| Hero top padding | `pt-28` (112px) | Navbar clearance |

---

## Logo Mark

The BloggerSEO logomark is a `<Zap>` icon (Lucide) inside a rounded square button with the brand orange gradient.

```jsx
<div className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center">
  <Zap className="w-4 h-4 text-white" />
</div>
```

Wordmark uses Space Grotesk 500 weight, `#F0F4FF`.
