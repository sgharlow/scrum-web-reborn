import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Custom render function that can be extended with providers
export const renderHook = (ui: ReactElement, options?: RenderOptions) => {
  return render(ui, { ...options });
};

// Wait for async updates helper
export const waitForNextUpdate = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Flush promises helper
export const flushPromises = () => {
  return new Promise(resolve => setImmediate(resolve));
};
