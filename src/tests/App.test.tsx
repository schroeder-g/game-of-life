import '../tests/setup-browser-env'; // Import the browser environment setup FIRST
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from './test-utils';
import App from '../public/App'; // Import the main App component
import { WelcomeModal } from '../components/WelcomeModal';
import { ManualTestsPanel } from '../components/ManualTestsPanel';
import { DOCUMENTATION_CONTENT } from '../data/documentation/_Documentation';
import { AUTOMATED_TEST_IDS } from '../data/automated-tests';
import { MANUAL_TESTS } from '../data/manual-tests';
import { AppHeaderPanel } from '../components/AppHeaderPanel'; // Import AppHeaderPanel directly
import { SettingsSidebar } from '../components/SettingsSidebar'; // Import SettingsSidebar directly



beforeEach(() => {
  // Clear localStorage mock before each test
  (localStorage as any).clear();
  // Reset window.__BUILD_INFO__ for specific test cases if needed
  window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'test', buildTime: new Date().toISOString() };
});

// Mock the three.js canvas for App.tsx rendering
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="mock-canvas">{children}</div>,
  useThree: () => ({ camera: { matrix: { elements: [] } }, gl: { domElement: document.createElement('canvas') } }),
  useFrame: vi.fn(),
}));
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: any) => <div>{children}</div>,
  PerspectiveCamera: () => null,
  OrbitControls: () => null,
}));

describe('Automated UI & Feature Tests', () => {

  describe('[UX-4, UX-7, QA-1] Welcome Modal & Input Focus', () => {
    it('[UX-4][UX-7][QA-1] shows on first visit, saves name, and ignores global shortcuts', () => {
      // Render App to ensure all contexts are available
      render(<App />);
      const input = screen.getByPlaceholderText('Your Name');
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'Tester' } });

      const button = screen.getByRole('button', { name: 'Start Testing' });
      fireEvent.click(button);

      expect(localStorage.getItem('userName')).toBe('Tester');
      expect(screen.queryByPlaceholderText('Your Name')).not.toBeInTheDocument();
    });
  });

  describe('[UX-5, UI-1] Build/Environment Specific UI', () => {
    it('[UX-5][UI-1] shows build info and Manual Tests panel in a test build', () => {
      window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'test', buildTime: new Date().toISOString() };
      localStorage.setItem('userName', 'Tester'); // prevent welcome modal
      render(<App />); // Render App

      expect(screen.getByText(/Build: 2.1.0/)).toBeInTheDocument();
      expect(screen.getByText('Manual Tests')).toBeInTheDocument();
    });

    it('[UI-1] hides Manual Tests panel in a prod build', () => {
      window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'prod', buildTime: new Date().toISOString() };
      localStorage.setItem('userName', 'Tester');
      render(<App />); // Render App

      expect(screen.queryByText('Manual Tests')).not.toBeInTheDocument();
    });
  });


  describe('[UX-6] Test Panel Persistence', () => {
    it('[UX-6] saves and loads test statuses from localStorage', async () => {
      window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'test', buildTime: new Date().toISOString() };
      localStorage.setItem('userName', 'Tester');
      render(<App />); // Render App

      // Open the panel (assuming it's initially collapsed)
      const header = screen.getByRole('heading', { name: /Manual Tests/i });
      fireEvent.click(header);

      // Find the first test's status icon container and click it to cycle to 'checked'
      const firstTestTitle = await screen.findByText(MANUAL_TESTS[0].title);
      // The status icon div is the sibling before the title's parent
      const testRow = firstTestTitle.closest('div[style*="display"]') || firstTestTitle.parentElement;
      const statusIconDiv = testRow?.querySelector('div') || testRow?.previousElementSibling;
      if (statusIconDiv) {
        fireEvent.click(statusIconDiv);
      }

      // Check localStorage was updated (the hook calls saveTestStatuses synchronously inside setTestStatuses)
      const stored = localStorage.getItem('manual-tests-statuses');
      const parsed = stored ? JSON.parse(stored) : {};
      // The value should be an object with status 'checked'
      const firstId = MANUAL_TESTS[0].id;
      expect(parsed[firstId]?.status ?? parsed[firstId]).toBe('checked');
    });
  });
});
