import { describe, it, expect, beforeEach } from 'vitest';
import { Grid3D } from '../core/Grid3D';

describe('Grid3D', () => {
  let grid: Grid3D;

  beforeEach(() => {
    grid = new Grid3D(10);
  });

  it('should initialize with correct size and empty cells', () => {
    expect(grid.size).toBe(10);
    expect(grid.get(0, 0, 0)).toBe(false);
    expect(grid.get(9, 9, 9)).toBe(false);
  });

  it('should not throw on out of bounds get', () => {
    expect(grid.get(-1, 0, 0)).toBe(false);
    expect(grid.get(10, 10, 10)).toBe(false);
  });

  it('should set and get cell states correctly', () => {
    grid.set(1, 2, 3, true);
    expect(grid.get(1, 2, 3)).toBe(true);
    expect(grid.get(0, 0, 0)).toBe(false); 
  });

  it('should ignore out of bounds set', () => {
    grid.set(-1, 0, 0, true);
    expect(grid.get(-1, 0, 0)).toBe(false);
  });

  it('should toggle cell states correctly', () => {
    grid.toggle(5, 5, 5);
    expect(grid.get(5, 5, 5)).toBe(true);
    grid.toggle(5, 5, 5);
    expect(grid.get(5, 5, 5)).toBe(false);
  });

  it('should clear all cells', () => {
    grid.set(1, 1, 1, true);
    grid.set(2, 2, 2, true);
    grid.clear();
    expect(grid.get(1, 1, 1)).toBe(false);
    expect(grid.get(2, 2, 2)).toBe(false);
    expect(grid.generation).toBe(0);
  });

  it('should save and restore state', () => {
    grid.set(1, 1, 1, true);
    grid.set(2, 2, 2, true);
    const state = grid.saveState();
    expect(state).toHaveLength(2);
    
    grid.clear();
    expect(grid.get(1, 1, 1)).toBe(false);
    
    grid.restoreState(state);
    expect(grid.get(1, 1, 1)).toBe(true);
    expect(grid.get(2, 2, 2)).toBe(true);
  });

  it('should simulate a tick correctly (survival)', () => {
    // Setup a stable 2x2 square in 2D plane (Z=0)
    grid.set(1, 1, 0, true);
    grid.set(1, 2, 0, true);
    grid.set(2, 1, 0, true);
    grid.set(2, 2, 0, true);
    
    // With default neighbors (faces/edges/corners = true/true/false)
    // A cell in a 2x2 square has 2 face neighbors + 1 edge neighbor = 3 neighbors
    // Let's pass: surviveMin=3, surviveMax=3, birthMin=3, birthMax=3
    grid.tick(3, 3, 3, 3);
    
    expect(grid.get(1, 1, 0)).toBe(true);
    expect(grid.get(1, 2, 0)).toBe(true);
    expect(grid.get(2, 1, 0)).toBe(true);
    expect(grid.get(2, 2, 0)).toBe(true);
  });
});
