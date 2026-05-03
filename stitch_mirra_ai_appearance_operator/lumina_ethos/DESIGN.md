---
name: Lumina Ethos
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#44474a'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#75777a'
  outline-variant: '#c5c6ca'
  surface-tint: '#5d5e61'
  primary: '#000101'
  on-primary: '#ffffff'
  primary-container: '#1a1c1e'
  on-primary-container: '#838486'
  inverse-primary: '#c6c6c9'
  secondary: '#645d55'
  on-secondary: '#ffffff'
  secondary-container: '#ebe1d6'
  on-secondary-container: '#6a635b'
  tertiary: '#010100'
  on-tertiary: '#ffffff'
  tertiary-container: '#201b17'
  on-tertiary-container: '#8b837d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e5'
  primary-fixed-dim: '#c6c6c9'
  on-primary-fixed: '#1a1c1e'
  on-primary-fixed-variant: '#454749'
  secondary-fixed: '#ebe1d6'
  secondary-fixed-dim: '#cec5bb'
  on-secondary-fixed: '#1f1b14'
  on-secondary-fixed-variant: '#4c463e'
  tertiary-fixed: '#ebe0da'
  tertiary-fixed-dim: '#cfc5be'
  on-tertiary-fixed: '#201b17'
  on-tertiary-fixed-variant: '#4c4641'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  h1:
    fontFamily: Noto Serif
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  h3:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  match-score:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  stack-gap: 16px
  section-gap: 40px
  glass-margin: 12px
---

## Brand & Style

This design system is built to bridge the gap between rigorous AI precision and the intimate world of personal aesthetics. The personality is defined as **Personal, Sophisticated, High-Tech, and Trustworthy**. It avoids the coldness of traditional tech by utilizing a "High-End Fashion" lens—prioritizing editorial spacing, graceful transitions, and a human-centric warmth.

The visual style is a hybrid of **Minimalism** and **Glassmorphism**. By using translucent layers and high-quality typography, the interface recedes to allow the user’s image (AR/Camera) to remain the focal point. The goal is to create an immersive "one conversation" feel where the AI acts as a sophisticated digital concierge rather than a static tool.

## Colors

The palette is grounded in **Deep Slate (#1A1C1E)** to provide a sense of authority and permanence. This is balanced by **Skin Neutrals**, using warm beiges and creams to mirror the human element of the product. 

- **Primary (Deep Slate):** Used for primary text, structural icons, and grounding elements.
- **Secondary (Champagne Cream):** Used for subtle section backgrounds and "Proof Card" containers.
- **Accent (Glowing Amber):** A vibrant "Confidence" color used exclusively for AI insights, match scores, and call-to-action highlights. 
- **Backgrounds:** Off-whites and extremely light greys are utilized to ensure that AR content and skin tones are rendered accurately without color contamination from the UI.

## Typography

This design system utilizes a sophisticated serif-sans pairing to signal luxury and clarity. 

- **Headlines:** Noto Serif is employed for all major headings. Its refined strokes evoke the feeling of a high-end fashion masthead or medical journal.
- **Body & Data:** Inter is used for all functional text. It provides maximum legibility during camera-centric interactions and voice-to-text transcriptions.
- **Specialty:** A high-weight Inter variant is used for "Match Scores" to ensure the AI's "Confidence" metrics are the most legible elements on the screen.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** with generous safe-area margins to accommodate modern mobile displays and camera overlays. 

- **Rhythm:** A 4px base unit is used, with a preference for larger 24px and 32px increments to maintain an editorial, airy feel.
- **Safe Zones:** Content is pushed away from the edges to ensure "Proof Cards" and AI overlays don't interfere with the user's face in the camera view.
- **The "Conversation" Stack:** Elements are vertically stacked to mimic a messaging flow, emphasizing the voice-forward and immersive nature of the interaction.

## Elevation & Depth

This design system utilizes **Glassmorphism** and **Ambient Shadows** to create a sense of height without clutter.

1.  **The Base Layer:** The live camera feed or a flat neutral background.
2.  **The Glass Layer:** "Proof Cards" and AI insights use a 70% opacity white fill with a 20px-32px backdrop blur. A very thin (0.5px) white border is applied to give the glass a "physical" edge.
3.  **Shadows:** Shadows are highly diffused (40px-60px blur) with very low opacity (5-10%) and a slight tint of the Primary color to avoid a "muddy" look.
4.  **Transitions:** Elevation changes should feel fluid—elements "float" into view rather than snapping.

## Shapes

The shape language is extremely organic and soft. To align with the "Personal" and "Sophisticated" brand personality, sharp corners are entirely avoided.

- **Primary Radius:** A minimum of 24px for all cards and containers.
- **Buttons & Chips:** Fully pill-shaped (rounded-full) to feel inviting and ergonomic.
- **Visual Continuity:** The curvature of the UI elements should feel intentional and mimic the soft contours of the human face.

## Components

- **Proof Cards:** The signature component. These are glassmorphic containers used for AI comparisons, "before/after" snapshots, and ingredient breakdowns. They feature a 24px radius and soft ambient shadows.
- **Action Buttons:** High-contrast Primary color with Noto Serif text for a premium feel. Secondary buttons use the Skin Neutral palette with subtle borders.
- **Confidence Rings:** Circular progress indicators using the Accent (Amber) color to visualize match scores and AI certainty levels.
- **Minimalist Iconography:** Line-based icons with a 1.5pt stroke weight. Icons should be functional and unobtrusive, allowing text and visuals to lead.
- **The Voice Orb:** A central, pulsating element used when the AI is "listening" or "processing," utilizing a gradient of the Accent and Secondary colors.
- **Input Fields:** Minimalist underlines or soft-tinted pill shapes with Inter typography; they should feel like a natural part of the conversation rather than a "form."