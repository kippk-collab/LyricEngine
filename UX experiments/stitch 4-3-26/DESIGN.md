# Design System Document: The Midnight Lyricist

## 1. Overview & Creative North Star
**Creative North Star: "The Analog Ghost"**
This design system is built to evoke the quiet, heavy atmosphere of a 3:00 AM recording session. It is a space where the digital interface recedes, leaving only the songwriter and their craft. To achieve this, we move away from the "grid-of-boxes" mentality common in SaaS and embrace an editorial, almost cinematic layout.

The system breaks the "template" look through **Intentional Asymmetry**. We favor wide gutters, staggered text alignment, and significant vertical breathing room. Large serif displays should feel like ink on a page, while UI elements act as the silent hardware in the rack—there when needed, invisible when not.

---

## 2. Colors & Tonal Depth
The palette is rooted in the "Deep Charcoal" (`#0e0e0e`) of a darkened room, punctuated by the "Soft Electric Blue" (`#acc7fb`) of a glowing monitor and the "Muted Gold" (`#bd9952`) of vintage brass hardware.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning or containment. 
Boundaries must be defined through background shifts. For example, a workspace area using `surface-container-low` should sit directly against the `surface` background. The eye should perceive the change in depth through the shift in charcoal tones, not a hard stroke.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of heavy vellum.
*   **Base Layer:** `surface` (#0e0e0e) for the primary application background.
*   **The Desk:** `surface-container-low` (#131313) for large sidebar or navigation regions.
*   **The Paper:** `surface-container-highest` (#252626) for active writing areas or focused modals.

### The "Glass & Gradient" Rule
To add "soul," use `backdrop-blur` (12px–20px) on floating menus using a semi-transparent `surface-variant`. Main CTAs or active lyric highlights should utilize a subtle linear gradient from `primary` (#acc7fb) to `primary-container` (#2b4773) at a 135-degree angle to mimic the glow of a studio light.

---

## 3. Typography: The Star of the Show
Typography is not just for reading; it is the primary visual texture of this system.

*   **The Soul (Serif):** `Newsreader`. Used for `display` and `headline` tiers. This font carries the elegance of a classic lyric sheet. Use it sparingly and large. High-contrast sizing (e.g., a `display-lg` title next to a `body-sm` date) creates an editorial feel.
*   **The Tool (Sans-Serif):** `Inter`. Used for `title`, `body`, and `label` tiers. It provides the "clean, hardware" look for the UI. It must remain utilitarian to let the serif headers shine.

**Hierarchy Note:** Always lead with the Serif. Even in small settings like "Song Title," a `title-md` in Newsreader will feel more intentional than Inter.

---

## 4. Elevation & Depth
We eschew Material Design’s traditional shadow-heavy approach for **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The "darker-on-lighter" effect creates a recessed, carved-out feel that is more sophisticated than a shadow.
*   **Ambient Shadows:** If an element must float (e.g., a floating lyric suggestion), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6)`. The shadow should feel like a soft pool of darkness, not a crisp edge.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#484848) at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use `surface-container-high` at 70% opacity with a `blur(10px)` for overlays. This allows the "late-night" blues and charcoals to bleed through the interface.

---

## 5. Components

### Buttons
*   **Primary:** A gradient from `primary` to `primary-container`. Text is `on-primary` (deep blue-black). Roundedness: `md` (0.375rem).
*   **Secondary:** No background. A "Ghost Border" (outline-variant at 20%) with `secondary` (#bd9952) text.
*   **Interaction:** On hover, primary buttons should increase their "glow" via a subtle outer box-shadow of the primary color at 20% opacity.

### Input Fields
*   **Lyric Entry:** Minimalist. No bounding box. Only a `surface-container-highest` bottom bar (2px) that glows to `primary` when focused.
*   **UI Inputs:** `surface-container-low` background, `none` border, `sm` (0.125rem) corner radius.

### Cards & Lists
*   **The Rule of Silence:** Forbid divider lines. Separate list items using 12px of vertical white space or a hover state that shifts the background to `surface-container-high`.
*   **Song Cards:** Use `headline-sm` (Newsreader) for titles and `label-sm` (Inter) for metadata. Stagger the metadata to the right to break the vertical line.

### Special Component: "The Rhyme Tray"
A floating, glassmorphic panel (`surface-variant` with blur) that appears in the margin. It uses `tertiary` (#f0f3ff) for text to provide a high-contrast, "utility" feel that differs from the core narrative text.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the Void:** Use massive amounts of whitespace. If you think there's enough space, double it.
*   **Mix Weights:** Pair a `display-lg` Light weight serif with a `label-md` Bold weight sans-serif.
*   **Subtle Animation:** All transitions (hover, entry) should be slow (300ms–500ms) with a "cubic-bezier(0.4, 0, 0.2, 1)" easing to mimic the smooth fade of an audio fader.

### Don't:
*   **Don't Use Pure White:** Use `on-surface` (#e7e5e5) for text. Pure white (#ffffff) is too harsh for the late-night studio aesthetic and ruins the atmospheric depth.
*   **Don't Center Everything:** Use asymmetrical layouts. Align some elements to the far left and others to the mid-right to create a "composed" look.
*   **Don't Use Icons for Everything:** This is a "Word Lab." Prefer text labels in `label-sm` (all caps, increased tracking) over generic icons. Words are the user's medium; honor them.