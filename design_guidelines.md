# VocalSurvey Design Guidelines

## Design Approach

**Chat-Style Conversational Interface**: Inspired by WhatsApp messaging interface with light green bubbles for questions and white capsule-style answer buttons. The design creates a natural conversation flow where each question appears as a new message bubble in a scrollable chat history, with voice-first interaction deeply integrated into the messaging paradigm.

## Core Design Principles

1. **Conversational Flow**: Questions and answers appear as message bubbles in a chat-like interface
2. **Voice-First Clarity**: Visual design supports audio interaction with clear status indicators
3. **Minimal Cognitive Load**: One active question at a time, with previous Q&A visible in scroll history
4. **Trust & Professionalism**: Familiar messaging UI suitable for government, healthcare, and enterprise
5. **Bilingual Excellence**: Seamless RTL (Arabic) and LTR (English) support

## Color Palette

### Chat Interface Colors

**Message Bubbles**:
- Question bubbles: `bg-[#D4F4DD]` (light mint green, similar to WhatsApp)
- Question text: `text-gray-900` (dark, high contrast)
- Chat background: `bg-gray-50` (very light gray, neutral)

**Answer Capsules (Score buttons)**:
- Default: `bg-white border-2 border-gray-300` (white with subtle border)
- Selected: `bg-green-500 text-white border-green-500` (filled green)
- Hover: `hover:border-green-400 hover:shadow-md`

**Answer Input Box (Text)**:
- Background: `bg-white`
- Border: `border-2 border-gray-300 focus:border-green-500`
- Microphone button: `bg-green-500 text-white` when recording

**Navigation**:
- Next/Submit button: `bg-green-500 hover:bg-green-600 text-white`
- Recording indicator: `bg-red-500` with pulse animation

### Semantic Colors (Dashboard & Editor)
- Primary: Green (`#22C55E`) - for main actions
- Success: Green-600
- Warning: Amber-500
- Error: Red-500
- Info: Blue-500

## Typography

**Font Families**:
- Arabic: 'IBM Plex Sans Arabic' (Google Fonts)
- English: 'Inter' (Google Fonts)
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Chat Interface Hierarchy**:
- Question bubble text: text-base md:text-lg font-medium leading-relaxed
- Score capsule numbers: text-2xl md:text-3xl font-bold
- Answer text: text-base font-normal
- Status indicators: text-xs md:text-sm font-medium
- Navigation button: text-base font-semibold

## Layout System

### Chat Interface Structure

**Container**:
- Full-height viewport: `min-h-screen`
- Background: `bg-gray-50`
- Padding: `p-4 md:p-6`

**Chat History (Scrollable Area)**:
- Max width: `max-w-2xl mx-auto`
- Scroll container: `overflow-y-auto flex-1`
- Question bubbles: Right-aligned in RTL, Left-aligned in LTR
- Answer bubbles: Left-aligned in RTL, Right-aligned in LTR
- Gap between messages: `gap-4`

**Active Question Area** (Bottom section):
- Fixed or sticky positioning
- White background with subtle shadow
- Padding: `p-4 md:p-6`
- Max width: `max-w-2xl mx-auto`

**Spacing Primitives**: Use Tailwind units of 2, 3, 4, 6, 8, 12
- Message bubble padding: `px-4 py-3 md:px-5 md:py-4`
- Capsule padding: `px-6 py-3 md:px-8 py-4`
- Section gaps: `gap-3 md:gap-4`

## Component Library

### Responder Chat Interface

**Question Bubble**:
```
- Background: bg-[#D4F4DD] (light green)
- Border radius: rounded-2xl (18px) for message bubble effect
- Padding: px-4 py-3 md:px-5 md:py-4
- Text: text-gray-900 font-medium
- Max width: max-w-[85%] md:max-w-[75%]
- Shadow: shadow-sm
- Animation: Fade in + slide up when appearing
- Position: Aligned to start (left for LTR, right for RTL)
```

**Answer Capsules (Score buttons)**:
```
- Shape: Rounded capsule (rounded-full)
- Size: min-w-[60px] h-[60px] md:min-w-[72px] md:h-[72px]
- Background: bg-white border-2 border-gray-300
- Text: text-2xl md:text-3xl font-bold text-gray-700
- Selected state: bg-green-500 text-white border-green-500
- Hover: hover:border-green-400 hover:shadow-md transition-all
- Layout: Horizontal flex with gap-2 md:gap-3, flex-wrap
- Tap feedback: active:scale-95 transition-transform
```

**Text Answer Box**:
```
- Container: bg-white border-2 border-gray-300 rounded-2xl p-3
- Textarea: resize-none, min-h-[80px], text-base
- Microphone button: Circular, absolute top-right
  - Recording: bg-red-500 text-white with pulse animation
  - Not recording: bg-green-500 text-white
  - Icon size: w-5 h-5
- Live transcript display: text-sm text-gray-600 italic
- Character/word count: text-xs text-gray-400 bottom-left
```

**Navigation Bar** (Bottom):
```
- Container: Fixed/sticky bottom, bg-white border-t shadow-lg
- Max width: max-w-2xl mx-auto
- Padding: p-3 md:p-4
- Button: Full width or centered
  - Next: bg-green-500 hover:bg-green-600 text-white
  - Submit (last Q): bg-green-600 hover:bg-green-700 text-white
  - Size: px-8 py-3 text-base font-semibold rounded-xl
  - Disabled state: opacity-50 cursor-not-allowed
  - Icon: Arrow or checkmark from lucide-react
```

