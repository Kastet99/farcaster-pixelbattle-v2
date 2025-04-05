import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PixelBattleApp from '../../src/components/PixelBattleApp';

// Mock the fetch API
global.fetch = jest.fn() as jest.Mock;

// Mock the components that PixelBattleApp uses
jest.mock('../../src/components/PixelCanvas', () => {
  return jest.fn(props => (
    <div data-testid="pixel-canvas">
      <button 
        data-testid="mock-pixel" 
        onClick={() => props.onPixelClick && props.onPixelClick(5, 5, '#FFFFFF')}
      >
        Mock Pixel
      </button>
    </div>
  ));
});

jest.mock('../../src/components/ColorPalette', () => {
  return jest.fn(props => (
    <div data-testid="color-palette">
      <button 
        data-testid="mock-color" 
        onClick={() => props.onColorSelect && props.onColorSelect('#FF0000')}
      >
        Mock Color
      </button>
      {props.onReset && (
        <button 
          data-testid="reset-button" 
          onClick={props.onReset}
        >
          Reset
        </button>
      )}
    </div>
  ));
});

jest.mock('../../src/components/WalletConnection', () => {
  return jest.fn(props => (
    <div data-testid="wallet-connection">
      <button 
        data-testid="connect-wallet" 
        onClick={() => props.onConnect && props.onConnect('0x123', 'TestUser')}
      >
        Connect Wallet
      </button>
      <button 
        data-testid="disconnect-wallet" 
        onClick={() => props.onDisconnect && props.onDisconnect()}
      >
        Disconnect Wallet
      </button>
    </div>
  ));
});

