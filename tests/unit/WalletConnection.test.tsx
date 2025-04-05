import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WalletConnection from '../../src/components/WalletConnection';

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('WalletConnection Component', () => {
  const mockOnConnect = jest.fn();
  const mockOnDisconnect = jest.fn();
  
  beforeEach(() => {
    mockOnConnect.mockClear();
    mockOnDisconnect.mockClear();
    localStorageMock.clear();
    
    // Mock window.farcaster
    global.window.farcaster = {
      signIn: jest.fn()
    };
  });
  
  afterEach(() => {
    // Clean up
    delete global.window.farcaster;
  });
  
  test('renders connect button when not connected', () => {
    render(
      <WalletConnection 
        onConnect={mockOnConnect} 
        onDisconnect={mockOnDisconnect} 
      />
    );
    
    expect(screen.getByTestId('connect-wallet-button')).toBeInTheDocument();
    expect(screen.getByText('Connect Farcaster')).toBeInTheDocument();
  });
  
  test('shows wallet address and FID when connected', async () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const testFid = '12345';
    
    // Mock successful connection
    window.farcaster!.signIn = jest.fn().mockResolvedValue({
      success: true,
      data: {
        fid: parseInt(testFid),
        username: 'testuser',
        displayName: 'Test User',
        pfp: 'https://example.com/avatar.png',
        custody: {
          address: testAddress
        }
      }
    });
    
    render(
      <WalletConnection 
        onConnect={mockOnConnect} 
        onDisconnect={mockOnDisconnect} 
      />
    );
    
    // Click connect button
    const connectButton = screen.getByTestId('connect-wallet-button');
    await act(async () => {
      fireEvent.click(connectButton);
    });
    
    // Check that address and FID are displayed in truncated form
    const expectedDisplayAddress = `0x1234...7890 (FID: ${testFid})`;
    expect(screen.getByTestId('wallet-address')).toHaveTextContent(expectedDisplayAddress);
    
    // Check that onConnect was called with the address
    expect(mockOnConnect).toHaveBeenCalledWith(testAddress);
    
    // Check that auth data was stored in localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'farcaster_auth',
      expect.stringContaining(testAddress)
    );
  });
  
  test('shows error when wallet connection fails', async () => {
    // Mock connection failure
    window.farcaster!.signIn = jest.fn().mockResolvedValue({
      success: false,
      error: 'User rejected request'
    });
    
    render(
      <WalletConnection 
        onConnect={mockOnConnect} 
        onDisconnect={mockOnDisconnect} 
      />
    );
    
    // Click connect button
    const connectButton = screen.getByTestId('connect-wallet-button');
    await act(async () => {
      fireEvent.click(connectButton);
    });
    
    // Check that error message is displayed
    expect(screen.getByTestId('wallet-error')).toBeInTheDocument();
    expect(screen.getByText('User rejected request')).toBeInTheDocument();
    
    // Check that onConnect was not called
    expect(mockOnConnect).not.toHaveBeenCalled();
  });
  
  test('shows error when no Farcaster wallet is detected', async () => {
    // Remove farcaster object
    delete window.farcaster;
    
    render(
      <WalletConnection 
        onConnect={mockOnConnect} 
        onDisconnect={mockOnDisconnect} 
      />
    );
    
    // Click connect button
    const connectButton = screen.getByTestId('connect-wallet-button');
    fireEvent.click(connectButton);
    
    // Check that error message is displayed
    expect(screen.getByTestId('wallet-error')).toBeInTheDocument();
    expect(screen.getByText('Farcaster not detected. Please use a Farcaster compatible app.')).toBeInTheDocument();
  });
  
  test('disconnects wallet when disconnect button is clicked', async () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    
    // Mock successful connection
    window.farcaster!.signIn = jest.fn().mockResolvedValue({
      success: true,
      data: {
        fid: 12345,
        username: 'testuser',
        displayName: 'Test User',
        pfp: 'https://example.com/avatar.png',
        custody: {
          address: testAddress
        }
      }
    });
    
    render(
      <WalletConnection 
        onConnect={mockOnConnect} 
        onDisconnect={mockOnDisconnect} 
      />
    );
    
    // Connect first
    const connectButton = screen.getByTestId('connect-wallet-button');
    await act(async () => {
      fireEvent.click(connectButton);
    });
    
    // Then disconnect
    const disconnectButton = screen.getByTestId('disconnect-wallet-button');
    fireEvent.click(disconnectButton);
    
    // Check that onDisconnect was called
    expect(mockOnDisconnect).toHaveBeenCalled();
    
    // Check that localStorage item was removed
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('farcaster_auth');
    
    // Check that we're back to the connect button
    expect(screen.getByTestId('connect-wallet-button')).toBeInTheDocument();
  });
  
  test('loads existing connection from localStorage', async () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const testFid = '12345';
    
    // Setup localStorage with existing auth data
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'farcaster_auth') {
        return JSON.stringify({
          address: testAddress,
          fid: testFid,
          username: 'testuser',
          displayName: 'Test User',
          pfp: 'https://example.com/avatar.png'
        });
      }
      return null;
    });
    
    render(
      <WalletConnection 
        onConnect={mockOnConnect} 
        onDisconnect={mockOnDisconnect} 
      />
    );
    
    // Check that onConnect was called with the existing address
    expect(mockOnConnect).toHaveBeenCalledWith(testAddress);
    
    // Check that the address is displayed
    const expectedDisplayAddress = `0x1234...7890 (FID: ${testFid})`;
    expect(screen.getByTestId('wallet-address')).toHaveTextContent(expectedDisplayAddress);
  });
});
