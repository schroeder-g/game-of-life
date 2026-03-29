# Release Notes

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