describe('PixelBattleApp Component', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock the fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/canvas') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            canvas: Array(32).fill(0).map(() => Array(32).fill('#FFFFFF'))
          })
        });
      }
      
      if (url.includes('/api/pixel/price')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 0.0000001 })
        });
      }
      
      if (url === '/api/user/pixels') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pixels: [] })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
  });
  
  test('renders the application title', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the canvas data to load
    await waitFor(() => {
      expect(screen.getByText('Pixel Battle')).toBeInTheDocument();
    });
  });
  
  test('displays welcome message with tagline', async () => {
    render(<PixelBattleApp />);
    
    await waitFor(() => {
      expect(screen.getByText('Paint pixels, own the canvas, win prizes!')).toBeInTheDocument();
    });
  });
  
  test('handles wallet connection', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
    });
    
    // Click the connect wallet button
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Check that the username is displayed
    await waitFor(() => {
      expect(screen.getByText('Hi TestUser!')).toBeInTheDocument();
    });
  });
  
  test('handles wallet disconnection', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
    });
    
    // Connect the wallet first
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Check that the username is displayed
    await waitFor(() => {
      expect(screen.getByText('Hi TestUser!')).toBeInTheDocument();
    });
    
    // Disconnect the wallet
    fireEvent.click(screen.getByTestId('disconnect-wallet'));
    
    // Check that the username is no longer displayed
    await waitFor(() => {
      expect(screen.queryByText('Hi TestUser!')).not.toBeInTheDocument();
    });
  });
  
  test('handles color selection', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('color-palette')).toBeInTheDocument();
    });
    
    // Click the mock color button
    fireEvent.click(screen.getByTestId('mock-color'));
    
    // The selected color state should be updated, but we can't directly test it
    // We can test it indirectly by checking if the color palette receives the correct prop
    // This is a limitation of our testing approach with mocked components
  });
  
  test('handles pixel click when wallet is connected', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('pixel-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
    });
    
    // Connect the wallet first
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Click a pixel
    fireEvent.click(screen.getByTestId('mock-pixel'));
    
    // Check that the price API was called
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pixel/price'));
    
    // Wait for the purchase dialog to appear
    await waitFor(() => {
      expect(screen.getByTestId('purchase-dialog')).toBeInTheDocument();
    });
  });
  
  test('handles reset unpurchased pixels', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('pixel-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
      expect(screen.getByTestId('color-palette')).toBeInTheDocument();
    });
    
    // Connect the wallet first
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Click a pixel to paint it
    fireEvent.click(screen.getByTestId('mock-pixel'));
    
    // Wait for the purchase dialog to appear
    await waitFor(() => {
      expect(screen.getByTestId('purchase-dialog')).toBeInTheDocument();
    });
    
    // Click the reset button
    fireEvent.click(screen.getByTestId('reset-button'));
    
    // Check that the notification appears
    await waitFor(() => {
      expect(screen.getByText('Unpurchased pixels have been reset')).toBeInTheDocument();
    });
    
    // Check that the purchase dialog is no longer displayed
    expect(screen.queryByTestId('purchase-dialog')).not.toBeInTheDocument();
  });
  
  test('handles cancel purchase', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('pixel-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
    });
    
    // Connect the wallet first
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Click a pixel
    fireEvent.click(screen.getByTestId('mock-pixel'));
    
    // Wait for the purchase dialog to appear
    await waitFor(() => {
      expect(screen.getByTestId('purchase-dialog')).toBeInTheDocument();
    });
    
    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel'));
    
    // Check that the notification appears
    await waitFor(() => {
      expect(screen.getByText('Purchase canceled')).toBeInTheDocument();
    });
    
    // Check that the purchase dialog is no longer displayed
    expect(screen.queryByTestId('purchase-dialog')).not.toBeInTheDocument();
  });
  
  test('handles pixel purchase', async () => {
    // Mock the purchase API
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url === '/api/pixel/purchase' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      
      // Fall back to the default mock implementation for other URLs
      if (url.includes('/api/canvas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            canvas: Array(32).fill(0).map(() => Array(32).fill('#FFFFFF'))
          })
        });
      }
      
      if (url.includes('/api/pixel/price')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 0.0000001 })
        });
      }
      
      if (url === '/api/user/pixels') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pixels: [] })
        });
      }
      
      return Promise.reject(new Error('Not found'));
    });
    
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('pixel-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
    });
    
    // Connect the wallet first
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Click a pixel
    fireEvent.click(screen.getByTestId('mock-pixel'));
    
    // Wait for the purchase dialog to appear
    await waitFor(() => {
      expect(screen.getByTestId('purchase-dialog')).toBeInTheDocument();
    });
    
    // Click the confirm purchase button
    fireEvent.click(screen.getByText('Confirm Purchase'));
    
    // Check that the purchase API was called
    expect(global.fetch).toHaveBeenCalledWith('/api/pixel/purchase', expect.anything());
    
    // Wait for the success notification
    await waitFor(() => {
      expect(screen.getByText('Pixel purchased successfully!')).toBeInTheDocument();
    });
  });
  
  test('handles errors when fetching canvas data', async () => {
    // Mock the canvas API to return an error
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/canvas') {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });
      }
      
      // Default implementation for other URLs
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    render(<PixelBattleApp />);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load canvas data. Please try again.')).toBeInTheDocument();
    });
  });
  
  test('handles errors when fetching pixel price', async () => {
    render(<PixelBattleApp />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByTestId('pixel-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('wallet-connection')).toBeInTheDocument();
    });
    
    // Connect the wallet first
    fireEvent.click(screen.getByTestId('connect-wallet'));
    
    // Mock the price API to return an error for the next call
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/pixel/price')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });
      }
      
      // Default implementation for other URLs
      if (url === '/api/canvas') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            canvas: Array(32).fill(0).map(() => Array(32).fill('#FFFFFF'))
          })
        });
      }
      
      if (url === '/api/user/pixels') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ pixels: [] })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    // Click a pixel
    fireEvent.click(screen.getByTestId('mock-pixel'));
    
    // Wait for the error notification to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to get pixel price. Please try again.')).toBeInTheDocument();
    });
  });
});
