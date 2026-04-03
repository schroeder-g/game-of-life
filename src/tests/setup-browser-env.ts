import { JSDOM } from 'jsdom';
import { vi, beforeAll } from 'vitest';

/**
 * Safe JSDOM environment initialization for Bun and Node test runners.
 * Bridges Node/Bun globals and the browser environment for React/Testing Library.
 */

// 1. Initialize JSDOM
const dom = new JSDOM(
	'<!DOCTYPE html><html><body><div id="root"></div></body></html>',
	{
		url: 'http://localhost',
		pretendToBeVisual: true,
	},
);

const { window } = dom;

// 2. Polyfill missing browser APIs on window first
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true,
	configurable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true,
	configurable: true,
});

// Use regular functions (not arrow functions) so they can be used as constructors with 'new'
const IntersectionObserverMock = vi.fn(function () {
	return {
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	};
});
(window as any).IntersectionObserver = IntersectionObserverMock;

const ResizeObserverMock = vi.fn(function () {
	return {
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	};
});
(window as any).ResizeObserver = ResizeObserverMock;

// 3. Map window properties to global scope (if not already mapped)
// Legacy React probe polyfill for Bun
if (typeof (window as any).HTMLElement !== 'undefined') {
	(window as any).HTMLElement.prototype.attachEvent =
		(window as any).HTMLElement.prototype.attachEvent || undefined;
}

const props = [
	'window',
	'document',
	'navigator',
	'location',
	'history',
	'screen',
	'Node',
	'HTMLElement',
	'Event',
	'CustomEvent',
	'ResizeObserver',
	'IntersectionObserver',
	'localStorage',
	'sessionStorage',
	'requestAnimationFrame',
	'cancelAnimationFrame',
	'DOMParser',
	'Blob',
	'File',
	'FormData',
	'URL',
	'URLSearchParams',
	'getComputedStyle',
	'KeyboardEvent',
	'MouseEvent',
	'TouchEvent',
	'PointerEvent',
];

props.forEach(prop => {
	if (prop === 'performance') return; // Recursive no-go

	try {
		// Forceful assignment to globalThis for Bun compatibility
		(globalThis as any)[prop] = (window as any)[prop];
		(global as any)[prop] = (window as any)[prop];
	} catch (e) {
		try {
			Object.defineProperty(globalThis, prop, {
				value: (window as any)[prop],
				configurable: true,
				writable: true,
			});
			Object.defineProperty(global, prop, {
				value: (window as any)[prop],
				configurable: true,
				writable: true,
			});
		} catch (e2) {
			/* skip */
		}
	}
});

// 4. Define build info globals
const buildInfo = {
	version: '2.3.0',
	distribution: 'test',
	buildTime: new Date().toISOString(),
};

(window as any).__BUILD_INFO__ = buildInfo;
(globalThis as any).__BUILD_INFO__ = buildInfo;
(global as any).__BUILD_INFO__ = buildInfo;

// 5. Layout properties
(window as any).innerWidth = 1024;
(window as any).innerHeight = 768;

beforeAll(() => {
	// Runtime-only setup
});
