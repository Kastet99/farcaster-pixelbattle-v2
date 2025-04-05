"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PixelCanvas from './PixelCanvas';
import ColorPalette, { PASTEL_COLORS } from './ColorPalette';
import WalletConnection from './WalletConnection';
import { Button } from './ui/Button';

/**
 * Main application component for Pixel Battle
 * Integrates wallet connection, canvas, and color selection
 */
const PixelBattleApp: React.FC = () => {
  // Canvas state
  const [canvasData, setCanvasData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].hex);
  const [userPixels, setUserPixels] = useState<{x: number, y: number}[]>([]);
  const [showOwnedPixels, setShowOwnedPixels] = useState(true);
  
  // Transaction state
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [pendingPixels, setPendingPixels] = useState<{x: number, y: number}[]>([]);
  const [pixelPrice, setPixelPrice] = useState<number | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  
  // Track temporary pixel changes that haven't been purchased yet
  const [tempPixelChanges, setTempPixelChanges] = useState<{x: number, y: number, originalColor: string}[]>([]);

  // Constants
  const CANVAS_WIDTH = 32;
  const CANVAS_HEIGHT = 32;
  const PIXEL_SIZE = 12;

  // Fetch canvas data on component mount
  useEffect(() => {
    const fetchCanvas = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/canvas');
        
        if (!response.ok) {
          throw new Error('Failed to fetch canvas data');
        }
        
        const data = await response.json();
        setCanvasData(data.canvas);
      } catch (err) {
        console.error('Error fetching canvas:', err);
        setError('Failed to load canvas. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCanvas();
  }, []);
  
  // Fetch user's pixels when wallet is connected
  const fetchUserPixels = useCallback(async (address: string) => {
    if (!address) {
      setUserPixels([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/user/pixels?address=${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user pixels');
      }
      
      const data = await response.json();
      setUserPixels(data.pixels || []);
    } catch (err) {
      console.error('Error fetching user pixels:', err);
    }
  }, []);

  // Handle wallet connection
  const handleWalletConnect = useCallback((address: string, username?: string) => {
    setWalletAddress(address);
    
    // Use the username from the profile or default to 'User'
    const displayName = username || 'User';
    setUsername(displayName);
    
    // Fetch user's pixels
    fetchUserPixels(address);
  }, [fetchUserPixels]);
  
  // Handle wallet disconnection
  const handleWalletDisconnect = useCallback(() => {
    setWalletAddress(null);
    setUsername(null);
    setUserPixels([]);
  }, []);
  
  // Handle color selection
  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);
  
  // Update canvas with new pixel color
  const updateCanvasWithNewPixel = useCallback((x: number, y: number, color: string) => {
    // Update the canvas data with the new pixel color
    setCanvasData(prevCanvas => {
      const newCanvas = [...prevCanvas];
      
      // Store the original color for reset functionality if this is a new change
      const originalColor = newCanvas[y][x];
      if (originalColor !== color) {
        // Only track changes if the color is actually changing
        setTempPixelChanges(prev => {
          // Check if this pixel is already in the list
          const existingIndex = prev.findIndex(pixel => pixel.x === x && pixel.y === y);
          if (existingIndex >= 0) {
            // Don't modify the original color if it's already tracked
            return prev;
          }
          return [...prev, { x, y, originalColor }];
        });
      }
      
      // Update the canvas with the new color
      newCanvas[y][x] = color;
      return newCanvas;
    });
  }, []);

  // Handle pixel click to get price and prepare for purchase
  const handlePixelClick = useCallback(async (x: number, y: number, currentColor: string) => {
    if (!walletAddress) {
      setNotification({
        message: 'Please connect your wallet to purchase pixels',
        type: 'info'
      });
      return;
    }
    
    try {
      // Update the canvas immediately for visual feedback
      updateCanvasWithNewPixel(x, y, selectedColor);
      
      // Get current price for this pixel
      const response = await fetch(`/api/pixel/price?x=${x}&y=${y}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pixel price');
      }
      
      const data = await response.json();
      setPixelPrice(data.price);
      
      // Add to pending pixels
      setPendingPixels(prev => {
        // Check if this pixel is already in the list
        const exists = prev.some(pixel => pixel.x === x && pixel.y === y);
        if (exists) return prev;
        return [...prev, { x, y }];
      });
    } catch (err) {
      console.error('Error getting pixel price:', err);
      setNotification({
        message: 'Failed to get pixel price. Please try again.',
        type: 'error'
      });
    }
  }, [walletAddress, selectedColor, updateCanvasWithNewPixel]);
  
  // Reset unpurchased pixels to their original colors
  const handleResetUnpurchasedPixels = useCallback(() => {
    if (tempPixelChanges.length === 0) return;
    
    console.log('Resetting unpurchased pixels:', tempPixelChanges.length);
    
    // Create a deep copy of the canvas data
    const newCanvasData = JSON.parse(JSON.stringify(canvasData));
    
    // Restore original colors
    tempPixelChanges.forEach(({ x, y, originalColor }) => {
      if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        newCanvasData[y][x] = originalColor;
      }
    });
    
    // Clear pending pixels and temp changes
    setCanvasData(newCanvasData);
    setTempPixelChanges([]);
    setPendingPixels([]);
    setPixelPrice(null);
    
    // Show notification
    setNotification({
      message: 'Unpurchased pixels have been reset',
      type: 'info'
    });
  }, [canvasData, tempPixelChanges, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Toggle visibility of owned pixels
  const toggleOwnedPixelsVisibility = useCallback(() => {
    setShowOwnedPixels(prev => !prev);
  }, []);

  // Cancel pending purchase
  const handleCancelPurchase = useCallback(() => {
    console.log('Canceling purchase, resetting pixels');
    
    // Reset pixels to their original colors
    if (tempPixelChanges.length > 0) {
      // Create a deep copy of the canvas data
      const newCanvasData = JSON.parse(JSON.stringify(canvasData));
      
      // Restore original colors
      tempPixelChanges.forEach(({ x, y, originalColor }) => {
        if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
          newCanvasData[y][x] = originalColor;
        }
      });
      
      // Update canvas
      setCanvasData(newCanvasData);
    }
    
    // Clear state
    setTempPixelChanges([]);
    setPendingPixels([]);
    setPixelPrice(null);
    
    // Show notification
    setNotification({
      message: 'Purchase canceled',
      type: 'info'
    });
  }, [canvasData, tempPixelChanges, CANVAS_WIDTH, CANVAS_HEIGHT]);

  // Handle pixel purchase
  const handlePurchasePixel = async () => {
    if (pendingPixels.length === 0 || !walletAddress || pixelPrice === null) return;
    
    try {
      setIsPurchasing(true);
      
      // For simplicity, we're just handling the first pixel in the list
      // In a real implementation, you would handle all pixels
      const { x, y } = pendingPixels[0];
      
      const response = await fetch('/api/pixel/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x,
          y,
          color: selectedColor,
          address: walletAddress
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to purchase pixel');
      }
      
      const data = await response.json();
      
      // Update canvas with new pixel
      const newCanvas = [...canvasData];
      newCanvas[y][x] = selectedColor;
      setCanvasData(newCanvas);
      
      // Add to user's pixels
      setUserPixels([...userPixels, { x, y }]);
      
      // Show success notification
      setNotification({
        message: `Pixel purchased successfully! New price: ${data.newPrice} ETH`,
        type: 'success'
      });
      
      // Reset purchase state
      setPendingPixels([]);
      setPixelPrice(null);
    } catch (err) {
      console.error('Error purchasing pixel:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to purchase pixel',
        type: 'error'
      });
    } finally {
      setIsPurchasing(false);
    }
  };
  
  // Format price to show zeros as a number
  const formatPrice = (price: number): string => {
    if (price === 0) return '0 ETH';
    
    // Count leading zeros after decimal point
    const priceStr = price.toString();
    const decimalIndex = priceStr.indexOf('.');
    
    if (decimalIndex === -1) return `${price} ETH`;
    
    const decimalPart = priceStr.substring(decimalIndex + 1);
    let leadingZeros = 0;
    
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] === '0') {
        leadingZeros++;
      } else {
        break;
      }
    }
    
    const significantPart = decimalPart.substring(leadingZeros);
    return `${significantPart} × 10^-${leadingZeros + 1} ETH`;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">Loading Pixel Battle...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">Pixel Battle</h1>
      {username && (
        <p className="text-gray-600 mb-1">Hi {username}!</p>
      )}
      <p className="text-gray-600 mb-6">Paint pixels, own the canvas, win prizes!</p>
      
      {/* Wallet Connection */}
      <div className="mb-6 w-full flex justify-center">
        <WalletConnection 
          onConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
        />
      </div>
      
      {/* Notification */}
      {notification && (
        <div 
          className={`mb-4 p-3 rounded-lg w-full max-w-md text-center ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' :
            notification.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}
          data-testid="notification"
        >
          {notification.message}
          <button 
            className="ml-2 text-sm underline"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* User Stats and Game Info */}
        <div className="w-full md:w-64 flex flex-col gap-4">
          {/* User Stats */}
          {walletAddress && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Your Stats</h3>
              <p className="mb-2">You own {userPixels.length} pixels</p>
              <Button 
                variant={showOwnedPixels ? "default" : "outline"}
                onClick={toggleOwnedPixelsVisibility}
                className="w-full"
              >
                {showOwnedPixels ? 'Hide Owned Pixels' : 'Show Owned Pixels'}
              </Button>
            </div>
          )}
          
          {/* Game Info */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Game Info</h3>
            <ul className="text-sm space-y-1">
              <li>• Initial pixel cost: 0.0000001 ETH</li>
              <li>• Price increases 1.1x when purchased</li>
              <li>• 84% goes to previous owner</li>
              <li>• 15% goes to prize pool</li>
              <li>• Game ends after 24h of inactivity</li>
              <li>• Prize pool divided among all players lasting</li>
              <li>• Potential ROI up to 75%</li>
            </ul>
          </div>
        </div>
        
        {/* Canvas, Color Palette and Purchase Dialog */}
        <div className="flex-1 flex flex-col">
          {/* Canvas */}
          <PixelCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            pixelSize={PIXEL_SIZE}
            initialColors={canvasData}
            onPixelClick={handlePixelClick}
            userOwnedPixels={userPixels}
            highlightOwned={showOwnedPixels}
            selectedColor={selectedColor}
          />
          
          {/* Single Color Palette */}
          <div className="mt-4">
            <ColorPalette 
              selectedColor={selectedColor}
              onColorSelect={handleColorSelect}
              onReset={handleResetUnpurchasedPixels}
            />
          </div>
          
          {/* Purchase Dialog */}
          {pendingPixels.length > 0 && pixelPrice !== null && (
            <div className="bg-gray-100 p-4 mt-4 rounded-lg" data-testid="purchase-dialog">
              <h3 className="text-lg font-medium mb-2">Confirm Purchase</h3>
              <p>
                {pendingPixels.length} pixel{pendingPixels.length > 1 ? 's' : ''} at: {pendingPixels.map((pixel, index) => (
                  <span key={`${pixel.x}-${pixel.y}`}>
                    {pixel.x},{pixel.y}{index < pendingPixels.length - 1 ? '; ' : ''}
                  </span>
                ))}
                <br />
                Price: {formatPrice(pixelPrice)}
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={handlePurchasePixel} 
                  disabled={isPurchasing}
                  data-testid="confirm-purchase-button"
                >
                  {isPurchasing ? 'Processing...' : 'Confirm Purchase'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelPurchase}
                  data-testid="cancel-purchase-button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PixelBattleApp;
