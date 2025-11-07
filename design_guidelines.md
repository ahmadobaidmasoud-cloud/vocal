# VocalSurvey Design Guidelines

## Design Approach

**Reference-Based Approach**: Inspired by the provided green card interface design, combined with modern survey platforms like Typeform and Google Forms, with a voice-first interaction paradigm. The design prioritizes clarity, accessibility, and seamless voice interaction flow.

## Core Design Principles

1. **Voice-First Clarity**: Visual design supports audio interaction, not competes with it
2. **Minimal Cognitive Load**: Single question focus with clear visual hierarchy
3. **Trust & Professionalism**: Clean, modern aesthetic suitable for government, healthcare, and enterprise
4. **Bilingual Excellence**: Seamless RTL (Arabic) and LTR (English) support

## Typography

**Font Families**:
- Arabic: 'IBM Plex Sans Arabic' (Google Fonts)
- English: 'Inter' (Google Fonts)
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Hierarchy**:
- Survey Title: text-3xl md:text-4xl font-bold
- Question Text: text-xl md:text-2xl font-semibold
- Score Numbers: text-4xl md:text-5xl font-bold
- Helper Text: text-sm md:text-base font-medium
- Status Indicators: text-xs md:text-sm font-medium

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Card padding: p-8 md:p-12
- Section gaps: gap-6 md:gap-8
- Button spacing: px-6 py-3 md:px-8 md:py-4

**Structure**:
- Max container width: max-w-2xl (responder), max-w-7xl (dashboard)
- Card-based layout with soft shadows and rounded corners (rounded-2xl)
- Centered vertical alignment for responder interface

## Component Library

### Responder Interface (Primary Focus)

**Question Card**:
- Large centered card with generous padding (p-8 md:p-12)
- Soft shadow (shadow-xl)
- Rounded corners (rounded-2xl)
- Smooth transitions between questions (fade + slide)
- Progress indicator at top (slim progress bar, 4px height)

**Score Input (1-5 / 1-10)**:
- Large circular or pill-shaped buttons in horizontal row
- Active state: filled with primary color
- Hover state: subtle scale (scale-105) and shadow
- Gap between numbers: gap-3 md:gap-4
- Button size: 56px × 56px (mobile), 72px × 72px (desktop)

**Text Input**:
- Large textarea with live transcription display
- Minimum height: h-32 md:h-40
- Soft border with focus ring
- Character count indicator (bottom-right)

**Voice Status Indicators**:
- Floating badge near microphone icon
- "Recording now..." with pulsing animation
- "Didn't hear well" with alert styling
- "Processing..." with spinner

**Navigation Controls**:
- Previous button (left): outline style
- Next button (right): filled primary
- Submit button (final question): prominent, filled
- Button size: px-8 py-4, text-lg font-semibold
- Icons from Heroicons

**Audio Controls**:
- Replay button: circular icon button (top-right of card)
- Mute toggle: small icon button
- Subtle, non-intrusive placement

### Creator Dashboard

**Survey Builder**:
- Drag-and-drop question list with reorder handles
- Collapsible question cards with preview
- Inline editing with smooth transitions
- Add question button: prominent, dashed border card

**Settings Panel**:
- Tabbed interface for organization
- Toggle switches for features (voice recording, auto-advance)
- Color picker for theme customization
- Logo upload area with preview

**Analytics Dashboard**:
- Card-based metrics layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Charts using Recharts library
- Data tables with sorting and filtering
- Export buttons (top-right): outline style

### Common Components

**Buttons**:
- Primary: filled, rounded-lg, font-semibold
- Secondary: outline, rounded-lg
- Ghost: transparent with hover background
- Icon buttons: p-2, rounded-full

**Forms**:
- Input fields: rounded-lg, border, focus ring
- Labels: text-sm font-medium, mb-2
- Helper text: text-xs, muted color
- Error states: red border + icon + message

**Cards**:
- Default: rounded-xl, shadow-md, p-6
- Elevated: rounded-2xl, shadow-xl, p-8
- Hover: subtle lift (translate-y-1) + shadow increase

**Modals**:
- Overlay: backdrop blur + opacity
- Content: centered card with max-w-md to max-w-2xl
- Close button: top-right, icon only

## Images

**Logo Placement**:
- Responder: Top-center of card (max height 48px)
- Dashboard: Top-left of navigation bar

**Survey Cover Image** (optional):
- Above question card, full-width
- Max height: 240px (mobile), 320px (desktop)
- Object-fit: cover, rounded-t-2xl

**No hero images needed** - this is a functional application, not a marketing site.

## Animations

**Use Sparingly**:
- Question transitions: 300ms fade + slide (translate-x-8)
- Button interactions: 150ms ease-out
- Card hover: 200ms ease-in-out
- Score selection: immediate feedback with scale
- Voice recording pulse: infinite 2s animation
- Page transitions: 200ms opacity fade

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation for all controls (Tab, Enter, Space, Arrow keys)
- Focus visible states with 2px ring
- Screen reader announcements for voice status changes
- Minimum touch target: 44px × 44px
- Contrast ratio: WCAG AA minimum (4.5:1 for text)
- RTL support with dir attribute and logical properties

## Responsive Breakpoints

- Mobile: base (320px+)
- Tablet: md (768px+)
- Desktop: lg (1024px+)
- Large: xl (1280px+)

**Mobile Adjustments**:
- Stack score buttons vertically if needed
- Reduce card padding to p-6
- Smaller typography scale
- Bottom-fixed navigation for responder
- Collapsible sidebar for dashboard