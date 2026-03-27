import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainMenu } from '../components/MainMenu';
import { useSimulation } from '../contexts/SimulationContext';
import { useBrush } from '../contexts/BrushContext';
import { useGenesisConfig } from '../contexts/GenesisConfigContext';
import { AUTOMATED_TEST_IDS } from '../data/automated-tests';
import { MANUAL_TESTS } from '../data/manual-tests';
import { DOCUMENTATION_CONTENT } from '../data/documentation';

// Mock all the necessary contexts
vi.mock('../contexts/SimulationContext', () => ({ useSimulation: vi.fn() }));
vi.mock('../contexts/BrushContext', () => ({ useBrush: vi.fn() }));
vi.mock('../contexts/GenesisConfigContext', () => ({ useGenesisConfig: vi.fn() }));
vi.mock('../hooks/useClickOutside', () => ({ useClickOutside: vi.fn() }));

describe('MainMenu and AppHeaderPanel', () => {
    let mockSetRotationMode: Mock;
    let mockSetSpeed: Mock;
    let mockPlayStop: Mock;

    beforeEach(() => {
        mockSetRotationMode = vi.fn((fn) => fn(false)); // Simulate toggling
        mockSetSpeed = vi.fn();
        mockPlayStop = vi.fn();

        (useSimulation as any).mockReturnValue({
            state: {
                running: false,
                rotationMode: false,
                hasInitialState: true,
                hasPastHistory: false,
                speed: 10,
                gridSize: 20,
                density: 0.1,
                cellMargin: 0.1,
                buildInfo: { version: '1.0.0', distribution: 'dev', buildTime: new Date().toISOString() },
                cameraOrientation: { face: 'front', rotation: 0 },
                community: [],
            },
            actions: {
                setRotationMode: mockSetRotationMode,
                setSpeed: mockSetSpeed,
                playStop: mockPlayStop,
                fitDisplay: vi.fn(),
                recenter: vi.fn(),
                applyCells: vi.fn(),
            },
            meta: {
                cameraActionsRef: { current: {} },
                gridRef: { current: { getLivingCells: () => [] } },
            }
        });

        (useBrush as any).mockReturnValue({
            state: { selectedShape: 'Cube', shapeSize: 3 },
            actions: {},
        });

        (useGenesisConfig as any).mockReturnValue({
            state: { savedConfigs: { 'Default': {} }, selectedConfigName: 'Default' },
            actions: { setSelectedConfigName: vi.fn() },
        });
    });

    it('[UC-1] should toggle edit/view mode when the mode toggle button is clicked', () => {
        render(<MainMenu.AppHeaderPanel />);
        const toggleButton = screen.getByTitle('Switch to View Mode');
        fireEvent.click(toggleButton);
        expect(mockSetRotationMode).toHaveBeenCalled();
    });

    it('[UC-6] should adjust simulation speed when slider is changed', async () => {
        // Mock rotationMode to true to ensure the speed slider is visible
        (useSimulation as any).mockReturnValueOnce({
            ...useSimulation(), // Get the default mock from beforeEach
            state: { ...useSimulation().state, rotationMode: true }
        });
        
        render(<MainMenu />);
        
        // The menu is collapsed by default, so we need to open it
        const header = screen.getByText('Configuration');
        fireEvent.click(header);
        
        const speedSlider = await screen.findByLabelText(/Speed/);
        fireEvent.change(speedSlider, { target: { value: '15' } });
        expect(mockSetSpeed).toHaveBeenCalledWith(15);
    });
    
    it('[UI-2] should open the documentation modal when the help button is clicked', async () => {
        render(<MainMenu.AppHeaderPanel />);
        const helpButton = screen.getByTitle('Documentation (?)');
        fireEvent.click(helpButton);
        expect(await screen.findByRole('heading', { name: 'User Manual' })).toBeInTheDocument();
    });

    it('[UX-5] should display development build info in the header', () => {
        render(<MainMenu.AppHeaderPanel />);
        // Use a regex to match the build info format without being sensitive to the exact time
        expect(screen.getByText(/Build: 1.0.0/)).toBeInTheDocument();
    });
});
