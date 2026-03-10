# Game of Life

An interactive 3D implementation of Conway's Game of Life built with React, Three.js, and React Three Fiber. This project brings the classic mathematical cellular automaton into the modern era with a beautiful, high-performance WebGL rendering engine. Leveraging Bun as an ultra-fast all-in-one JavaScript runtime and bundler, the visualization features interactive parameter controls. This allows users to easily explore the fascinating emergent behaviors, intricate structures, and complex patterns of the Game of Life in a three-dimensional environment.

Users can also customize which neighbors count toward the rule evaluation (faces, edges, and corners) via checkboxes in the rules panel — at least one must always be selected. The engine persists these settings between sessions.

The brush panel has a **Hollow** checkbox that toggles whether generated shapes (Cube, Sphere, Pyramid) are filled or just shells. It's always visible and grayed out for shapes that don't support hollowing, and the preference is cleared when switching to an unsupported shape.

## Prerequisites

This project uses [Bun](https://bun.sh/) as its JavaScript runtime and package manager. You must have Bun installed to run the application.

To install Bun on macOS, Linux, or WSL, run:

```bash
curl -fsSL https://bun.sh/install | bash
```

_For Windows, you can install Bun via npm: `npm install -g bun`_

## Getting Started

1. **Clone the repository:**

```bash
git clone https://github.com/schroeder-g/game-of-life.git
cd game-of-life
```

2. **Install dependencies:**

```bash
bun install
```

## Running the Application

This project includes the following scripts defined in `package.json`:

- **Start the development server:**

  ```bash
  bun run dev
  ```

  This will execute `bun --watch run src/server.ts`, starting the server with hot-reloading enabled.

- **Build for production:**
  ```bash
  bun run build
  ```
  This command bundles the client-side React application into the `dist` directory.

## Contributing

Contributions are always welcome! If you'd like to help improve the project, please follow these steps:

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request (`gh pr create --title "feat: add some amazing feature" --body "Add some amazing feature"`).
