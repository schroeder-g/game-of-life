import './setup-browser-env'; // Establishment of global browser environment
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SimulationProvider } from '../contexts/SimulationContext';
import { BrushProvider } from '../contexts/BrushContext';
import { GenesisConfigProvider } from '../contexts/GenesisConfigContext';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SimulationProvider>
      <BrushProvider>
        <GenesisConfigProvider>{children}</GenesisConfigProvider>
      </BrushProvider>
    </SimulationProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
