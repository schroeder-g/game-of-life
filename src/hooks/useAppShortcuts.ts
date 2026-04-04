// AGENT INSTRUCTION:
// The keyboard control logic, especially for rotation, is sourced from
// `src/core/faceOrientationKeyMapping.ts`. To ensure consistency, please avoid
// adding new keyboard control logic here. Instead, modify the mappings in
// the source of truth file.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useBrush } from '../contexts/BrushContext';
import { useSimulation } from '../contexts/SimulationContext';
import {
	getWASDMapping,
	type CameraFace,
	type CameraRotation,
} from '../core/faceOrientationKeyMapping';
// import { getNextOrientation } from "../components/Grid"; // Removed broken helper

export function useAppShortcuts() {
	const {
		state: {
			running,
			viewMode,
			cameraOrientation,
			isAnimatingInit,
			hasInitialState,
			hasPastHistory,
			invertYaw,
			invertPitch,
			invertRoll,
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
			moveSelectedOrganism,
			rotateSelectedOrganism,
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

		// Update the ref for the next render.
		prevPaintModeRef.current = paintMode;
	}, [paintMode, selectorPos, brushState, cameraActionsRef]);

	useEffect(() => {
		// When entering edit mode, if cursor is not set, center it.
		if (!viewMode && !selectorPos) {
			const center = Math.floor(gridSize / 2);
			if (setSelectorPos) {
				// Defensive check
				setSelectorPos([center, center, center]);
			}
		}
	}, [viewMode, selectorPos, setSelectorPos, gridSize]);

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

			// If a text input is focused, prevent any shortcut handling.
			if (isTextBox) return;

			const key = e.key.toLowerCase();
			const code = e.code;

			// Rotation keys: i, p, o, k, ., ;
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

			// Logical rotation action resolver
			const getRotationAction = (keyOrCode: string): string | null => {
				// First normalize the base key name based on physical layout (code)
				let action: string =
					keyOrCode === 'Period'
						? 'period'
						: keyOrCode === 'Semicolon'
							? 'semicolon'
							: keyOrCode.replace('Key', '').toLowerCase();

				if (
					!['o', 'k', 'period', 'semicolon', 'i', 'p'].includes(action)
				)
					return null;

				// Apply Inversion Swaps
				if (invertPitch) {
					if (action === 'o') action = 'period';
					else if (action === 'period') action = 'o';
				}
				if (invertYaw) {
					if (action === 'k') action = 'semicolon';
					else if (action === 'semicolon') action = 'k';
				}
				if (invertRoll) {
					if (action === 'i') action = 'p';
					else if (action === 'p') action = 'i';
				}
				return action;
			};

			if (isRotationCode) {
				// 1. Step Rotation (Edit Mode with Brush)
				if (!viewMode && shapeSize > 1 && !(e.ctrlKey && e.shiftKey)) {
					let axis = new THREE.Vector3();
					let angle = Math.PI / 2;
					if (key === 'o') {
						axis.set(1, 0, 0);
						angle = -Math.PI / 2;
					}
					if (key === '.') {
						axis.set(1, 0, 0);
						angle = Math.PI / 2;
					}
					if (key === 'k') {
						axis.set(0, 1, 0);
						angle = -Math.PI / 2;
					}
					if (key === ';') {
						axis.set(0, 1, 0);
						angle = Math.PI / 2;
					}
					if (key === 'i') {
						axis.set(0, 0, 1);
						angle = paintMode === -1 ? Math.PI / 2 : -Math.PI / 2;
					}
					if (key === 'p') {
						axis.set(0, 0, 1);
						angle = paintMode === -1 ? -Math.PI / 2 : Math.PI / 2;
					}
					if (selectedOrganismId) {
						rotateSelectedOrganism(axis, angle);
					} else {
						cameraActionsRef.current?.rotateBrush(axis, angle);
					}
				} else {
					// 2. Continuous Rotation (Standard OR Ctrl+Shift Override)
					const action = getRotationAction(code);
					if (action) {
						const rotFlag = `rotate${action.charAt(0).toUpperCase() + action.slice(1)}`;
						(movement.current as any)[rotFlag] = true;
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
						const f = face as CameraFace;
						const r = rotation as CameraRotation;
						const keymapForOrientation = getWASDMapping(f, r);
						if (key in keymapForOrientation) {
							const delta = (keymapForOrientation as any)[key] as [
								number,
								number,
								number,
							];
							if (selectedOrganismId) {
								moveSelectedOrganism(delta);
							} else {
								eventBus.emit('moveSelector', { delta });
							}
						}
					}
				} else if (
					['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
						key,
					)
				) {
					const arrowMap: { [key: string]: string } = {
						arrowup: e.shiftKey ? 'q' : 'w',
						arrowdown: e.shiftKey ? 'z' : 'x',
						arrowleft: 'a',
						arrowright: 'd',
					};
					const mappedKey = arrowMap[key];
					if (mappedKey && hasValidOrientation) {
						const f = face as CameraFace;
						const r = rotation as CameraRotation;
						const keymapForOrientation = getWASDMapping(f, r);
						if (mappedKey in keymapForOrientation) {
							const delta = (keymapForOrientation as any)[
								mappedKey
							] as [number, number, number];
							if (selectedOrganismId) {
								moveSelectedOrganism(delta);
							} else {
								eventBus.emit('moveSelector', { delta });
							}
						}
					}
				} else {
					switch (key) {
						case '[':
							changeSize(-1, 0);
							break;
						case ']':
							changeSize(1, 0);
							break;
						case 'escape':
							clearShape();
							break;
						case 'e':
							setviewMode(false);
							break;
						case 'v':
							setviewMode(true);
							break;
						case 'f':
							fitDisplay();
							break;
						case 'l':
							setSquareUp(prev => !prev);
							break; // Changed 'l' to toggle squareUp
						case 's':
							recenter();
							break;
						case 'r':
							if (hasInitialState) reset();
							break;
						case ' ':
							if (!selectedOrganismId) {
								setPaintMode(prev => (prev === 1 ? 0 : 1));
							}
							break;
						case 'delete':
						case 'backspace':
							if (!selectedOrganismId) {
								setPaintMode(prev => (prev === -1 ? 0 : -1));
							}
							break;
						default:
							handled = false;
					}
				}
			} else {
				// --- VIEW MODE CONTROLS ---
				switch (key) {
					case 'e':
						setviewMode(false);
						break;
					case 'v':
						setviewMode(true);
						break;
					case 'f':
						fitDisplay();
						break;
					case 'l':
						setSquareUp(prev => !prev);
						break; // Changed 'l' to toggle squareUp
					case 's':
						recenter();
						break;
					case 'r':
						if (hasInitialState) reset();
						break;
					case ' ':
						playStop();
						break;
					case 'arrowup':
						if (e.shiftKey) movement.current.up = true;
						else movement.current.forward = true;
						break;
					case 'arrowdown':
						if (e.shiftKey) movement.current.down = true;
						else movement.current.backward = true;
						break;
					case 'arrowleft':
						movement.current.left = true;
						break;
					case 'arrowright':
						movement.current.right = true;
						break;
					case 'w':
						movement.current.forward = true;
						break;
					case 'x':
						movement.current.backward = true;
						break;
					case 'a':
						movement.current.left = true;
						break;
					case 'd':
						movement.current.right = true;
						break;
					case 'q':
						movement.current.up = true;
						break;
					case 'z':
						movement.current.down = true;
						break;
					default:
						handled = false;
				}
			}

			if (handled) e.preventDefault();
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			// Ensure e.key is a string before calling toLowerCase()
			if (typeof e.key !== 'string') return;

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

			// Logical rotation action resolver (mirrors handleKeyDown)
			const getRotationAction = (keyOrCode: string): string | null => {
				let action: string =
					keyOrCode === 'Period'
						? 'period'
						: keyOrCode === 'Semicolon'
							? 'semicolon'
							: keyOrCode.replace('Key', '').toLowerCase();

				if (
					!['o', 'k', 'period', 'semicolon', 'i', 'p'].includes(action)
				)
					return null;

				if (invertPitch) {
					if (action === 'o') action = 'period';
					else if (action === 'period') action = 'o';
				}
				if (invertYaw) {
					if (action === 'k') action = 'semicolon';
					else if (action === 'semicolon') action = 'k';
				}
				if (invertRoll) {
					if (action === 'i') action = 'p';
					else if (action === 'p') action = 'i';
				}
				return action;
			};

			const rotKey =
				getRotationAction(isRotationCode ? code : key) || key;
			let handled = true;

			// Handle common movement keys first
			switch (rotKey) {
				case 'w':
					movement.current.forward = false;
					break;
				case 'x':
					movement.current.backward = false;
					break;
				case 'a':
					movement.current.left = false;
					break;
				case 'd':
					movement.current.right = false;
					break;
				case 'q':
					movement.current.up = false;
					break;
				case 'z':
					movement.current.down = false;
					break;
				case 'arrowup':
					movement.current.up = false;
					movement.current.forward = false;
					break;
				case 'arrowdown':
					movement.current.down = false;
					movement.current.backward = false;
					break;
				case 'arrowleft':
					movement.current.left = false;
					break;
				case 'arrowright':
					movement.current.right = false;
					break;
				case 'semicolon':
					movement.current.rotateSemicolon = false;
					break;
				case 'k':
					movement.current.rotateK = false;
					break;
				case 'o':
					movement.current.rotateO = false;
					break;
				case 'period':
					movement.current.rotatePeriod = false;
					break;
				case 'i':
					movement.current.rotateI = false;
					break;
				case 'p':
					movement.current.rotateP = false;
					break;
				default:
					handled = false;
			}
			if (handled) e.preventDefault();
		};

		const handleBlur = () => {
			// Reset all movement flags to prevent sticking
			Object.keys(movement.current).forEach(k => {
				movement.current[k] = false;
			});
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		window.addEventListener('blur', handleBlur);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('blur', handleBlur);
		};
	}, [
		running,
		viewMode,
		cameraOrientation,
		hasInitialState,
		hasPastHistory,
		invertYaw,
		invertPitch,
		invertRoll,
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
		paintMode,
		isAnimatingInit,
	]);
}
