import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { Scene } from '../components/Grid';
import { SimulationProvider } from '../contexts/SimulationContext';
import { BrushProvider } from '../contexts/BrushContext';
import React from 'react';
import '../tests/setup-browser-env'; // Import the browser environment setup

// Mock Three.js and Fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: () => ({ camera: { matrix: { elements: [] } }, clock: { getElapsedTime: () => 0 } }),
}));

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: any) => <div>{children}</div>,
  PerspectiveCamera: () => null,
  OrbitControls: () => null,
}));

describe('Grid Component UI Claims', () => {
  it('[CORE-1] should render the Scene without error', () => {
    render(
      <SimulationProvider>
        <BrushProvider>
          <Scene />
        </BrushProvider>
      </SimulationProvider>
    );
    expect(true).toBe(true);
  });
});
