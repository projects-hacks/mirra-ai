# Implementation Plan: Feature Discoverability UI

## Overview

This implementation adds a visual feature menu to the Mirra voice agent app, allowing users to discover and activate all 13 available features through buttons while maintaining the voice-first experience. The implementation extends the existing AppProvider state management, creates three new components (FeatureMenu, FeatureButton, ParameterModal), and integrates with the existing tool execution flow.

**Technical Stack**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React icons

**Integration Points**: AppProvider reducer, useVoiceAgent hook, existing ToolName constants, AgentOverlay display

## Tasks

- [x] 1. Set up feature catalog and type definitions
  - Create `src/types/features.ts` with FeatureConfig, FeatureCategory, and ParameterConfig interfaces
  - Create `src/constants/featureCatalog.ts` with FEATURE_CATALOG constant containing all 13 features
  - Create `src/constants/parameterConfigs.ts` with PARAMETER_CONFIGS for features requiring input
  - Import Lucide React icons (Sparkles, Palette, ScanFace, Shirt, Circle, Gem, Scissors, Search, Cloud, Calendar, ShoppingBag, Shuffle, FileCheck)
  - _Requirements: 1.1, 1.4, 6.3-6.7, 13.1-13.3_

- [x] 2. Extend AppProvider state management
  - [x] 2.1 Add menu state to AppState interface
    - Add `menu: { isVisible: boolean; activeFeature: ToolName | null; showParameterModal: boolean }` to AppState in `src/contexts/AppProvider.tsx`
    - Initialize menu state with `isVisible: true, activeFeature: null, showParameterModal: false`
    - _Requirements: 1.2, 5.6_
  
  - [x] 2.2 Add menu actions to reducer
    - Add TOGGLE_MENU action to toggle `menu.isVisible`
    - Add SET_MENU_VISIBLE action with boolean payload
    - Add SET_ACTIVE_FEATURE action with ToolName | null payload
    - Add SHOW_PARAMETER_MODAL action with boolean payload
    - _Requirements: 5.1-5.4_
  
  - [ ]* 2.3 Write unit tests for menu reducer
    - Test TOGGLE_MENU toggles visibility correctly
    - Test SET_MENU_VISIBLE sets visibility to payload value
    - Test SET_ACTIVE_FEATURE updates activeFeature
    - Test SHOW_PARAMETER_MODAL updates showParameterModal
    - _Requirements: 5.1-5.4_

- [ ] 3. Checkpoint - Verify state management
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Implement FeatureButton component
  - [ ] 4.1 Create FeatureButton component
    - Create `src/components/features/FeatureButton.tsx` with FeatureButtonProps interface
    - Implement button with icon (24px), label (14px Inter), and optional description (12px Inter)
    - Add loading spinner state using existing loading indicator pattern
    - Add disabled state styling (opacity 0.5, cursor not-allowed)
    - Implement touch feedback (scale 0.98, opacity 0.8 on active)
    - Use glassmorphism styling (--glass-bg, --glass-border, --glass-blur)
    - Ensure 44x44px minimum touch target
    - _Requirements: 2.1, 3.1-3.3, 9.1-9.6, 13.4_
  
  - [ ]* 4.2 Write unit tests for FeatureButton
    - Test renders icon and label correctly
    - Test onClick handler called on click
    - Test loading state displays spinner and disables button
    - Test disabled state prevents onClick
    - Test touch feedback styles applied on active
    - _Requirements: 2.1, 3.2_

- [x] 5. Implement CategorySection component
  - [x] 5.1 Create CategorySection component
    - Create `src/components/features/CategorySection.tsx` with CategorySectionProps interface
    - Implement category header with label-caps styling (Noto Serif, 12px, uppercase, letter-spacing 0.1em)
    - Implement responsive grid: 1 column (mobile), 2 columns (min-width: 640px), 3 columns (min-width: 1024px)
    - Add gap-4 spacing between buttons
    - Map features array to FeatureButton components
    - _Requirements: 1.3, 4.1-4.5, 6.1-6.2_
  
  - [ ]* 5.2 Write unit tests for CategorySection
    - Test renders category title
    - Test renders correct number of FeatureButton components
    - Test passes correct props to each FeatureButton
    - Test responsive grid classes applied
    - _Requirements: 1.3, 6.1_

