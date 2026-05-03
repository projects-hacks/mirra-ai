# Requirements Document: Feature Discoverability UI

## Introduction

The Mirra voice agent app currently provides a voice-first experience where all features are accessible only through voice commands. Users cannot see what features are available or how to access them, creating a discoverability problem. This feature adds visible UI navigation that allows users to discover and access all 13 available features through buttons and menus, while maintaining the voice-first experience as the primary interaction method.

The UI must be mobile-optimized (PWA), follow the Lumina Ethos design system (glassmorphism, light mode), and not interfere with existing components (voice orb, camera feed, agent overlay).

## Glossary

- **Feature_Menu**: A UI component that displays all available features as interactive buttons or menu items
- **Voice_Orb**: The existing circular button at the bottom center of the screen used for voice interaction
- **Agent_Overlay**: The existing component that displays agent messages and cards floating above the camera
- **Camera_Layer**: The background layer showing the live camera feed or VTO results
- **Safe_Area**: The screen regions that avoid device notches, rounded corners, and system UI elements
- **Glassmorphism**: A design style using frosted glass effects with backdrop blur and transparency
- **VTO**: Virtual Try-On functionality for clothes, makeup, accessories, and hairstyles
- **Tool**: A backend function that performs a specific action (skin analysis, product search, etc.)
- **Dual_Access**: The ability to trigger any feature through either voice command or button tap
- **Feature_Discovery**: The ability for users to see and understand what features are available

## Requirements

### Requirement 1: Feature Menu Display

**User Story:** As a user, I want to see all available features in a menu, so that I can discover what the app can do without memorizing voice commands.

#### Acceptance Criteria

1. THE Feature_Menu SHALL display all 13 available features as interactive items
2. WHEN the app loads, THE Feature_Menu SHALL be visible and accessible without requiring user action
3. THE Feature_Menu SHALL group features by category (Beauty Analysis, Virtual Try-On, Shopping, Context, Closet)
4. THE Feature_Menu SHALL display each feature with an icon and descriptive label
5. THE Feature_Menu SHALL use glassmorphism styling consistent with the Lumina Ethos design system
6. THE Feature_Menu SHALL not obscure the Voice_Orb, Camera_Layer, or Agent_Overlay
7. THE Feature_Menu SHALL be positioned within Safe_Area boundaries on all mobile devices

### Requirement 2: Feature Activation via Button

**User Story:** As a user, I want to tap a feature button to activate it, so that I can use features without speaking voice commands.

#### Acceptance Criteria

1. WHEN a user taps a feature button, THE Feature_Menu SHALL trigger the corresponding Tool
2. WHEN a Tool requires parameters (e.g., garment URL for try_on_clothes), THE Feature_Menu SHALL prompt the user for input
3. WHEN a Tool is executing, THE Feature_Menu SHALL display a loading state for that feature
4. WHEN a Tool completes, THE Feature_Menu SHALL display the result through the existing Agent_Overlay
5. THE Feature_Menu SHALL maintain the same behavior as voice-triggered tools (loading states, result display, error handling)
6. THE Feature_Menu SHALL support all 13 tools without requiring code changes to the backend

### Requirement 3: Touch-Friendly Interaction

**User Story:** As a mobile user, I want feature buttons to be easy to tap, so that I can interact with the app comfortably on my phone.

#### Acceptance Criteria

1. THE Feature_Menu SHALL provide tap targets of at least 44x44 pixels for all interactive elements
2. THE Feature_Menu SHALL provide visual feedback (hover/active states) when buttons are pressed
3. THE Feature_Menu SHALL prevent accidental taps through appropriate spacing between buttons
4. THE Feature_Menu SHALL support touch gestures (tap, scroll) without interfering with camera gestures
5. THE Feature_Menu SHALL disable tap-highlight color to avoid visual artifacts on mobile browsers

### Requirement 4: Responsive Layout

**User Story:** As a user on different devices, I want the feature menu to adapt to my screen size, so that it works well on both small and large screens.

#### Acceptance Criteria

1. WHEN the viewport width is less than 640px, THE Feature_Menu SHALL use a mobile-optimized layout
2. WHEN the viewport width is 640px or greater, THE Feature_Menu SHALL use a tablet/desktop-optimized layout
3. THE Feature_Menu SHALL use responsive font sizes (clamp) to scale text appropriately
4. THE Feature_Menu SHALL adjust spacing and padding based on viewport size
5. THE Feature_Menu SHALL maintain readability and usability across all supported screen sizes (320px to 1920px width)

### Requirement 5: Menu Visibility Control

**User Story:** As a user, I want to show or hide the feature menu, so that I can focus on the camera view when needed.

#### Acceptance Criteria

1. THE Feature_Menu SHALL provide a toggle button to show or hide the menu
2. WHEN the menu is hidden, THE Feature_Menu SHALL display a compact button or icon to reopen it
3. WHEN the menu is shown, THE Feature_Menu SHALL animate smoothly into view (300ms transition)
4. WHEN the menu is hidden, THE Feature_Menu SHALL animate smoothly out of view (300ms transition)
5. THE Feature_Menu SHALL remember the user's visibility preference within the current session
6. THE Feature_Menu SHALL default to visible on first app load

### Requirement 6: Feature Categorization

**User Story:** As a user, I want features grouped by category, so that I can quickly find the feature I need.

#### Acceptance Criteria

