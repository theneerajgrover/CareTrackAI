# CARETRACK AI — RECREATE THE REFERENCE WEBSITE'S VISUAL STRUCTURE AND MOTION SYSTEM

I have provided a reference website recording.

**Study the attached recording carefully before making any design decisions.**

The goal is NOT to redesign the reference website.

The goal is to recreate the **same visual composition, proportions, layout hierarchy, positioning, animation language, transition behavior, interaction density, and overall premium feel** shown in the recording, while changing the content and product identity from the password manager shown in the reference to:

# CareTrack AI

This is a healthcare AI product.

---

# CRITICAL INSTRUCTION

## DO NOT MAKE A STATIC DESIGN.

The current generated CareTrack AI frontend does not have enough animation or transition behavior.

I specifically want the interface to feel **alive and cinematic**.

Use:

* React
* TypeScript
* Tailwind CSS
* Framer Motion
* Lucide React

Use Framer Motion for the actual interaction and transition system.

Do NOT merely add CSS hover effects and call the design animated.

The website must have meaningful motion throughout the experience.

---

# 1. REFERENCE RECORDING — WHAT MUST BE PRESERVED

The attached reference recording shows a fullscreen premium landing page.

Preserve the following characteristics from the recording:

* Fullscreen hero composition
* Very large visual area
* Minimal navigation
* Small compact navbar
* Logo positioned top-left
* Navigation centered across the top
* CTA buttons top-right
* Hero copy positioned toward the left
* Large bold heading
* Small supporting paragraph
* Compact primary CTA
* Large animated 3D visual occupying the right/lower portion of the screen
* Extremely clean background
* Large amount of negative space
* Subtle depth
* Premium product-studio aesthetic
* Slow continuous background/hero motion
* Small but noticeable interaction feedback
* Smooth transitions
* No clutter
* No traditional dashboard appearance on the landing page

The reference recording is approximately 12 seconds long and shows a continuously moving 3D hero scene.

The hero visual continuously changes position/appearance while the UI remains stable.

Reproduce this **relationship between stable UI and continuously animated visual content**.

---

# 2. DO NOT COPY THE PASSWORD MANAGER CONTENT

Replace all VaultShield-specific content.

Do NOT use:

* VaultShield
* Passwords
* Password security
* Lock icons as the primary concept
* Password vault terminology
* "Start For Free" if it does not fit CareTrack
* "Sign In" wording where CareTrack needs different terminology

The visual structure should remain inspired by the reference.

The product content becomes CareTrack AI.

---

# 3. CARETRACK AI BRAND

Logo:

**CareTrack AI**

Create a minimal, premium health-tech wordmark.

Possible subtle symbol:

* abstract pulse
* connected nodes
* AI neural pattern
* simplified health waveform

Do NOT use a giant medical cross.

The logo should be visually similar in scale and placement to the reference logo.

---

# 4. HERO CONTENT

Keep the same approximate typography scale, positioning, and hierarchy shown in the recording.

Replace the password-manager heading with:

**Understand Your Symptoms with Intelligent Health Analysis**

Use a multi-line composition similar to the reference.

Possible visual structure:

**Understand Your**
**Symptoms with**
**Intelligent Health Analysis**

The exact line wrapping should visually resemble the reference's compact three-line heading.

Do not make the heading enormous like a conventional SaaS landing page.

It should remain compact and editorial.

---

# 5. HERO SUBTEXT

Use:

**CareTrack AI helps you organize your symptoms, understand potential health patterns, and receive an intelligent analysis designed to help you take the next step with confidence.**

Keep the paragraph width and visual density similar to the reference recording.

Do not create a huge paragraph.

---

# 6. HERO CTA

Primary CTA:

**Start Health Check**

Use the same visual treatment as the reference CTA:

* compact pill
* strong accent background
* white text
* small arrow icon
* subtle shadow
* hover scale
* press scale

Use:

`ArrowRight`

or

`ArrowRightCircle`

from Lucide React.

---

# 7. NAVIGATION

Preserve the reference navigation structure.

Top-left:

**CareTrack AI**

Center desktop navigation:

* Home
* How It Works
* Health Analysis
* About
* Contact

Top-right:

**Start Health Check**

**Sign In**

Keep the navigation compact.

Do NOT turn it into a large modern SaaS navbar.

The navbar should feel almost integrated into the hero.

---

# 8. HERO BACKGROUND / 3D VISUAL

This is extremely important.

The reference recording contains a large animated 3D object occupying the right/lower portion of the screen.

For CareTrack AI, replace the password/security 3D concept with a premium:

