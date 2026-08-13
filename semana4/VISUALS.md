---
name: Cine Variedades
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#4ae183'
  on-secondary: '#003919'
  secondary-container: '#06bb63'
  on-secondary-container: '#00431f'
  tertiary: '#ffbfb5'
  on-tertiary: '#690001'
  tertiary-container: '#ff9687'
  on-tertiary-container: '#8e0505'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#6bfe9c'
  secondary-fixed-dim: '#4ae183'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a9'
  on-tertiary-fixed: '#410000'
  on-tertiary-fixed-variant: '#910807'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
  theater-charcoal: '#121212'
  seat-available: '#2ECC71'
  seat-reserved: '#F1C40F'
  seat-sold: '#4A4A4A'
  status-dubbed: '#3498DB'
  status-subtitled: '#9B59B6'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  seat-id:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter-mobile: 12px
  gutter-desktop: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  seat-gap: 4px
---

## Brand & Style

The design system is built on a **Modern Cinematic** aesthetic, blending the nostalgia of a heritage movie house with the precision of a high-end digital ticketing experience. It targets a dual audience: the mobile-first customer seeking a friction-less purchase and the theater staff requiring high-speed operational tools.

The visual direction uses a **Corporate / Modern** foundation with **Tactile** accents to evoke a premium theater atmosphere. The interface is characterized by:
- **High Contrast:** Deep backgrounds that mimic a darkened theater, ensuring that critical information (movie titles, action buttons, and seat statuses) commands attention.
- **Cinematic Accents:** Subtle use of gold and vibrant "action" colors to guide the user through the seat selection journey.
- **Information Density:** A structured, clean approach to data, prioritizing legibility and state clarity over decorative elements.
- **State-Driven Design:** The UI evolves based on the data status—available, reserved, or sold—making the real-time seat map the functional centerpiece of the system.

## Colors

The palette is anchored in a **Dark Mode** default to simulate the cinematic experience and reduce eye strain for mobile users in low-light environments.

- **Primary (Gold):** Used for premium branding, call-to-action buttons, and the confirmation code display. It represents the "premium" nature of the theater.
- **Secondary (Action Green):** Dedicated exclusively to "Available" states. It provides a clear, positive signal for selection.
- **Neutral (Charcoal):** Multiple tiers of near-black and deep gray are used to create depth and separate the UI into logical containers.
- **Named Colors:**
    - **Seat Map:** Uses a strict traffic-light system. Green for available, Yellow for the 5-minute temporary reservation, and Muted Gray for sold/occupied seats.
    - **Language Indicators:** Distinct colors are assigned to "Doblada" and "Subtitulada" to help customers differentiate screenings at a glance.

## Typography

Typography prioritizes clarity and technical precision.
- **Headlines:** Uses **Manrope** for a modern, refined look. It is used for movie titles and section headers to provide a sense of authority and premium quality.
- **Body:** **Work Sans** provides a professional and neutral base for descriptions, terms, and general information, ensuring high readability on mobile devices.
- **Labels & Data:** **JetBrains Mono** is used for seat coordinates (e.g., A-12), confirmation codes, and prices. The monospaced nature reflects the technical reliability of the system and ensures digits align perfectly in reports and tables.
- **Mobile Scaling:** Headline sizes are reduced on mobile to prevent overflow while maintaining the bold hierarchy.

## Layout & Spacing

The system uses a **Fluid Grid** approach to accommodate varying seat map sizes (60 vs 120 seats) and role-based dashboards.

- **Grid Model:** A standard 12-column grid for desktop views (Reports, Admin Billboard). On mobile, the layout reflows into a single-column stack.
- **Seat Map Logic:** The seat map uses a contextual "No Grid" layout within its container, relying on a fixed `seat-gap` to ensure the grid of 10 or 12 columns remains touch-friendly on mobile without breaking the screen width.
- **Rhythm:** An 8px base unit controls all padding and margins. 
- **Form Factors:**
    - **Mobile:** High-density vertical stacking for the Billboard. The seat map uses a horizontal scroll if necessary, though designed to fit narrow widths via scaling.
    - **Desktop:** Split-screen views for the Cashier role, allowing seat selection and customer data entry to happen side-by-side.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** rather than heavy shadows, maintaining a clean and functional appearance.

- **Background:** The base layer is `#121212` (Theater Charcoal).
- **Surface Tiers:** Cards and containers use slightly lighter grays (`#1A1A1A` and `#242424`) to denote elevation.
- **Seat Map Depth:** Interactive seats use a subtle inset shadow when "Reserved" to create a tactile, "pressed" effect.
- **Outlines:** High-contrast gold borders (1px) are used to highlight the current selection or the "Active" movie in the billboard, replacing the need for traditional drop shadows.

## Shapes

The shape language is **Soft (0.25rem)**, striking a balance between the precision of a technical system and the comfort of a leisure service.

- **Buttons & Inputs:** Standardized at `0.25rem` (4px) to look sharp and modern.
- **Seats:** Individual seats use `rounded-sm` to maintain their distinct identity within a dense grid while feeling approachable.
- **Cards:** The Billboard cards use `rounded-lg` (8px) to create a clear separation between movie posters and the background.
- **Status Pills:** "Doblada" or "Subtitulada" indicators use a full pill-shape (100px) to distinguish them from interactive buttons.

## Components

- **Buttons:** Primary buttons use a gold fill with black text. Secondary buttons (e.g., "Cancel") use a ghost style with a 1px border.
- **Seat Map Cells:** These are the most critical component. Each cell must display the seat ID in `seat-id` font. The state (available/reserved/sold) is communicated via background color. A 5-minute countdown timer is visible near the selection summary.
- **Movie Cards:** High-contrast displays featuring the poster, title in `headline-md`, and a row of status chips for format and room.
- **Status Indicators:** Pills with low-saturation backgrounds and high-saturation text for readability.
- **Confirmation Code Card:** A high-elevation component with a distinct border, presenting the purchase summary in a clear, printable-style layout for easy display at the theater entrance.
- **Input Fields:** Dark backgrounds with light borders that glow gold when focused, ensuring users can clearly see where they are typing their name and ID.