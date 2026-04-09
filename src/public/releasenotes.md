# Release Notes

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