**Voice Status Indicators**:
```
- Recording badge: Floating near mic button
  - bg-red-500 text-white px-3 py-1 rounded-full
  - Text: "Recording..." with pulsing red dot
  - Animation: animate-pulse
- Playing audio: bg-green-100 text-green-700 px-3 py-1
  - Text: "Playing..." with volume icon
- Processing: bg-blue-100 text-blue-700 with spinner
```

**Chat History Item**:
```
- Question section:
  - Question bubble (as above)
  - Timestamp: text-xs text-gray-400 mt-1
- Answer section:
  - For score: Small badge with number (bg-green-100 text-green-700 px-3 py-1.5 rounded-full)
  - For text: Gray bubble (bg-gray-200 text-gray-900 px-4 py-3 rounded-2xl)
  - Position: Opposite side from question
  - Max width: max-w-[85%]
```

**Intro Screen**:
```
- Keep current card-based design
- Background: bg-white rounded-2xl shadow-xl
- Padding: p-8 md:p-12
- Title: text-2xl md:text-3xl font-bold
- Intro text: text-base md:text-lg text-gray-600
- Start button: bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl
```

**Thank You Screen**:
```
- Keep current card-based design
- Centered layout with checkmark icon
- Success color: green-500
- Message: text-2xl font-bold
```

### Creator Dashboard (Unchanged)

**Survey Builder**:
- Drag-and-drop question list with reorder handles
- Collapsible question cards with preview
- Inline editing with smooth transitions
- Add question button: prominent, dashed border card

**Settings Panel**:
- Tabbed interface for organization
- Toggle switches for features
- Color picker for theme customization
- Logo upload area with preview

**Analytics Dashboard**:
- Clean table-only design
- Excel export button
- Card-based metrics (if needed)

### Common Components

**Buttons**:
- Primary (green): bg-green-500 hover:bg-green-600, rounded-xl, font-semibold
- Secondary: border-2 border-gray-300 hover:bg-gray-50, rounded-xl
- Ghost: transparent with hover:bg-gray-100
- Icon buttons: p-2, rounded-full

**Forms**:
- Input fields: rounded-xl, border-2 border-gray-300, focus:border-green-500
- Labels: text-sm font-medium text-gray-700, mb-2
- Helper text: text-xs text-gray-500
- Error states: border-red-500, text-red-600

**Cards** (Dashboard/Editor only):
- Default: rounded-xl, shadow-md, p-6, bg-white
- Elevated: rounded-2xl, shadow-xl, p-8
- Hover: hover:shadow-lg transition-shadow

## Images

**Logo Placement**:
- Responder chat: Top-center, small (h-8 md:h-10)
- Dashboard: Top-left of navigation bar
- Max height: 40px

## Animations

**Chat-Specific Animations**:
- New question bubble: 300ms fade-in + slide-up (translate-y-4 to 0)
- Answer selection: 150ms scale feedback (active:scale-95)
- Recording pulse: infinite 1.5s pulse on mic button
- Transition to next Q: 200ms fade + slight scroll animation

**Smooth Scrolling**:
- Auto-scroll to new question: smooth scroll-behavior
- Scroll padding: scroll-pt-4

**Use Sparingly**:
- Button interactions: 150ms ease-out
- Hover states: 200ms ease-in-out
- Page transitions: 200ms opacity fade

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation: Tab, Enter, Space for capsules
- Focus visible: ring-2 ring-green-500 ring-offset-2
- Screen reader announcements for:
  - New question appeared
  - Recording started/stopped
  - Answer submitted
- Minimum touch target: 44px × 44px (capsules meet this)
- Contrast ratio: WCAG AA minimum (4.5:1)
- RTL support with dir attribute

## Responsive Breakpoints

- Mobile: base (320px+)
- Tablet: md (768px+)
- Desktop: lg (1024px+)

**Mobile Adjustments**:
- Reduce capsule size slightly (60px vs 72px)
- Stack capsules in 2-3 columns if needed (score 1-10)
- Smaller bubble max-width (85% vs 75%)
- Fixed bottom navigation with safe-area padding
- Reduce padding: p-4 instead of p-6

## Voice Integration Patterns

**Auto-play TTS**:
- Play question audio automatically when bubble appears
- Show "Playing..." indicator during TTS
- Start recording 1ms after TTS ends

**STT Feedback**:
- Real-time transcript display in input box
- Word-by-word confidence indicators (optional)
- Edit transcript before submitting

**Voice Commands**:
- "Next" / "التالي" → Next question
- "Back" / "السابق" → Previous (if allowed)
- "Repeat" / "إعادة" → Replay question
- "Submit" / "إرسال" → Submit (last question)

**Recording States**:
- Idle: Green mic button, ready
- Recording: Red mic button with pulse + "Recording..." badge
- Processing: Blue spinner + "Processing..."
- Error: Yellow warning + "Didn't hear well, try again"

## Dark Mode

Not required for MVP - focus on single light theme optimized for chat interface.

## Testing & Quality

- Test on real devices (iOS Safari, Android Chrome)
- Verify RTL layout for Arabic
- Test voice recording in quiet/noisy environments
- Ensure smooth scroll performance with 20+ questions
- Verify capsule touch targets on small screens
- Test with screen readers (VoiceOver, TalkBack)