# AI HEALTH ANALYSIS VISUALIZATION

The visual should conceptually represent:

**Human health + symptoms + AI analysis + connected data**

Possible visual composition:

A clean futuristic medical analysis apparatus with:

* translucent medical glass elements
* glowing symptom nodes
* abstract human-body silhouette
* floating circular health indicators
* flowing data ribbon
* pulse waveform
* subtle neural-network connections
* soft blue/indigo/cyan illumination
* smooth curved surfaces
* glass and polished materials
* subtle reflections

It should NOT look like:

* a hospital
* a doctor's office
* a medical stock illustration
* a cartoon
* a generic robot
* a generic AI brain

It should feel like a **premium product visualization**.

---

# 9. HERO VISUAL MOTION

The hero visualization must continuously animate.

This is a core requirement.

Use Framer Motion and/or a suitable CSS animation system for continuous movement.

The visual should have several independent motion layers.

### Layer 1 — Main object

Very slow:

```text
rotate
translateY
translateX
scale
```

Example conceptual motion:

```js
animate={{
  y: [0, -10, 0, 8, 0],
  rotate: [-1, 1, -1],
  scale: [1, 1.015, 1]
}}
transition={{
  duration: 10,
  repeat: Infinity,
  ease: "easeInOut"
}}
```

Do NOT use exactly the same values for every object.

Motion should feel organic.

---

# 10. FLOATING HEALTH NODES

Create several floating circular health/symptom nodes around the main visual.

Each node should move independently.

Example:

```js
animate={{
  y: [0, -18, 0],
  x: [0, 8, 0],
  rotate: [0, 8, 0]
}}
```

Use different durations:

* 5s
* 6.5s
* 8s
* 9s

Start each with a different delay.

This prevents synchronized movement.

---

# 11. AI DATA STREAM

Create a subtle flowing data ribbon / waveform.

It should slowly move through the hero scene.

Concept:

```text
symptom nodes
      ↓
data stream
      ↓
AI analysis core
      ↓
health insight
```

The animation should communicate analysis without literally showing technical code.

---

# 12. PULSE ANIMATION

Add a subtle pulse/waveform animation.

The pulse should:

* brighten slightly
* expand
* contract
* return to baseline

Do NOT make it blink rapidly.

Use a slow 2–3 second rhythm.

---

# 13. GLOW ANIMATION

The hero visualization should have ambient lighting movement.

Use very subtle:

```text
opacity
scale
blur
```

animation.

Example:

```js
animate={{
  opacity: [0.55, 0.8, 0.55],
  scale: [0.98, 1.04, 0.98]
}}
```

This should feel like a breathing ambient light.

---

# 14. HERO INITIAL LOAD ANIMATION

When the homepage opens, everything should enter sequentially.

Order:

### 0.0s

Navbar fades in.

### 0.1s

Logo appears.

### 0.15s

Navigation links appear with a slight upward movement.

### 0.25s

Right-side CTA buttons appear.

### 0.35s

Hero eyebrow appears.

### 0.45s

Heading begins revealing.

### 0.70s

Supporting paragraph appears.

### 0.90s

Primary CTA appears.

### 0.40–1.20s

3D hero visual fades/scales into position.

The final state should feel like the reference recording.

---

# 15. HEADING ANIMATION

Do NOT simply fade the complete heading.

Animate the heading line-by-line.

For example:

```text
Understand Your
Symptoms with
Intelligent Health Analysis
```

Each line should:

```text
opacity: 0 → 1
y: 28px → 0
```

with staggered timing.

Use:

```js
ease: [0.22, 1, 0.36, 1]
```

Duration:

approximately:

```text
0.6–0.8 seconds
```

The movement should be smooth and premium.

---

# 16. TEXT REVEAL

For important text, use a subtle reveal.

Concept:

```text
hidden:
opacity: 0
transform: translateY(24px)

visible:
opacity: 1
transform: translateY(0)
```

Do not use aggressive animation.

The animation should be noticeable but sophisticated.

---

# 17. CTA ANIMATION

Primary CTA:

On hover:

```text
scale → 1.04
```

Arrow:

```text
x → +4px
```

On tap:

```text
scale → 0.96
```

Also add a very subtle shadow/intensity increase.

The CTA should feel physically responsive.

---

# 18. NAVIGATION LINK ANIMATION

Desktop nav links should have a subtle hover animation.

On hover:

* opacity increases
* underline or small indicator appears
* indicator expands horizontally

Example:

```text
width: 0 → 100%
opacity: 0 → 1
```

Duration:

```text
0.25s
```

Do not use exaggerated animations.

---