- [x] 6. Implement ParameterModal component
  - [x] 6.1 Create ParameterModal component
    - Create `src/components/features/ParameterModal.tsx` with ParameterModalProps interface
    - Implement full-screen backdrop (rgba(0,0,0,0.4) with backdrop-blur-lg)
    - Implement centered modal card with glassmorphism (max-width 400px)
    - Add slide-up animation (translateY(16px) → 0, 300ms ease-in-out)
    - Render input fields based on PARAMETER_CONFIGS[tool]
    - Implement URL validation using URL constructor with try-catch
    - Implement text validation (trim, min 1 character)
    - Display inline error messages below invalid fields (text-red-500, 12px)
    - Add Submit and Cancel buttons (44px height)
    - Handle Escape key to close modal
    - Handle backdrop click to close modal
    - _Requirements: 10.1-10.6, 9.5_
  
  - [x] 6.2 Add accessibility attributes to ParameterModal
    - Add role="dialog" and aria-modal="true" to modal
    - Add aria-labelledby pointing to modal title
    - Add aria-describedby pointing to modal description
    - Add aria-invalid and aria-errormessage to invalid inputs
    - Trap focus within modal when open
    - Return focus to trigger button on close
    - _Requirements: 7.1, 7.4_
  
  - [ ]* 6.3 Write unit tests for ParameterModal
    - Test renders correct input fields for each tool type
    - Test URL validation rejects invalid URLs
    - Test text validation rejects empty strings
    - Test onSubmit called with validated parameters
    - Test onCancel called on backdrop click
    - Test onCancel called on Escape key
    - Test error messages displayed for invalid input
    - _Requirements: 10.4-10.5_

- [ ] 7. Checkpoint - Verify component implementations
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement FeatureMenu container component
  - [x] 8.1 Create FeatureMenu component structure
    - Create `src/components/features/FeatureMenu.tsx` component
    - Use useAppContext hook to access state and dispatch
    - Implement MenuToggle button (hamburger icon, top-left, z-40, 44x44px)
    - Add safe area insets: `top: max(1rem, env(safe-area-inset-top))`, `left: max(1rem, env(safe-area-inset-left))`
    - Add aria-label="Open feature menu", aria-expanded, aria-controls attributes
    - _Requirements: 1.2, 1.7, 5.1-5.2, 7.1, 12.1_
  
  - [x] 8.2 Implement MenuPanel with animations
    - Create MenuPanel div with fixed positioning (top-0, left-0, right-0)
    - Add slide-down animation: translateY(-100%) when closed, translateY(0) when open
    - Add 300ms ease-in-out transition
    - Add backdrop blur overlay when menu open
    - Add safe area padding: `padding-top: max(1rem, env(safe-area-inset-top))`
    - Set z-index to 40
    - Add role="menu" and aria-label="Available features"
    - _Requirements: 1.6, 5.3-5.4, 9.5, 12.5_
  
  - [x] 8.3 Render CategorySection components
    - Group FEATURE_CATALOG by category using reduce or filter
    - Render CategorySection for each category: Beauty Analysis, Virtual Try-On, Shopping, Context, Closet
    - Pass filtered features array to each CategorySection
    - Add vertical spacing (space-y-6) between categories
    - _Requirements: 1.3, 6.1-6.7_
  
  - [x] 8.4 Implement feature activation logic
    - Create handleFeatureClick function accepting (tool: ToolName, requiresParams: boolean)
    - Check prerequisites: state.isConnected and state.selfie
    - If not connected, show toast "Not connected. Tap the mic to connect." and return
    - If no selfie, show toast "Please wait for camera to initialize" and return
    - If requiresParams, dispatch SHOW_PARAMETER_MODAL(true) and SET_ACTIVE_FEATURE(tool)
    - If no params, dispatch SET_CURRENT_TOOL(tool) and ADD_MESSAGE with loading message
    - Close menu after activation: dispatch SET_MENU_VISIBLE(false)
    - _Requirements: 2.1-2.6, 11.1-11.2_
  
  - [x] 8.5 Implement parameter submission handler
    - Create handleParameterSubmit function accepting (params: Record<string, string>)
    - Dispatch SET_CURRENT_TOOL with state.menu.activeFeature
    - Dispatch ADD_MESSAGE with loading message including parameters
    - Dispatch SHOW_PARAMETER_MODAL(false)
    - Dispatch SET_MENU_VISIBLE(false)
    - _Requirements: 10.4, 11.1-11.2_
  
  - [x] 8.6 Render ParameterModal conditionally
    - Render ParameterModal when state.menu.showParameterModal is true
    - Pass state.menu.activeFeature as tool prop
    - Pass handleParameterSubmit as onSubmit prop
    - Pass handler to close modal as onCancel prop
    - Set z-index to 50 (above menu panel)
    - _Requirements: 2.2, 10.1-10.3_

