import { vi, beforeAll } from 'vitest';

// Mock localStorage
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

// Mock document
const documentMock = (() => {
  const elements: Record<string, any> = {};
  return {
    createElement: vi.fn((tagName) => {
      const element = {
        tagName: tagName.toUpperCase(),
        style: {},
        focus: vi.fn(),
        blur: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
        hasAttribute: vi.fn(),
        removeAttribute: vi.fn(),
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
          contains: vi.fn(),
          toggle: vi.fn(),
        },
        children: [],
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({
          x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0,
          toJSON: () => ({})
        })),
        value: '',
        type: '',
        placeholder: '',
        textContent: '',
        name: '',
        min: '',
        max: '',
        step: '',
        closest: vi.fn(),
        parentElement: null,
        previousElementSibling: null,
        getContext: vi.fn(() => ({
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
        })),
      };
      elements[tagName] = element;
      return element;
    }),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
    },
    head: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    activeElement: null,
  };
})();

// Mock HTMLElement
class MockHTMLElement {
  style: Record<string, string> = {};
  getBoundingClientRect = vi.fn(() => ({
    x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0,
    toJSON: () => ({})
  }));
  focus = vi.fn();
  blur = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
  setAttribute = vi.fn();
  getAttribute = vi.fn();
  hasAttribute = vi.fn();
  removeAttribute = vi.fn();
  classList = {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
    toggle: vi.fn(),
  };
  children: MockHTMLElement[] = [];
  appendChild = vi.fn();
  removeChild = vi.fn();
  querySelector = vi.fn();
  querySelectorAll = vi.fn();
  closest = vi.fn();
  parentElement: MockHTMLElement | null = null;
  previousElementSibling: MockHTMLElement | null = null;
  textContent: string | null = null;
  value = '';
  type = '';
  placeholder = '';
  tagName = '';
  name = '';
  min = '';
  max = '';
  step = '';
}

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
  Object.defineProperty(global, 'document', { value: documentMock, writable: true });
  Object.defineProperty(global, 'window', {
    value: {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      IntersectionObserver: vi.fn(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      })),
      ResizeObserver: vi.fn(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      })),
      __BUILD_INFO__: { version: '2.1.0', distribution: 'test', buildTime: new Date().toISOString() },
    },
    writable: true,
  });
  Object.defineProperty(global, 'HTMLElement', { value: MockHTMLElement, writable: true });
});