# 19. NAVBAR SCROLL TRANSFORMATION

The navbar should change subtly after scrolling.

At top:

* transparent
* minimal
* integrated into hero

After scrolling:

* subtle translucent background
* backdrop blur
* thin border
* slightly smaller vertical padding
* soft shadow

Use Framer Motion's scroll state or Motion values.

Example conceptual behavior:

```text
scrollY = 0
    ↓
transparent navbar

scrollY > 40
    ↓
blurred translucent navbar
```

---

# 20. MOBILE MENU ANIMATION

The mobile menu must NOT simply appear/disappear.

Use:

**AnimatePresence**

Menu should slide from the right.

Animation:

```js
initial={{ x: "100%" }}
animate={{ x: 0 }}
exit={{ x: "100%" }}
transition={{
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1]
}}
```

Backdrop:

```text
opacity 0 → 1
```

with:

```text
backdrop-filter: blur(6px)
```

Navigation links should stagger into the screen.

Example:

```text
Home
     ↓
How It Works
     ↓
Health Analysis
     ↓
About
     ↓
Contact
```

Each should have:

```text
opacity 0 → 1
x 20px → 0
```

---

# 21. MOBILE MENU CLOSE

When closing:

* links exit first
* sheet slides right
* backdrop fades
* hamburger transitions back

Use animated Menu/X icons.

Do NOT abruptly switch icons.

---

# 22. PAGE TRANSITIONS

This is REQUIRED.

Every major page transition should have a polished transition.

Pages:

```text
Home
Login
Register
Patient Details
Symptoms
Category
Subcategory
Confirmation
Analysis
Report
```

When navigating:

Use a combination of:

```text
opacity
scale
y
blur
```

Example:

```js
initial={{
  opacity: 0,
  y: 18,
  filter: "blur(8px)"
}}

animate={{
  opacity: 1,
  y: 0,
  filter: "blur(0px)"
}}

exit={{
  opacity: 0,
  y: -12,
  filter: "blur(6px)"
}}
```

Duration:

```text
0.45–0.65s
```

Use:

```text
[0.22, 1, 0.36, 1]
```

for the main easing.

---

# 23. ROUTE TRANSITION SYSTEM

Implement a centralized route transition wrapper.

Conceptually:

```jsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

Do not independently implement random transitions for every page.

Create one coherent motion system.

---

# 24. SYMPTOM CATEGORY ANIMATION

When entering the symptom category page:

Cards should stagger into position.

Example:

```text
Card 1 → 0.05s
Card 2 → 0.10s
Card 3 → 0.15s
Card 4 → 0.20s
...
```

Each card:

```text
opacity: 0 → 1
y: 30 → 0
scale: 0.97 → 1
```

Use a spring-like feel where appropriate.

---

# 25. SYMPTOM CARD HOVER

When hovering over a symptom category:

* card moves up 3–5px
* border becomes slightly more visible
* icon rotates/moves subtly
* arrow moves right
* background changes slightly

Example:

```text
translateY(-4px)
```

Arrow:

```text
x: 0 → 5px
```

Duration:

```text
0.25s
```

---

# 26. SYMPTOM SELECTION ANIMATION

When the user selects a symptom:

Do NOT just change checkbox color.

Animate:

1. border
2. background
3. check icon
4. small scale pulse

Example:

```js
initial={{ scale: 0.8, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
```

The selected state should feel satisfying.

---

# 27. SELECTED SYMPTOM COUNTER

When the number of selected symptoms changes:

Animate the number.

Example:

```text
3 symptoms selected
```

→

```text
4 symptoms selected
```

Use a subtle number transition.

The summary bar should respond with a slight scale/pulse.

Do NOT use a notification-style bounce.

---

# 28. CATEGORY NAVIGATION TRANSITION

When clicking:

**Select More Symptoms**

the category page should transition back elegantly.

Do NOT hard-cut to the previous page.

Use:

```text
subcategory
    ↓
fade + slide
    ↓
category overview
```

Previously selected categories should retain their selected count.

---

# 29. SYMPTOM PERSISTENCE VISUALIZATION

If the user selected:

```text
Fever
Headache
Fatigue
```

and returns to the category page, visually show:

**General & Whole Body · 2 selected**

**Head & Neurological · 1 selected**

Use animated badges/counters.

This makes it obvious that the state was preserved.

---

# 30. CONFIRMATION PAGE ANIMATION

The confirmation page should reveal information in sections.

Sequence:

1. Page title
2. Patient details
3. Selected symptoms
4. Summary
5. Analyze button

Each section enters with:

```text
opacity
y
```

staggered by approximately:

```text
0.08–0.12 seconds
```

---

# 31. ANALYSIS PAGE — MAJOR ANIMATION

This page should have the strongest motion after the homepage.

Do NOT use a generic spinner.

Create a cinematic AI analysis sequence.

Example:

```text
Analyzing symptoms
       ↓
Mapping symptom patterns
       ↓
Comparing health signals
       ↓
Generating insights
```

Visual:

A central AI health core.

Around it:

* symptom nodes
* connecting lines
* pulse rings
* data particles
* soft glow

Animate them continuously.

---

# 32. ANALYSIS SEQUENCE

Create an animated sequence lasting approximately 3–5 seconds.

Stage 1:

**Reviewing symptoms**

Stage 2:

**Analyzing patterns**

Stage 3:

**Comparing health signals**

Stage 4:

**Preparing your report**

Then transition automatically to the report page.

Each stage should fade/slide smoothly.

---

# 33. ANALYSIS VISUAL

Use animated circles/nodes.

Concept:

```text
        symptom
           \
            \
symptom — AI CORE — symptom
            /
           /
       symptom
```

Connections should animate subtly.

Use SVG or motion-enabled div elements.

Lines can animate their opacity.

Nodes can pulse.

The core can slowly rotate.

---

# 34. REPORT PAGE ENTRANCE

The report should not suddenly appear.

Use a reveal animation.

First:

**CareTrack Health Analysis**

Then:

AI summary card

Then:

Potential findings

Then:

Symptom analysis

Then:

Recommendations

Each section should appear sequentially.

---

# 35. REPORT RESULT ANIMATION

When backend results eventually arrive:

Result cards should animate into view.

Potential finding:

```text
Condition
Confidence
Supporting symptoms
```

Confidence visualization should animate from:

```text
0%
```

to:

```text
backend-provided percentage
```

Do NOT hard-code fake medical confidence.

The frontend must use the backend value later.

---

# 36. PROGRESS INDICATOR ANIMATION

Across the assessment flow:

```text
01 Patient
02 Symptoms
03 Review
04 Analysis
```

The active stage should have:

* animated progress line
* highlighted number
* subtle glow

Completed stages should transition into a check icon.

Example:

```text
01 ✓
    ─────
02 ●
    ─────
03 ○
    ─────
04 ○
```

Animate the progress line when moving between steps.

---

# 37. BUTTON MICRO-INTERACTIONS

All primary buttons must have:

### Hover

```text
scale: 1.03–1.04
```

### Tap

```text
scale: 0.96
```

### Arrow

```text
x: 0 → 4px
```

### Shadow

Subtle increase.

Use Framer Motion.

---

# 38. CARD MICRO-INTERACTIONS

Interactive cards should have:

```text
whileHover={{
  y: -4,
  scale: 1.01
}}
```

Use subtle spring physics.

Do NOT make cards jump.

---

# 39. INPUT ANIMATION

Inputs should have a refined focus state.

On focus:

* border transitions
* subtle accent glow
* label moves/changes where appropriate

Avoid oversized glowing inputs.

---

# 40. ERROR ANIMATION

If an input has an error:

Use a subtle horizontal shake.

Example:

```text
x: [0, -4, 4, -3, 3, 0]
```

Duration:

```text
0.35s
```

Do not make it violent.

---

# 41. LOADING STATES

All loading states should use polished motion.

Do NOT use:

"Loading..."

with a static spinner.

Use:

* skeleton shimmer
* pulsing indicators
* progressive text
* animated AI visualization

---

# 42. SCROLL REVEAL

For sections below the homepage hero, use viewport-based reveals.

When entering viewport:

```text
opacity 0 → 1
y 40 → 0
```

with staggered children.

Use:

```jsx
whileInView
viewport={{ once: true, amount: 0.2 }}
```

Avoid triggering the animation repeatedly every time the user scrolls.

---

# 43. PARALLAX

Use subtle parallax for major decorative visual elements.

For example:

* hero visual
* floating health nodes
* background gradients
* abstract shapes

Different layers should move at slightly different rates.

Keep the movement subtle.

The user should feel depth without feeling motion sickness.

---

# 44. MOTION PERFORMANCE

Animations must remain performant.

Prefer:

* transform
* opacity
* scale
* rotate

Avoid animating expensive layout properties unnecessarily.

Do not continuously animate:

* width
* height
* top
* left

when transforms can achieve the same result.

Use GPU-friendly transforms where possible.

---

# 45. ACCESSIBILITY

Respect:

```css
prefers-reduced-motion
```

If reduced motion is enabled:

* disable decorative continuous animation
* shorten transitions
* preserve usability
* retain essential state changes

The application should remain fully usable without animation.

---

# 46. DO NOT OVER-ANIMATE

This is important.

The reference website is impressive because the animation is:

**continuous but restrained.**

Do not turn CareTrack into a flashy gaming interface.

Use the principle:

> Stable interface + moving visual atmosphere + responsive micro-interactions.

---

# 47. HOMEPAGE LAYOUT MUST REMAIN REFERENCE-INSPIRED

Do not change the fundamental composition.

Maintain:

```text
┌──────────────────────────────────────────────┐
│ Logo     Nav Nav Nav Nav      CTA   Sign In │
│                                              │
│                                              │
│  Small label                                 │
│                                              │
│  Large heading                3D AI HEALTH   │
│  Large heading                VISUALIZATION  │
│  Large heading                               │
│                                              │
│  Supporting text                             │
│                                              │
│  [ Start Health Check → ]                    │
│                                              │
│                         animated visual      │
│                                              │
└──────────────────────────────────────────────┘
```

The right-side visual should occupy substantial screen area just like the recording.

Do not move everything into centered cards.

---

# 48. BACKGROUND

Use a very clean light background inspired by the recording.

Possible:

```text
#F4F3EF
```

or a similarly warm neutral.

Add extremely subtle radial gradients.

Do not make the background colorful.

The hero visual should provide most of the visual interest.

---

# 49. TYPOGRAPHY SCALE

Use approximately:

Navbar:

```text
12–14px
```

Eyebrow:

```text
11–13px
```

Hero:

```text
clamp(2rem, 5vw, 4rem)
```

Body:

```text
14–17px
```

CTA:

```text
13–15px
```

Maintain the compact typography relationship seen in the reference recording.

---

# 50. FRAMER MOTION ARCHITECTURE

Create reusable motion variants.

For example:

```js
const fadeUp = {
  hidden: {
    opacity: 0,
    y: 28
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1]
    }
  }
}
```

Create additional variants:

```text
fadeUp
fadeIn
scaleIn
slideLeft
slideRight
staggerContainer
pageEnter
pageExit
mobileMenu
cardHover
symptomSelect
```

Do not duplicate animation definitions throughout components.

Create a coherent motion system.

---

# 51. SPRING PHYSICS

For interactive elements, use Framer Motion springs where appropriate.

Example:

```js
transition={{
  type: "spring",
  stiffness: 320,
  damping: 24
}}
```

Use springs primarily for:

* cards
* buttons
* selected symptom states
* floating UI elements

Use easing curves for:

* page transitions
* text reveals
* menu transitions

---

# 52. HERO LOOP

The homepage hero visual should continuously loop indefinitely.

The UI itself should NOT continuously replay entrance animations.

Only the decorative visual should continuously move.

This distinction is important.

---

# 53. INTERACTION PHILOSOPHY

Every interaction should communicate one of three things:

### Orientation

"Where am I?"

### Feedback

"What just happened?"

### Progress

"What happens next?"

Animations must serve one of these purposes.

---

# 54. FINAL PAGE LIST

Create the following fully animated pages:

## Page 1

Homepage

## Page 2

Login

## Page 3

Register

## Page 4

Patient Details

## Page 5

Main Symptom Categories

## Page 6

Symptom Subcategory

## Page 7

Select More Symptoms / Persistent Selection

## Page 8

Confirmation / Review

## Page 9

AI Analysis Loading

## Page 10

Health Analysis Report

Every page should have a consistent motion language.

---

# 55. FINAL REQUIREMENT

The final result should feel like the **same level of polish and motion quality as the attached reference recording**.

The recording should be treated as the visual and motion reference.

Preserve:

* composition
* spacing philosophy
* navbar placement
* hero proportions
* visual hierarchy
* CTA scale
* typography relationship
* continuous hero motion
* interaction subtlety
* premium aesthetic

Change only what is necessary to transform the product from a password manager into:

# CareTrack AI

The content becomes healthcare/AI content.

The visual system becomes healthcare/AI.

The interaction architecture becomes the CareTrack symptom-analysis flow.

But the **premium reference-level animation quality must remain.**

---

# ABSOLUTE PRIORITY

If there is a conflict between:

**adding more UI elements**

and

**preserving the clean cinematic visual quality of the reference**

choose the cinematic visual quality.

If there is a conflict between:

**more animation**

and

**smooth professional animation**

choose smooth professional animation.

The final product should make someone opening it think:

> **"This feels like a real, funded AI health-tech product."**

not:

> **"This is a college project with animations added to it."**
