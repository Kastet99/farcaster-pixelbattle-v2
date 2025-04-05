"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface WalletConnectionProps {
  onConnect: (address: string, username?: string) => void;
  onDisconnect: () => void;
  className?: string;
}

/**
 * WalletConnection component for connecting to Farcaster wallet
 */
const WalletConnection: React.FC<WalletConnectionProps> = ({
  onConnect,
  onDisconnect,
  className = '',
}) => {
  const [address, setAddress] = useState<string | null>(null);
  const [fid, setFid] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Farcaster auth is already present on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check for Farcaster auth data in localStorage
        const authData = localStorage.getItem('farcaster_auth');
        if (authData) {
          const { address: storedAddress, fid: storedFid, username: storedUsername } = JSON.parse(authData);
          if (storedAddress) {
            setAddress(storedAddress);
            setFid(storedFid);
            setUsername(storedUsername);
            onConnect(storedAddress, storedUsername);
          }
        }
      } catch (err) {
        console.error('Error checking Farcaster connection:', err);
      }
    };

    checkConnection();
  }, [onConnect]);

  // Connect to Farcaster wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // For development, simulate a successful connection
      // In production, this would use the actual Farcaster API
      const mockAddress = '0x' + Math.random().toString(16).substring(2, 14).padEnd(40, '0');
      const mockFid = Math.floor(Math.random() * 10000).toString();
      const mockUsername = 'user_' + mockFid;
      
      // Store the wallet address and fid
      setAddress(mockAddress);
      setFid(mockFid);
      setUsername(mockUsername);
      
      // Store auth data in localStorage for persistence
      localStorage.setItem('farcaster_auth', JSON.stringify({
        address: mockAddress,
        fid: mockFid,
        username: mockUsername,
        displayName: 'User ' + mockFid,
        pfp: ''
      }));
      
      onConnect(mockAddress, mockUsername);
      
      /* 
      // Production code for when Farcaster API is available
      if (typeof window.farcaster === 'undefined') {
        throw new Error('Farcaster not detected. Please use a Farcaster compatible app.');
      }

      // Request sign-in
      const result = await window.farcaster.signIn();
      
      if (result.success && result.data) {
        const { fid, username, displayName, pfp, custody } = result.data;
        
        // Store the wallet address and fid
        const walletAddress = custody.address;
        setAddress(walletAddress);
        setFid(fid.toString());
        setUsername(username);
        
        // Store auth data in localStorage for persistence
        localStorage.setItem('farcaster_auth', JSON.stringify({
          address: walletAddress,
          fid: fid.toString(),
          username,
          displayName,
          pfp
        }));
        
        onConnect(walletAddress, username);
      } else {
        throw new Error(result.error || 'Failed to connect Farcaster wallet');
      }
      */
    } catch (err) {
      console.error('Error connecting Farcaster wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Farcaster wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Farcaster wallet
  const disconnectWallet = () => {
    // Remove auth data from localStorage
    localStorage.removeItem('farcaster_auth');
    
    // Reset state
    setAddress(null);
    setFid(null);
    setUsername(null);
    
    // Notify parent component
    onDisconnect();
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className={`flex flex-col items-center ${className}`} data-testid="wallet-connection">
      {!address ? (
        <Button 
          onClick={connectWallet} 
          disabled={isConnecting}
          data-testid="connect-wallet-button"
        >
          {isConnecting ? 'Connecting...' : 'Connect Farcaster'}
        </Button>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="font-medium" data-testid="wallet-address">
              {formatAddress(address)} {fid && `(FID: ${fid})`}
            </span>
          </div>
          <Button 
            onClick={disconnectWallet}
            variant="outline"
            data-testid="disconnect-wallet-button"
          >
            Disconnect
          </Button>
        </div>
      )}
      
      {error && (
        <div className="mt-2 text-red-500 text-sm" data-testid="wallet-error">
          {error}
        </div>
      )}
    </div>
  );
};

// Add TypeScript declaration for Farcaster property on window
declare global {
  interface Window {
    farcaster?: {
      signIn: () => Promise<{
        success: boolean;
        data?: {
          fid: number;
          username: string;
          displayName: string;
          pfp: string;
          custody: {
            address: string;
          };
        };
        error?: string;
      }>;
    }
  }
}

export default WalletConnection;
