# Game of Life 3D Documentation

## Overview
Game of Life 3D is a spatial adaptation of Conway's cellular automaton. It operates on a 3D grid where cells live or die based on their neighbors.

## Controls

### Rotation & View
- **V**: Toggle View Mode (Swivel/Roll)
- **E**: Toggle Edit Mode (Selector/Painting)
- **O, K, ., ;**: Rotate View (Swivel)
- **I, P**: Rotate View (Roll)
  - `[UX-1]` In Edit Mode with a brush active, these keys rotate the brush in the reversed direction to match visual expectations.

### Editing
- **W, A, S, D, Q, Z**: Move selector
- **B**: Activate Birth (Paint) tool
- **C**: Activate Clear (Erase) tool
- **[ , ]**: Increase/Decrease brush size

### Simulation
- **Space**: Play/Stop simulation
- **R**: Reset to initial state
- **L**: Toggle Auto-Square
  - `[UX-2]` When toggled Off, any active squaring animation stops immediately.
  - `[UX-3]` In Edit Mode, if Auto-Square is Off, keyboard rotation keys provide continuous swivel/roll instead of 90-degree snaps.

## Testing & Validation
This project follows a strict "Claim -> Test" methodology. All UI behaviors described above are matched with automated tests in the `src/__tests__` directory.
