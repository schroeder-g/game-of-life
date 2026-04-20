# Release Notes

### **Thursday, April 16, 2026 (Version 1.9.9)**
- **Features**: 
    - **Blog Navigation**: Added a dedicated "Blog" link to the header panel, featuring a custom Home icon for quick access to the Cube of Life community updates.
- **Bug Fixes**:
    - **Favicon Resolution**: Fixed a persistent issue where the site icon was not appearing. The file was identified as a PNG data blob incorrectly named as an `.ico`; I've renamed it to `favicon.png` and updated the HTML meta tags with the correct MIME type for maximum browser compatibility.
    - **Iconography Polish**: Standardized internal SVG components to ensure clean rendering on high-DPI displays.
- **Internal**:
    - Synchronized package version to **1.9.9**.

---

### **Tuesday, April 14, 2026 (Version 1.9.7)**
- **Features**: 
    - **Standard Organism Library**: Expanded the built-in brush list with four new biology presets: "Gemini Coaster", "EZ Coaster", "Gemini Pele-Copter", and the multi-cluster "Rhea".
    - **Structural Bridging**: Enhanced organism connectivity logic to treat cytoplasm as a structural "bridge." This allows organisms with non-contiguous nuclear clusters (like Rhea) to maintain their structural integrity across simulation ticks.
    - **Clean Scene Loading**: Optimized the loading sequence to immediately clear organisms and community graphics when selecting a new scene configuration, preventing "ghosting" artifacts during initialization.
- **Bug Fixes**:
    - **Initialization Stability**: Resolved a critical `ReferenceError` during `SimulationProvider` startup by standardizing the declaration sequence of all internal state and action hooks.
    - **Export Robustness**: Implemented a comprehensive fallback copy mechanism for the Organism Export tool to ensure reliability in hosting environments where the modern Clipboard API is restricted or unavailable.
    - **Connectivity logic**: Fixed a bug where organisms with intentional nuclear gaps would erroneously split into separate clusters during the Game of Life phase.
- **Internal**:
    - Reorganized `SimulationContext.tsx` to group state, refs, and callbacks for better maintainability and to eliminate Temporal Dead Zone (TDZ) risks.
    - Synchronized package version to **1.9.7**.

---

### **Tuesday, April 14, 2026 (Version 1.9.6)**
- **Features**: 
    - **Organism Brush System**: Introduced the ability to capture any organism as a reusable brush. These brushes are persisted across sessions and include the organism's unique geometry and biological rules.
    - **Per-Organism GOL Rules**: Enabled independent survival and birth rules for individual organisms. Biological settings are now inherited during creation and maintained regardless of changes to the global environment.
    - **Community Selection Shortcut**: Added **Alt/Option-Click** functionality to manually append cells to the currently selected community brush, allowing for "surgical" community construction.
    - **Consolidated Brush Controls**: Unified shape and organism brush selection into a single, draggable "Brush Controls" panel. Simplified the main brush button to an icon-only design with identification labels moved to the panel header.
- **Bug Fixes**:
    - **Persistence Stability**: Resolved a critical issue where legacy organism brushes would stubbornly re-appear after manual clearing due to a storage key collision and argument-order bug in the persistence hook.
    - **Submenu Polish**: Fixed multiple UI issues in the brush selector, including submenu overlaps, premature closing, and inconsistent visibility during hovering.
    - **Simulation Robustness**: Corrected data structure access for organism simulation ticks, preventing immediate organism death on the first step of the simulation.
    - **Data Validation**: Implemented strict validation for stored organism data to prevent application crashes caused by malformed or legacy local storage entries.
- **Internal**:
    - Refactored organism architecture to group simulation rules into a dedicated `rules` object for better serialization and portability.
    - Synchronized package version to **1.9.6**.

---

### **Sunday, April 12, 2026 (Version 1.9.5)**
- **Features**: 
    - **WAXDQZ Navigation Refinement**: Corrected the brush movement direction on the Z-axis in Edit mode. The brush now moves intuitively away from or towards the viewer by compensating for the renderer's coordinate inversion.
    - **Developer Utils**: Included `calc_keymap.js`, the core script used to calculate the project's orientation-aware keyboard mappings, in the internal scripts directory.
- **Bug Fixes**:
    - **Keyboard Mapping**: fixed a critical duplicate key bug and missing movement key on the **Right** face at **90°** rotation.
    - **Logic Polish**: Fixed a typo in the rotation control mapping for the **Bottom** face at **270°**.
    - **Type Safety**: Resolved multiple TypeScript "non-overlapping comparison" errors related to `'unknown'` camera orientation states, improving codebase robustness.
- **Internal**:
    - Synchronized package version to **1.9.5**.

---

### **Wednesday, April 8, 2026**
- **Features**: 
    - **Community Panel Redesign**: Streamlined stats into a three-row layout (Cells/Cytoplasm, Heading, and One-line Wall Distances) and removed redundant container boxes.
    - **New Scene**: Added "**Four JEllies**" to preinstalled scenes, featuring Juno, Maya, Elara, and Freya with preserved AI states.
    - **Auto-Selection**: Organisms are now automatically selected upon conversion from a community.
    - **Responsive UI Defaults**: Settings sidebar now defaults to **ON** on desktop and **OFF** on mobile. Added a red "X" close button for easier sidebar dismissal on mobile.
    - **Mobile Optimization**: Hid "Fit" and "Recenter" buttons on small screens to reduce header clutter.