1. THE Feature_Menu SHALL group features into 5 categories: Beauty Analysis, Virtual Try-On, Shopping, Context, Closet
2. THE Feature_Menu SHALL display category headers with clear visual separation
3. THE Feature_Menu SHALL place "analyze_skin", "get_skin_tone", "get_face_attributes" in the Beauty Analysis category
4. THE Feature_Menu SHALL place "try_on_clothes", "try_on_makeup", "try_on_earrings", "try_on_necklace", "change_hairstyle" in the Virtual Try-On category
5. THE Feature_Menu SHALL place "search_products" in the Shopping category
6. THE Feature_Menu SHALL place "check_calendar", "check_weather" in the Context category
7. THE Feature_Menu SHALL place "match_closet", "generate_proof_card" in the Closet category

### Requirement 7: Accessibility Compliance

**User Story:** As a user with accessibility needs, I want the feature menu to be accessible, so that I can use the app with assistive technologies.

#### Acceptance Criteria

1. THE Feature_Menu SHALL provide ARIA labels for all interactive elements
2. THE Feature_Menu SHALL support keyboard navigation (Tab, Enter, Escape)
3. THE Feature_Menu SHALL provide sufficient color contrast (WCAG AAA: 7:1 for normal text, 4.5:1 for large text)
4. THE Feature_Menu SHALL announce state changes to screen readers (menu open/closed, feature activated)
5. THE Feature_Menu SHALL provide focus indicators for keyboard navigation
6. THE Feature_Menu SHALL support screen reader announcements for loading states and results

### Requirement 8: Voice-First Preservation

**User Story:** As a user who prefers voice interaction, I want the voice orb to remain the primary interaction method, so that the UI doesn't interfere with my preferred workflow.

#### Acceptance Criteria

1. THE Feature_Menu SHALL not auto-focus or steal focus from the Voice_Orb
2. THE Feature_Menu SHALL not block or obscure the Voice_Orb at any screen size
3. THE Feature_Menu SHALL not interfere with voice command processing
4. WHEN a voice command is active, THE Feature_Menu SHALL display the same loading states as button-triggered features
5. THE Feature_Menu SHALL maintain visual hierarchy with the Voice_Orb as the most prominent UI element

### Requirement 9: Design System Consistency

**User Story:** As a user, I want the feature menu to match the app's visual style, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Feature_Menu SHALL use CSS variables from the Lumina Ethos design system (--glass-bg, --glass-border, --glass-blur, etc.)
2. THE Feature_Menu SHALL use the Noto Serif font for headings and Inter font for body text
3. THE Feature_Menu SHALL use the app's color palette (--primary, --secondary, --accent, --on-surface, etc.)
4. THE Feature_Menu SHALL use the app's border radius values (--radius-sm, --radius-md, --radius-lg, --radius-xl)
5. THE Feature_Menu SHALL use the app's animation timing (300ms ease-in-out)
6. THE Feature_Menu SHALL use the app's spacing scale (4px grid system)

### Requirement 10: Parameter Input Handling

**User Story:** As a user, I want to provide required parameters for features, so that I can use features that need additional information.

#### Acceptance Criteria

1. WHEN a feature requires a URL parameter (try_on_clothes, try_on_earrings, try_on_necklace, change_hairstyle), THE Feature_Menu SHALL display an input field
2. WHEN a feature requires a text parameter (search_products query), THE Feature_Menu SHALL display a text input field
3. WHEN a feature requires a location parameter (check_weather), THE Feature_Menu SHALL display a location input field with optional default
4. WHEN a user submits a parameter, THE Feature_Menu SHALL validate the input format before triggering the Tool
5. WHEN a parameter is invalid, THE Feature_Menu SHALL display an error message and prevent Tool execution
6. THE Feature_Menu SHALL provide placeholder text and examples for all input fields

### Requirement 11: Loading State Synchronization

**User Story:** As a user, I want to see consistent loading states, so that I know when a feature is processing regardless of how I triggered it.

#### Acceptance Criteria

1. WHEN a Tool is executing, THE Feature_Menu SHALL display a loading indicator on the corresponding feature button
2. WHEN a Tool is executing, THE Feature_Menu SHALL disable the feature button to prevent duplicate requests
3. WHEN a Tool is executing, THE Feature_Menu SHALL display the same loading message in the Agent_Overlay as voice-triggered tools
4. WHEN a Tool completes, THE Feature_Menu SHALL remove the loading indicator and re-enable the button
5. WHEN a Tool fails, THE Feature_Menu SHALL display an error state and re-enable the button

### Requirement 12: Menu Positioning Strategy

**User Story:** As a user, I want the feature menu positioned conveniently, so that it doesn't interfere with the camera view or other UI elements.

#### Acceptance Criteria

1. THE Feature_Menu SHALL be positioned at the top or side of the screen to avoid the Voice_Orb (bottom center)
2. THE Feature_Menu SHALL not overlap the Agent_Overlay message area (bottom 20-60% of screen)
3. THE Feature_Menu SHALL not cover the Camera_Layer center area where faces are typically positioned
4. THE Feature_Menu SHALL adjust position based on viewport orientation (portrait vs landscape)
5. THE Feature_Menu SHALL use z-index layering to appear above Camera_Layer but below Agent_Overlay modals

### Requirement 13: Feature Icon System

**User Story:** As a user, I want visual icons for each feature, so that I can quickly identify features at a glance.

#### Acceptance Criteria

1. THE Feature_Menu SHALL display a unique icon for each of the 13 features
2. THE Feature_Menu SHALL use SVG icons for scalability and performance
3. THE Feature_Menu SHALL use icons consistent with the Lumina Ethos design aesthetic
4. THE Feature_Menu SHALL size icons appropriately for mobile (20-24px) and desktop (24-28px)
5. THE Feature_Menu SHALL use icon colors that provide sufficient contrast against the glassmorphism background