- [ ] 9. Add keyboard navigation support
  - [ ] 9.1 Implement keyboard handlers in FeatureMenu
    - Add Escape key handler to close menu
    - Add Tab key navigation through feature buttons
    - Add Enter key handler on feature buttons to activate
    - Prevent default Tab behavior to trap focus within menu when open
    - _Requirements: 7.2_
  
  - [ ]* 9.2 Write integration tests for keyboard navigation
    - Test Escape key closes menu
    - Test Tab key moves focus through buttons
    - Test Enter key activates focused feature
    - Test focus trapped within menu when open
    - _Requirements: 7.2, 7.5_

- [ ] 10. Implement loading state synchronization
  - [ ] 10.1 Add loading state logic to FeatureButton
    - Accept isLoading prop from parent
    - Determine isLoading based on state.currentTool === tool
    - Display loading spinner when isLoading is true
    - Disable button when isLoading is true
    - _Requirements: 11.1-11.2_
  
  - [ ] 10.2 Connect loading states in FeatureMenu
    - Create isFeatureLoading helper function: (tool: ToolName) => state.currentTool === tool
    - Pass isFeatureLoading(tool) to each FeatureButton as isLoading prop
    - Ensure loading state updates when state.currentTool changes
    - _Requirements: 11.1-11.4_
  
  - [ ]* 10.3 Write integration tests for loading states
    - Test button shows loading when tool executing
    - Test button disabled when tool executing
    - Test loading state removed when tool completes
    - Test loading state consistent between voice and button activation
    - _Requirements: 11.1-11.5_

- [ ] 11. Checkpoint - Verify feature activation flow
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integrate FeatureMenu into HomePage
  - [x] 12.1 Add FeatureMenu to page layout
    - Import FeatureMenu component in `src/app/page.tsx`
    - Add FeatureMenu component after CameraLayer and before AgentOverlay
    - Verify z-index layering: CameraLayer (z-10), VoiceOrb (z-20), AgentOverlay (z-30), FeatureMenu (z-40), ParameterModal (z-50)
    - _Requirements: 1.6, 12.5_
  
  - [x] 12.2 Verify no interference with existing components
    - Test Voice Orb remains clickable and visible
    - Test Agent Overlay displays above menu panel
    - Test Camera Layer visible in background
    - Test menu doesn't block center camera area
    - _Requirements: 1.6, 8.1-8.3, 12.2-12.3_

- [ ] 13. Add responsive styling and safe areas
  - [ ] 13.1 Implement responsive breakpoints
    - Add mobile styles (default): 1-column grid, full-width menu
    - Add tablet styles (min-width: 640px): 2-column grid
    - Add desktop styles (min-width: 1024px): 3-column grid
    - Use clamp() for responsive font sizes: `clamp(14px, 2vw, 16px)` for labels
    - _Requirements: 4.1-4.5_
  
  - [ ] 13.2 Add safe area inset support
    - Apply safe-area-inset-top to menu toggle and panel
    - Apply safe-area-inset-left and safe-area-inset-right to menu panel
    - Test on iPhone X+ simulator with notch
    - _Requirements: 1.7_
  
  - [ ]* 13.3 Write visual regression tests
    - Test mobile layout (375px width)
    - Test tablet layout (768px width)
    - Test desktop layout (1440px width)
    - Test safe area insets on notched devices
    - _Requirements: 4.1-4.5, 1.7_

- [ ] 14. Implement accessibility enhancements
  - [ ] 14.1 Add ARIA attributes to all components
    - Add aria-label to MenuToggle button
    - Add role="menu" to MenuPanel
    - Add role="group" and aria-labelledby to CategorySection
    - Add role="menuitem" to FeatureButton
    - Add aria-busy to loading buttons
    - _Requirements: 7.1_
  
  - [ ] 14.2 Add screen reader announcements
    - Add aria-live="polite" region for loading state changes
    - Announce "Loading [feature name]" when tool starts
    - Announce "Menu opened" / "Menu closed" on toggle
    - _Requirements: 7.4_
  
  - [ ] 14.3 Verify color contrast
    - Test all text colors against glassmorphism background
    - Ensure minimum 7:1 contrast for normal text (WCAG AAA)
    - Ensure minimum 4.5:1 contrast for large text (18px+)
    - Adjust colors if needed using CSS variables
    - _Requirements: 7.3_
  
  - [ ]* 14.4 Run accessibility audit
    - Run Lighthouse accessibility audit
    - Run axe DevTools accessibility scan
    - Fix any reported issues
    - Verify score of 95+ on Lighthouse
    - _Requirements: 7.1-7.6_

