// AGENT INSTRUCTION:
// The keyboard control logic, especially for rotation, is sourced from
// `src/core/faceOrientationKeyMapping.ts`. To ensure consistency, please avoid
// adding new keyboard control logic here. Instead, modify the mappings in
// the source of truth file.

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useBrush } from '../contexts/BrushContext';
import { useSimulation } from '../contexts/SimulationContext';
import {
	getWASDMapping,
	getExplicitRotationAxis,
	getNextOrientation,
	type CubeFace,
	type CameraRotation,
} from '../core/faceOrientationKeyMapping';

export function useAppShortcuts() {
	const {
		state: {
			running,
			viewMode,
			cameraOrientation,
			isAnimatingInit,
			hasInitialState,
			hasPastHistory,
			gridSize,
			squareUp,
			selectedOrganismId,
		},
		actions: {
			setviewMode,
			playStop,
			step,
			stepBackward,
			reset,
			fitDisplay,
			recenter,
			setCell,
			setSquareUp,
			snapToOrientation,
		},
		meta: { movement, eventBus, cameraActionsRef },
	} = useSimulation();

	const {
		state: brushState,
		actions: { changeSize, clearShape, setSelectorPos, setPaintMode },
	} = useBrush();
	const { selectorPos, selectedShape, paintMode, shapeSize } =
		brushState;

	const prevPaintModeRef = useRef<1 | 0 | -1>();

	useEffect(() => {
		// If we just transitioned into a paint mode from an idle state...
		if (paintMode === 1 && prevPaintModeRef.current !== 1) {
			if (selectorPos) {
				cameraActionsRef.current?.birthBrushCells();
			}
		} else if (paintMode === -1 && prevPaintModeRef.current !== -1) {
			if (selectorPos) {
				cameraActionsRef.current?.clearBrushCells();
			}
		}
		prevPaintModeRef.current = paintMode;
	}, [paintMode, selectorPos, brushState, cameraActionsRef]);

	useEffect(() => {
		// When entering edit mode, if cursor is not set, center it.
		if (!viewMode && !selectorPos) {
			const center = Math.floor(gridSize / 2);
			if (setSelectorPos) {
				setSelectorPos([center, center, center]);
			}
		}
	}, [viewMode, selectorPos, setSelectorPos, gridSize]);

	const getRotationAction = useCallback((keyOrCode: string): string | null => {
		let action: string =
			keyOrCode === 'Period'
				? 'period'
				: keyOrCode === 'Semicolon'
					? 'semicolon'
					: keyOrCode.replace('Key', '').toLowerCase();

		if (!['o', 'k', 'period', 'semicolon', 'i', 'p'].includes(action))
			return null;
		return action;
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const isTextBox =
				(target.tagName === 'INPUT' &&
					[
						'text',
						'number',
						'email',
						'password',
						'url',
						'search',
						'tel',
					].includes((target as HTMLInputElement).type)) ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable;

			if (isTextBox) return;

			const key = e.key.toLowerCase();
			const code = e.code;
			const isRotationCode = [
				'KeyO',
				'KeyK',
				'Period',
				'Semicolon',
				'KeyI',
				'KeyP',
			].includes(code);

			const face = cameraOrientation.face;
			const rotation = cameraOrientation.rotation;
			const hasValidOrientation =
				face !== 'unknown' && rotation !== 'unknown';

			if (isRotationCode) {
				const action = getRotationAction(code);
				if (!action) return;

				// 1. Step Rotation (Edit Mode with Brush)
				if (!viewMode && !e.ctrlKey) {
					if (hasValidOrientation) {
						const axis = getExplicitRotationAxis(
							face as CubeFace,
							rotation as CameraRotation,
							action as any,
						);
						let angle = Math.PI / 2;
						if (['period', 'semicolon', 'p'].includes(action)) angle = -Math.PI / 2;
						cameraActionsRef.current?.rotateBrush(axis, angle);
					}
				} else {
					// 2. Camera Rotation (View Mode OR Ctrl+Shift Override)
					if (e.ctrlKey && e.shiftKey && squareUp) {
						// DISCRETE SNAP
						if (hasValidOrientation) {
							const next = getNextOrientation(
								face as CubeFace,
								rotation as CameraRotation,
								action as any
							);
							snapToOrientation(next.face, next.rotation as number);
						}
					} else {
						// CONTINUOUS ROTATION
						(movement.current as any)[action] = true;
					}
				}
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			let handled = true;

			if (!viewMode) {
				// --- EDIT MODE CONTROLS ---
				if (['w', 'x', 'a', 'd', 'q', 'z'].includes(key)) {
					if (hasValidOrientation) {
						const f = face as CubeFace;
						const r = rotation as CameraRotation;
						const keymapForOrientation = getWASDMapping(f, r);
						if (key in keymapForOrientation) {
							const delta = (keymapForOrientation as any)[key] as [number, number, number];
							eventBus.emit('moveSelector', { delta });
						}
					}
				} else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
					const arrowMap: { [key: string]: string } = {
						arrowup: e.shiftKey ? 'q' : 'w',
						arrowdown: e.shiftKey ? 'z' : 'x',
						arrowleft: 'a',
						arrowright: 'd',
					};
					const mappedKey = arrowMap[key];
					if (mappedKey && hasValidOrientation) {
						const f = face as CubeFace;
						const r = rotation as CameraRotation;
						const keymapForOrientation = getWASDMapping(f, r);
						if (mappedKey in keymapForOrientation) {
							const delta = (keymapForOrientation as any)[mappedKey] as [number, number, number];
							eventBus.emit('moveSelector', { delta });
						}
					}
				} else {
					switch (key) {
						case '[': changeSize(-1, 0); break;
						case ']': changeSize(1, 0); break;
						case 'escape': clearShape(); break;
						case 'e': setviewMode(false); break;
						case 'v': setviewMode(true); break;
						case 'f': fitDisplay(); break;
						case 'l': setSquareUp(prev => !prev); break;
						case 's': recenter(); break;
						case 'r': if (hasInitialState) reset(); break;
						case ' ': if (!selectedOrganismId) setPaintMode(prev => (prev === 1 ? 0 : 1)); break;
						case 'delete':
						case 'backspace': if (!selectedOrganismId) setPaintMode(prev => (prev === -1 ? 0 : -1)); break;
						default: handled = false;
					}
				}
			} else {
				// --- VIEW MODE CONTROLS ---
				if (['w', 'x', 'a', 'd', 'q', 'z'].includes(key)) {
					movement.current[key] = true;
				} else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
					const arrowMap: { [key: string]: string } = {
						arrowup: e.shiftKey ? 'q' : 'w',
						arrowdown: e.shiftKey ? 'z' : 'x',
						arrowleft: 'a',
						arrowright: 'd',
					};
					const mappedKey = arrowMap[key];
					if (mappedKey) movement.current[mappedKey] = true;
				} else {
					switch (key) {
						case 'e': setviewMode(false); break;
						case 'v': setviewMode(true); break;
						case 'f': fitDisplay(); break;
						case 'l': setSquareUp(prev => !prev); break;
						case 's': recenter(); break;
						case 'r': if (hasInitialState) reset(); break;
						case ' ': playStop(); break;
						default: handled = false;
					}
				}
			}

			if (handled) e.preventDefault();
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const code = e.code;
			const key = e.key.toLowerCase();
			const isRotationCode = ['KeyO', 'KeyK', 'Period', 'Semicolon', 'KeyI', 'KeyP'].includes(code);

			const action = getRotationAction(isRotationCode ? code : key) || key;

			// Always permit movement key releases, even if focused on an input,
			// to ensure we don't "stick" movement if focus changed during interaction.
			const isMovementKey = ['w', 'x', 'a', 'd', 'q', 'z', 'o', 'period', 'k', 'semicolon', 'i', 'p'].includes(action);

			if (!isMovementKey && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

			// Release physical keys
			if (['w', 'x', 'a', 'd', 'q', 'z', 'o', 'period', 'k', 'semicolon', 'i', 'p'].includes(action)) {
				movement.current[action] = false;
			} else if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
				movement.current.w = false;
				movement.current.x = false;
				movement.current.a = false;
				movement.current.d = false;
				movement.current.q = false;
				movement.current.z = false;
			}
		};

		const handleBlur = () => {
			if (movement.current) {
				Object.keys(movement.current).forEach(k => {
					movement.current[k] = false;
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		window.addEventListener('blur', handleBlur);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('blur', handleBlur);
			// Safety: Clear all movement on cleanup (e.g. mode switch)
			handleBlur();
		};
	}, [
		running,
		viewMode,
		cameraOrientation,
		hasInitialState,
		hasPastHistory,
		setviewMode,
		playStop,
		step,
		stepBackward,
		reset,
		fitDisplay,
		recenter,
		movement,
		eventBus,
		changeSize,
		clearShape,
		gridSize,
		selectorPos,
		setSelectorPos,
		cameraActionsRef,
		selectedShape,
		setCell,
		setPaintMode,
		setSquareUp,
		paintMode,
		isAnimatingInit,
		squareUp,
		selectedOrganismId,
		getRotationAction,
		snapToOrientation,
	]);
}
