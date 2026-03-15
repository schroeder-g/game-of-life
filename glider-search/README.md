# Glider Search Infrastructure

This directory contains high-performance search engines used to discover 3D gliders and spaceships for the Cube of Life engine.

## Contents

- **`spaceship_search.cpp`**: A symmetry-enforced search engine. It uses bilateral symmetry to prune the search space, making it much easier to find stable, complex translating structures (8-14+ cells).
- **`face_only_search.cpp`**: A search engine specifically constrained to the 6-neighbor "Face-Only" (Von Neumann) neighborhood, as opposed to the full 26-neighbor Moore neighborhood.

## Usage

These are written in standard C++11 for maximum performance. To compile and run:

```bash
g++ -O3 -std=c++11 <filename>.cpp -o search_engine
./search_engine
```

## How it works

The engines use a flattened 1D `Uint8Array` (represented as a `char` array in C++) to simulate generations at extreme speeds (millions of permutations per minute). They randomly seed shapes, simulate for $X$ generations, and use normalization/bounding-box checks to detect if a shape has translated in space without decaying or exploding.
