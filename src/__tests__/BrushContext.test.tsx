import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrushProvider, useBrush } from '../contexts/BrushContext';
import React from 'react';
import '../tests/setup-browser-env'; // Import the browser environment setup

// Wrapper for the context
const wrapper = ({ children }: { children: React.ReactNode }) => (
	<BrushProvider>{children}</BrushProvider>
);

describe('BrushContext', () => {
	it('[UC-5] should initialize with default values', () => {
		const { result } = renderHook(() => useBrush(), { wrapper });
		expect(result.current.state.selectedShape).toBe('Single Cell');
		expect(result.current.state.shapeSize).toBe(1);
		expect(result.current.state.paintMode).toBe(0);
		expect(result.current.state.selectedOrganismBrushRules).toBeNull();
	});

	it('[UC-6] should save an organism as a brush and select it', () => {
		const { result } = renderHook(() => useBrush(), { wrapper });

		const mockOrganism = {
			id: 'org1',
			name: 'Test Organism',
			livingCells: new Set(['0,0,0', '0,0,1']),
			skinColor: '#FFFFFF',
			previousLivingCells: new Set(),
			cytoplasm: new Set(),
			straightSteps: 0,
			avoidanceSteps: 0,
			parallelSteps: 0,
			stuckTicks: 0,
			eatenCount: 0,
			rules: {
				surviveMin: 2,
				surviveMax: 3,
				birthMin: 3,
				birthMax: 3,
				birthMargin: 0,
				neighborFaces: true,
				neighborEdges: false,
				neighborCorners: false,
			},
		};

		act(() => {
			result.current.actions.saveOrganismAsBrush(mockOrganism);
		});

		expect(result.current.state.organismBrushes.has('org1')).toBe(true);
		expect(result.current.state.selectedOrganismBrushId).toBe('org1');
		expect(result.current.state.selectedShape).toBe('Organism Brush');
		expect(result.current.state.selectedOrganismBrushRules).toEqual(mockOrganism.rules);

		const savedBrush = result.current.state.organismBrushes.get('org1');
		expect(savedBrush?.name).toBe('Test Organism');
		expect(savedBrush?.cells.length).toBe(2); // Based on livingCells
		expect(savedBrush?.rules).toEqual(mockOrganism.rules);
		// Centroid of (0,0,0), (0,0,1) is (0,0,0.5).
		// Relative offsets rounded: (0,0,0) - (0,0,0.5) = (0,0,0)
		// (0,0,1) - (0,0,0.5) = (0,0,0.5) -> (0,0,1)
		expect(result.current.state.customOffsets).toEqual(
			expect.arrayContaining([[0, 0, 0], [0, 0, 1]])
		);
		expect(result.current.state.customOffsets.length).toBe(2);
	});

	it('[UC-7] should persist organism brushes to localStorage', () => {
		const { result, unmount } = renderHook(() => useBrush(), { wrapper });

		const mockOrganism = {
			id: 'org2',
			name: 'Persistent Organism',
			livingCells: new Set(['1,1,1']),
			skinColor: '#000000',
			previousLivingCells: new Set(),
			cytoplasm: new Set(),
			straightSteps: 0,
			avoidanceSteps: 0,
			parallelSteps: 0,
			stuckTicks: 0,
			eatenCount: 0,
			rules: {
				surviveMin: 1,
				surviveMax: 2,
				birthMin: 2,
				birthMax: 2,
				birthMargin: 1,
				neighborFaces: false,
				neighborEdges: true,
				neighborCorners: true,
			},
		};

		// Save a brush
		act(() => {
			result.current.actions.saveOrganismAsBrush(mockOrganism);
		});

		// Verify it's in the current state
		expect(result.current.state.organismBrushes.has('org2')).toBe(true);

		// Unmount the component to trigger localStorage save
		unmount();

		// Re-render the hook to simulate a fresh load
		const { result: newResult } = renderHook(() => useBrush(), { wrapper });

		// Check if the brush is loaded from localStorage
		expect(newResult.current.state.organismBrushes.has('org2')).toBe(true);
		const loadedBrush = newResult.current.state.organismBrushes.get('org2');
		expect(loadedBrush?.name).toBe('Persistent Organism');
		expect(loadedBrush?.rules).toEqual(mockOrganism.rules);
	});

	it('[UC-8] should correctly set customOffsets when an organism brush is selected', () => {
		const { result } = renderHook(() => useBrush(), { wrapper });

		const mockOrganism = {
			id: 'org3',
			name: 'Another Organism',
			livingCells: new Set(['10,10,10', '10,10,11', '11,10,10']),
			skinColor: '#FF00FF',
			previousLivingCells: new Set(),
			cytoplasm: new Set(),
			straightSteps: 0,
			avoidanceSteps: 0,
			parallelSteps: 0,
			stuckTicks: 0,
			eatenCount: 0,
			rules: {
				surviveMin: 1, surviveMax: 2, birthMin: 2, birthMax: 2, birthMargin: 0,
				neighborFaces: true, neighborEdges: false, neighborCorners: false,
			},
		};

		act(() => {
			result.current.actions.saveOrganismAsBrush(mockOrganism);
		});

		// The saveOrganismAsBrush action should automatically select it
		expect(result.current.state.selectedOrganismBrushId).toBe('org3');
		expect(result.current.state.selectedShape).toBe('Organism Brush');

		// Expected relative offsets after rounding:
		// Cells: (10,10,10), (10,10,11), (11,10,10)
		// minX=10, maxX=11 => centerX = 10.5
		// minY=10, maxY=10 => centerY = 10
		// minZ=10, maxZ=11 => centerZ = 10.5
		//
		// (10-10.5, 10-10, 10-10.5) = (-0.5, 0, -0.5) => rounded: (0, 0, 0)
		// (10-10.5, 10-10, 11-10.5) = (-0.5, 0, 0.5) => rounded: (0, 0, 1)
		// (11-10.5, 10-10, 10-10.5) = (0.5, 0, -0.5) => rounded: (1, 0, 0)
		const expectedOffsets: [number, number, number][] = [[0, 0, 0], [0, 0, 1], [1, 0, 0]];
		expect(result.current.state.customOffsets).toEqual(expect.arrayContaining(expectedOffsets));
		expect(result.current.state.customOffsets.length).toBe(expectedOffsets.length);
	});

	it('[UX-1] should change shape size correctly', () => {
		const { result } = renderHook(() => useBrush(), { wrapper });
		// First switch to Cube so changeSize is not blocked
		act(() => {
			result.current.actions.setSelectedShape('Cube');
		});
		act(() => {
			result.current.actions.changeSize(1, 100);
		});
		// Should be at min 2 for Cube + 1 = 3
		expect(result.current.state.shapeSize).toBe(3);
	});

	it('[UC-4] should toggle paint modes correctly', () => {
		const { result } = renderHook(() => useBrush(), { wrapper });
		act(() => {
			result.current.actions.setPaintMode(1);
		});
		expect(result.current.state.paintMode).toBe(1);

		act(() => {
			result.current.actions.setPaintMode(0);
		});
		expect(result.current.state.paintMode).toBe(0);
	});
});
