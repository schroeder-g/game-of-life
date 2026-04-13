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
