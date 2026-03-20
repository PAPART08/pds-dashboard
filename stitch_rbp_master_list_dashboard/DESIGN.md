# Slate Meridian Design System

### 1. Overview & Creative North Star
**Creative North Star: The Civic Ledger**
Slate Meridian is a design system built for high-stakes administrative precision and institutional clarity. It moves away from generic SaaS aesthetics toward a "high-end editorial" government experience. The system rejects traditional boxy containment in favor of a fluid, rhythmic layout that prioritizes information density without sacrificing elegance. It uses intentional asymmetry—such as offset progress bars and varied card heights—to guide the eye through complex bureaucratic workflows.

### 2. Colors
The palette is rooted in a deep "Meridian Blue" (#1152d4) complemented by a sophisticated range of slates and off-whites.

*   **The "No-Line" Rule:** Sectioning is achieved through tonal shifts between `background` (#f6f6f8) and `surface` (#ffffff). Avoid 1px borders for major layout divisions; instead, use background-color nesting to define context.
*   **Surface Hierarchy & Nesting:** 
    *   **Level 0 (Base):** `background` for the main canvas.
    *   **Level 1 (Cards/Sections):** `surface` for primary interactive containers.
    *   **Level 2 (In-Card Accents):** `surface_container` for internal grouping (e.g., draft status indicators or secondary buttons).
*   **Signature Textures:** Use subtle 10% opacity primary tints (`primary/10`) for secondary action buttons to create a soft, monochromatic depth that feels integrated rather than overlaid.

### 3. Typography
Slate Meridian uses **Public Sans** exclusively, leveraging its clean, neutral geometry to handle varying data densities.

*   **Typographic Scale (Calibrated):**
    *   **Display/Hero:** 1.5rem (24px) for dashboard titles.
    *   **Headline/Title:** 1.125rem (18px) for major section headers.
    *   **Body (Default):** 0.875rem (14px) for primary data points and list items.
    *   **Label/Caption:** 0.75rem (12px) for secondary metadata.
    *   **Micro-Data:** 10px (Uppercase, bold) with 0.05em tracking for Project IDs and Status Tags.
*   **Identity Rhythm:** The brand identity is conveyed through high-contrast weight usage—combining Bold 700 for data titles with Light 400 for descriptive subtext.

### 4. Elevation & Depth
Depth in Slate Meridian is a matter of layering rather than height.

*   **The Layering Principle:** Use the `surface_container` series to stack elements. A progress bar track uses `surface_container_low`, while the filled portion uses `primary`.
*   **Ambient Shadows:** We utilize the `shadow-sm` profile: a very soft, diffused shadow (0 1px 2px 0 rgba(0, 0, 0, 0.05)) that anchors cards to the background without creating a "floating" effect.
*   **The "Ghost Border" Fallback:** Where borders are technically required (e.g., input fields), use `outline_variant` (#e2e8f0).
*   **Glassmorphism:** Bottom navigation and top headers should utilize a subtle backdrop-blur (8px) when scrolling to maintain a sense of environmental continuity.

### 5. Components
*   **Buttons:** Primary actions are solid `primary` with 8px (`lg`) rounded corners. Secondary actions use `primary/10` with `on_primary_container` text.
*   **Stage Toggles:** Segmented controls use a `surface_container` background with a `surface` card for the active state, creating a tactile "inset" feel.
*   **Progress Indicators:** Use 8px height tracks with full rounded caps. No borders; use `surface_container` for the track background.
*   **Status Badges:** Use semantic pastels (Amber-100/700 for pending, Green-100/700 for success) with Bold 10px uppercase text.
*   **Search Inputs:** Use `rounded-xl` (12px) with leading Material Symbols to signal an expansive, approachable utility.

### 6. Do's and Don'ts
*   **Do:** Use 10px uppercase labels for all technical metadata (IDs, Timestamps).
*   **Do:** Apply `opacity-80` to "Draft" or "Disabled" items to signify state change without hiding content.
*   **Don't:** Use solid black (#000000) for text. Always use `on_surface` (Slate-900) to maintain tonal softness.
*   **Don't:** Mix different corner radii. Use 4px for small elements (badges) and 12px for large elements (cards/inputs).
*   **Do:** Ensure "Edit" icons are consistently sized at 10px-12px to act as subtle affordances rather than primary visual distractions.