- [ ] 15. Add error handling and edge cases
  - [ ] 15.1 Handle WebSocket disconnection
    - Check state.isConnected before tool execution
    - Display toast notification if disconnected
    - Prevent tool execution until reconnected
    - _Requirements: 2.1_
  
  - [ ] 15.2 Handle missing selfie
    - Check state.selfie before tool execution
    - Display toast notification if selfie not available
    - Prevent tool execution until selfie captured
    - _Requirements: 2.1_
  
  - [ ] 15.3 Handle tool execution errors
    - Remove loading state on error
    - Re-enable feature button on error
    - Display error message in AgentOverlay (existing error handling)
    - Log error to console for debugging
    - _Requirements: 11.4-11.5_
  
  - [ ]* 15.4 Write integration tests for error scenarios
    - Test disconnected state prevents execution
    - Test missing selfie prevents execution
    - Test tool error removes loading state
    - Test error message displayed in AgentOverlay
    - _Requirements: 2.1, 11.5_

- [ ] 16. Checkpoint - Verify error handling and edge cases
  - Ensure all tests pass, ask the user if questions arise.

- [-] 17. Add styling polish and animations
  - [ ] 17.1 Implement glassmorphism styling
    - Use CSS variables: --glass-bg, --glass-border, --glass-blur
    - Apply backdrop-filter: blur(var(--glass-blur)) to menu panel and buttons
    - Add subtle border with --glass-border color
    - Add box-shadow for depth
    - _Requirements: 1.5, 9.1_
  
  - [x] 17.2 Add animation transitions
    - Menu slide-down: transform translateY(-100%) → translateY(0), 300ms ease-in-out
    - Button press: transform scale(1) → scale(0.98), opacity 1 → 0.8, 150ms ease-in-out
    - Modal fade-in: opacity 0 → 1, transform translateY(16px) → translateY(0), 300ms ease-in-out
    - Loading spinner: rotate 360deg, 1s linear infinite
    - _Requirements: 5.3-5.4, 9.5_
  
  - [ ] 17.3 Add touch interaction polish
    - Disable tap-highlight-color on all buttons
    - Add active:scale-98 and active:opacity-80 to buttons
    - Add transition-transform and transition-opacity
    - Ensure smooth 60fps animations
    - _Requirements: 3.2, 3.5_

- [ ] 18. Write end-to-end integration tests
  - [ ]* 18.1 Test feature activation flow (no parameters)
    - Open menu → Menu visible
    - Tap "Analyze Skin" → Loading state shown
    - Wait for completion → Result displayed in AgentOverlay
    - Verify menu closed after activation
    - _Requirements: 2.1-2.5_
  
  - [ ]* 18.2 Test feature activation flow (with parameters)
    - Open menu → Menu visible
    - Tap "Try On Clothes" → ParameterModal shown
    - Enter invalid URL → Error message shown
    - Enter valid URL → Modal closes, tool executes
    - Wait for completion → Result displayed in AgentOverlay
    - _Requirements: 2.2, 10.1-10.5_
  
  - [ ]* 18.3 Test voice-button parity
    - Trigger "Analyze Skin" via voice → Loading state shown in menu
    - Trigger "Analyze Skin" via button → Same loading state
    - Verify both produce identical state changes
    - Verify both display results in AgentOverlay
    - _Requirements: 2.5, 11.3-11.4_
  
  - [ ]* 18.4 Test menu visibility persistence
    - Open menu → Menu visible
    - Close menu → Menu hidden
    - Refresh page → Menu visible (default state)
    - _Requirements: 5.5-5.6_

- [ ] 19. Final checkpoint - Complete testing and verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Documentation and cleanup
  - [ ] 20.1 Add JSDoc comments to all components
    - Document FeatureMenu component and props
    - Document FeatureButton component and props
    - Document ParameterModal component and props
    - Document CategorySection component and props
    - Document helper functions and utilities
    - _Requirements: All_
  
  - [ ] 20.2 Update README or documentation
    - Document new feature menu functionality
    - Document how to add new features to catalog
    - Document parameter configuration format
    - Document accessibility features
    - _Requirements: All_
  
  - [ ] 20.3 Clean up console logs and debug code
    - Remove any console.log statements
    - Remove any debug-only code
    - Verify no TypeScript errors or warnings
    - Run linter and fix any issues
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- All components use TypeScript for type safety
- All styling uses Tailwind CSS and CSS variables from Lumina Ethos design system
- Integration with existing AppProvider pattern maintains consistency
- No backend changes required - all 13 tools already supported
- Focus on mobile-first responsive design with safe area support
- Accessibility is built-in from the start, not added later