- **Bug Fixes**:
    - Resolved a critical selection bug where clicking a community would immediately clear the selection state.
    - Fixed the Community Panel disappearing on large screens when the sidebar was toggled.
    - Standardized "Visualization" header font and unified checkbox margins (2px) and sizing.
- **Refactoring**:
    - Relocated the Community Panel to the root application layer in `App.tsx` for persistent visibility.
- **Internal**:
    - Updated `OrganismData` interface to support persistence of biological AI markers (`straightSteps`, `avoidanceSteps`, etc.).

---


### **Thursday, April 2, 2026 (Version 1.9.0)**
- **Features**:
    - Implemented custom build datetime format (YYYY.MM.DD.HH.NN).
    - Aligned user and build information to the right side of the footer.
    - Enhanced visual distinction for active tab buttons in the shortcut overlay.
- **Bug Fixes**:
    - Ensured accurate version, build time, and distribution display in AppHeaderPanel and AppFooterPanel across all build modes (dev, test, prod).
    - Resolved `process is not defined` errors in development builds by correctly defining environment variables.
    - Fixed build time not showing in development mode.
    - Corrected prop passing to `AppFooterPanel` to resolve `state is not defined` error.
    - Removed deprecated `dev-welcome` claim and associated test IDs for documentation consistency.
- **Refactoring**:
    - Refactored `AppFooterPanel` props for improved type safety.
    - Unified tab button background and text color in the shortcut overlay.
- **Internal**:
    - Updated package version to 1.9.0.
    - Updated internal AI instructions for release notes file path.

---

### **Wednesday, April 1, 2026**
- **Features**: Extracted community selection into a movable **Community Panel** with 3D preview and stats. Enhanced **Brush Controls** with draggability, keyboard rotation, and dynamic positioning. Implemented a data-driven **Documentation System** with searchable claims and visual hints.
- **Bug Fixes**: Resolved UI stability issues (hook/render errors), optimized z-index layering, and corrected brush selector overflow.
- **Testing**: Added automated test coverage for header controls and established a **Data Integrity** check to ensure docs and tests stay in sync.
- **Documentation**: Significantly expanded user manual content and added AI-driven audit workflows for project maintainability.
- **Refactoring**: Renamed Main Menu to **Settings Sidebar** and unified camera navigation modes (view vs edit) for consistency.

---

Welcome to the latest updates for **Cube of Life**! Here are the changes from the past week (March 23 - March 29, 2026).

---

### **Sunday, March 29**
- **Dropdown Fix**: Prevented the help dropdown from appearing off-screen on narrow viewports by implementing right-alignment.
- **Introduction Modal**: Added a welcome screen that appears on load to help new users understand the basic concepts and controls.
- **UI Refactoring**: Extracted header actions into a dedicated `AppHeaderPanelButtons` component for better code maintainability.
- **Layering Improvements**: Adjusted `z-index` values to ensure tooltips and brush previews correctly overlay other UI elements.
- **Shortcuts Overlay**: Introduced a dedicated menu item for viewing all keyboard shortcuts.

### **Saturday, March 28**
- **Project Expansion**: Updated project version to **2.3.0**.
- **Camera Navigation**: Refined the "Flight Simulator" camera model with time-based easing for smoother, more stable movement.
- **Bug Fix**: Resolved a TypeScript error in the Main Menu regarding missing simulation state properties.

### **Friday, March 27**
- **Edit Mode Symmetry**: Enforced true geometry symmetry when building shapes like Cubes and Spheres.
- **Animated View Transitions**: Implemented 1.0s ease-in animations for **Square-Up** and **Fit Display** actions, preserving camera distance for better context.
- **Dynamic UI**: Added color feedback to the Square Up button to indicate alignment status (Off/Aligning/Squared).
- **Navigation Unification**: Merged edit and view mode rotation routines to ensure consistent axis control.

### **Thursday, March 26**
- **Brush Performance**: Optimized brush preview rendering to hide the default cell cursor when a brush is active.
- **Visual Clarity**: Brush cells are now rendered as solid white, improving visibility against complex backgrounds.
- **Rotation Logic**: Brushes now rotate around their bounding box center rather than the grid origin.

### **Wednesday, March 25**
- **Flight Sim Mode**: Introduced a new camera navigation model that feels more like a flight simulator, including pitch, yaw, and roll controls.
- **Multi-Axis Inversion**: Added options to invert camera axes for a personalized navigation experience.
- **Centering Fix**: Corrected cube rotations to always occur around the geometric center.

### **Tuesday, March 24**
- **Brush Mode Refinement**: Fixed an issue where the brush could get stuck in an inconsistent state during mode toggles.
- **Context-Aware Controls**: Brush rotation keys ('i' and 'p') are now reversed when using destructive tools like the **Clear Brush**, making rotation more intuitive.
- **Auto-Square Toggle**: Added the ability to toggle automatic alignment snapping.

### **Monday, March 23**
- **Integrated Brushes**: Unified the brush and cursor systems, allowing the cursor to act as a "Single Cell" brush shape.
- **Enhanced Visualization**: Added surface glow and instanced mesh optimizations to brush projection guides.
- **Persistent Interaction**: Enabled a "persistent brush" mode that keeps the projection active while navigating.
- **Community Features**: Implemented the ability to select a "Community" of cells from the grid to use as a custom brush shape.
