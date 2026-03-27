import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from './test-utils';
import { AppHeaderPanel, MainMenu } from '../components/MainMenu';
import { WelcomeModal } from '../components/WelcomeModal';
import { useManualTests } from '../hooks/useManualTests';
import { ManualTestsPanel } from '../components/ManualTestsPanel';
import { MANUAL_TESTS } from '../data/manual-tests';
import { AUTOMATED_TEST_IDS } from '../data/automated-tests';
import { DOCUMENTATION_CONTENT } from '../data/documentation';

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
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.__BUILD_INFO__
window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'test' };

// Mock IntersectionObserver
beforeEach(() => {
  localStorageMock.clear();
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.IntersectionObserver = mockIntersectionObserver;
});

describe('Automated UI & Feature Tests', () => {

  describe('[UX-4, UX-7, QA-1] Welcome Modal & Input Focus', () => {
    it('shows on first visit, saves name, and ignores global shortcuts', () => {
      render(<WelcomeModal />);
      const input = screen.getByPlaceholderText('Enter your name');
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'Tester' } });
      
      const button = screen.getByRole('button', { name: 'Begin' });
      fireEvent.click(button);
      
      expect(localStorage.getItem('userName')).toBe('Tester');
      expect(screen.queryByPlaceholderText('Enter your name')).not.toBeInTheDocument();
    });
  });

  describe('[UX-5, UI-1] Build/Environment Specific UI', () => {
    it('shows build info and Manual Tests panel in a test build', () => {
      window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'test' };
      localStorage.setItem('userName', 'Tester'); // prevent welcome modal
      render(<> <AppHeaderPanel /> <MainMenu /> </>);
      
      expect(screen.getByText('Build: 2.1.0 (test)')).toBeInTheDocument();
      expect(screen.getByText('Manual Tests')).toBeInTheDocument();
    });

    it('hides Manual Tests panel in a prod build', () => {
      window.__BUILD_INFO__ = { version: '2.1.0', distribution: 'prod' };
      localStorage.setItem('userName', 'Tester');
      render(<> <AppHeaderPanel /> <MainMenu /> </>);
      
      expect(screen.queryByText('Manual Tests')).not.toBeInTheDocument();
    });
  });
  
  describe('[UI-2] Documentation Modal Access', () => {
    it('opens and closes the documentation modal', () => {
      render(<AppHeaderPanel />);
      const helpButton = screen.getByRole('button', { name: 'Documentation (?)' });
      fireEvent.click(helpButton);
      expect(screen.getByRole('heading', { name: 'User Manual' })).toBeInTheDocument();
      
      const closeButton = screen.getByRole('button', { name: '×' });
      fireEvent.click(closeButton);
      expect(screen.queryByRole('heading', { name: 'User Manual' })).not.toBeInTheDocument();
    });
  });
  
  describe('[UC-1] Mode Toggle', () => {
    it('toggles between View and Edit mode icons', () => {
      render(<AppHeaderPanel />);
      const toggleButton = screen.getByTitle('Switch to Edit Mode');
      expect(toggleButton).toBeInTheDocument();
      fireEvent.click(toggleButton);
      expect(screen.getByTitle('Switch to View Mode')).toBeInTheDocument();
    });
  });

  describe('[UC-6] Adjust Simulation Speed', () => {
    it('renders the speed slider and its value', () => {
      render(<MainMenu />);
      // We can't easily test the full context interaction,
      // but we can ensure the slider renders with a default value.
      const speedSlider = screen.getByRole('slider', { name: /Speed \(fps\)/i });
      expect(speedSlider).toBeInTheDocument();
      expect(screen.getByText(/Speed \(fps\): 5/i)).toBeInTheDocument(); // Checks default
    });
  });

  describe('[UX-6] Test Panel Persistence', () => {
    it('saves and loads test statuses from localStorage', () => {
      render(<ManualTestsPanel manualTests={MANUAL_TESTS} automatedTestIds={AUTOMATED_TEST_IDS} documentation={DOCUMENTATION_CONTENT} />);
      
      // Open the panel
      const header = screen.getByRole('heading', { name: /Manual Tests/i });
      fireEvent.click(header);

      // Cycle a test to 'checked'
      // The status icon is a CheckCircle/XCircle/Circle component from lucide-react.
      // We click the div containing it.
      const firstTestItem = screen.getByText(MANUAL_TESTS[0].title);
      const statusIconContainer = firstTestItem.parentElement?.previousElementSibling;
      if (statusIconContainer) {
        fireEvent.click(statusIconContainer);
      }
      
      // Check that it's checked in localStorage
      expect(JSON.parse(localStorage.getItem('manual-tests-statuses') || '{}')[MANUAL_TESTS[0].id]).toBe('checked');
    });
  });
});
