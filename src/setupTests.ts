import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// ResizeObserver polyfill
global.ResizeObserver = class ResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
};

// IntersectionObserver polyfill
global.IntersectionObserver = class IntersectionObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
	root = null;
	rootMargin = '';
	thresholds = [];
	takeRecords = vi.fn();
};

afterEach(() => {
	cleanup();
});
