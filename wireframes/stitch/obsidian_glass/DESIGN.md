# Design System: The Obsidian Atmospheric

## 1. Overview & Creative North Star
**Creative North Star: "The Luminous Observatory"**

The Obsidian Atmospheric system is designed to transform complex data into a cinematic, editorial experience. We are moving away from the "boxy" utility of traditional SaaS and toward a high-fidelity environment that feels like a precision instrument. 

To achieve this, we reject standard structural grids in favor of **Tonal Layering**. The interface should feel like a series of celestial bodies floating in deep space—connected by light and gravity rather than rigid lines. We use intentional asymmetry, expansive negative space, and "ghost" boundaries to guide the eye, creating a sense of sophisticated calm within data-heavy environments.

---

## 2. Colors & Surface Philosophy
The palette is built on a foundation of "Deep Ink" tones, punctuated by high-chroma accent "Glows."

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Structural separation must be achieved through:
1.  **Background Shifts:** Transitioning from `surface-dim` (#101419) to `surface-container-low` (#181c21).
2.  **Luminous Depth:** Using backdrop blurs to allow the background mesh to bleed through panels.

### Surface Hierarchy & Nesting
Treat the UI as a three-dimensional stack. Each level of "importance" is represented by a shift in luminance:
*   **Level 0 (Foundation):** `surface-lowest` (#0a0e13) — The infinite void.
*   **Level 1 (Sections):** `surface-container` (#1c2025) — Large content areas.
*   **Level 2 (Interaction):** `surface-container-high` (#262a30) — Individual cards and active modules.
*   **Level 3 (Focus):** `surface-bright` (#36393f) — Modals and floating tooltips.

### The Glass & Gradient Rule
Floating elements (Modals, Dropdowns) must utilize **Glassmorphism**:
*   **Fill:** `rgba(17, 24, 39, 0.7)`
*   **Effect:** `backdrop-filter: blur(16px)`
*   **Soul:** Main CTAs should not be flat. Use a subtle linear gradient from `primary` (#adc6ff) to `primary-container` (#4d8eff) at a 135-degree angle to provide a machined, metallic sheen.

---

## 3. Typography: The Editorial Scale
We use **Inter** as a functional typeface but treat it with editorial weight.

*   **Display/Headlines:** `display-sm` (2.25rem) to `headline-lg` (2rem). These should use tight letter-spacing (-0.02em) to feel authoritative and dense.
*   **The "Technical" Label:** `label-sm` (0.6875rem) or `label-md` (0.75rem). **Always uppercase** with a `0.15em` letter-spacing. Use `on-surface-variant` (#c2c6d6) to distinguish from live data.
*   **Body Narrative:** `body-md` (0.875rem) is the workhorse. High line-height (1.6) is mandatory to maintain the "premium" breathability of the layout.

---

## 4. Elevation & Depth
Depth in this system is organic, mimicking light physics rather than digital shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` card inside a `surface-container-low` section to create "recessed" depth. 
*   **Ambient Shadows:** For floating elements, use a shadow with a 40px blur, 0px offset, and 6% opacity, tinted with `#adc6ff`. It should feel like a soft glow, not a dark smudge.
*   **The Ghost Border Fallback:** If a border is required for accessibility, use `outline-variant` (#424754) at **15% opacity**. It should be felt, not seen.
*   **Glow Effects:** Critical data points or "Active" states should utilize a radial glow using the `tertiary` (#4ae176) or `secondary` (#d0bcff) tokens at 20% opacity, placed behind the element.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`). `8px` (sm) radius. White-on-blue text.
*   **Secondary:** Ghost style. No background, `Ghost Border` (15% opacity), `primary` text color.
*   **Tertiary:** Text only, uppercase `label-md` style.

### Inputs
*   **Base:** `surface-container-highest` background. No border. `12px` (md) radius.
*   **Focus:** Transition to `primary` ghost border (20% opacity) and a subtle 4px outer glow of the same color.

### Cards & Lists
*   **The "No-Divider" Mandate:** Never use a horizontal line to separate list items. Use a `1.5rem` (6) vertical gap or alternating `surface-container` shifts.
*   **Hover State:** `translateY(-4px)` with an increase in backdrop blur from 16px to 24px.

### Data Visualization (Signature Component)
*   **The "Vapor" Line:** Charts should use the `tertiary` (#4ae176) line with a 20px feathered glow underneath, fading into the background.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. A sidebar that doesn't reach the bottom of the screen creates a more premium, custom feel.
*   **Do** use `label-sm` for "metadata" to create a high-contrast hierarchy against large headlines.
*   **Do** use the `20` (5rem) spacing token for major section gaps to let the "Atmospheric" background breathe.

### Don’t:
*   **Don't** use `#000000` for shadows. Always tint with the primary blue.
*   **Don't** use standard "Select" dropdowns. Use the Glassmorphism overlay pattern.
*   **Don't** use 100% opacity for borders. If the boundary is too sharp, the "Atmospheric" illusion is broken.
*   **Don't** crowd the interface. If a screen feels "full," increase the spacing scale and move secondary actions to a `surface-bright` drawer.