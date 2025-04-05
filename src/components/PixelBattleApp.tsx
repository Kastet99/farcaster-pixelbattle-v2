"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import PixelCanvas from './PixelCanvas';
import ColorPalette from './ColorPalette';
import WalletConnection from './WalletConnection';
import { Button } from './ui/Button';
import { getPixelPrice, purchasePixel, getCanvasData, purchasePixelsBatch, getPixelColor } from '~/services/contract.service';

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Type definitions
type PixelStatus = 'pending' | 'processing' | 'confirmed' | 'failed';

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
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [userPixels, setUserPixels] = useState<{x: number, y: number}[]>([]);
  const [showOwnedPixels, setShowOwnedPixels] = useState(true);
  
  // Transaction state
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [pendingPixels, setPendingPixels] = useState<{x: number, y: number}[]>([]);
  const [pixelPrice, setPixelPrice] = useState<number | null>(null);
  const [pixelPrices, setPixelPrices] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  
  // Optimistic rendering state
  const [tempPixelChanges, setTempPixelChanges] = useState<{x: number, y: number, originalColor: string}[]>([]);
  const [pixelStatus, setPixelStatus] = useState<Record<string, PixelStatus>>({});
  const [transactionQueue, setTransactionQueue] = useState<{
    x: number;
    y: number;
    color: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    timestamp: number;
  }[]>([]);
  
  // Game status state
  const [gameStatus, setGameStatus] = useState<{isActive: boolean, endTime: string | null} | null>(null);
  
  // Constants
  const CANVAS_WIDTH = 32;
  const CANVAS_HEIGHT = 32;
  const PIXEL_SIZE = 12;
  const STORAGE_KEY = 'pixelBattle_purchasedPixels';
  
  // Safe wrapper for localStorage operations
  const safeLocalStorage = {
    getItem: (key: string): string | null => {
      try {
        return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      } catch (e) {
        console.error('Error accessing localStorage:', e);
        return null;
      }
    },
    setItem: (key: string, value: string): boolean => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
          return true;
        }
        return false;
      } catch (e) {
        console.error('Error writing to localStorage:', e);
        return false;
      }
    }
  };
  
  // Type for persisted purchased pixels
  type PurchasedPixel = {
    x: number;
    y: number;
    color: string;
    timestamp: number;
  };
  
  // Load purchased pixels from localStorage
  const loadPurchasedPixels = (): PurchasedPixel[] => {
    const storedPixels = safeLocalStorage.getItem(STORAGE_KEY);
    if (!storedPixels) return [];
    
    try {
      return JSON.parse(storedPixels);
    } catch (e) {
      console.error('Error parsing stored pixels:', e);
      return [];
    }
  };
  
  // Save purchased pixels to localStorage
  const savePurchasedPixels = (pixels: PurchasedPixel[]): void => {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(pixels));
  };
  
  // Add a purchased pixel to localStorage
  const addPurchasedPixel = (pixel: PurchasedPixel): void => {
    const currentPixels = loadPurchasedPixels();
    
    // Check if this pixel already exists (by coordinates)
    const existingIndex = currentPixels.findIndex(p => p.x === pixel.x && p.y === pixel.y);
    
    if (existingIndex >= 0) {
      // Update existing pixel
      currentPixels[existingIndex] = pixel;
    } else {
      // Add new pixel
      currentPixels.push(pixel);
    }
    
    savePurchasedPixels(currentPixels);
  };
  
  // Create a safe version of setTransactionQueue that handles potential errors
  const safeUpdateTransactionQueue = useCallback((updater: React.SetStateAction<{
    x: number;
    y: number;
    color: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    timestamp: number;
  }[]>) => {
    try {
      setTransactionQueue(updater);
    } catch (err) {
      console.error('Error updating transaction queue:', err);
      // Fallback to a safe reset if updater function fails
      setTransactionQueue(prev => prev);
    }
  }, []);

  // Fetch canvas data on component mount
  useEffect(() => {
    const fetchCanvas = async () => {
      try {
        setIsLoading(true);
        
        // Use the mock contract service to get canvas data instead of API
        const { owners, colors } = await getCanvasData();
        
        // Convert the flat arrays to 2D grid format
        const canvasGrid: string[][] = [];
        let index = 0;
        
        for (let y = 0; y < CANVAS_HEIGHT; y++) {
          canvasGrid[y] = [];
          for (let x = 0; x < CANVAS_WIDTH; x++) {
            canvasGrid[y][x] = colors[index] || '#FFFFFF';
            index++;
          }
        }
        
        // Apply any persisted purchased pixels from localStorage
        const purchasedPixels = loadPurchasedPixels();
        if (purchasedPixels.length > 0) {
          console.log(`Applying ${purchasedPixels.length} persisted pixels from localStorage`);
          
          purchasedPixels.forEach(pixel => {
            if (pixel.x >= 0 && pixel.x < CANVAS_WIDTH && pixel.y >= 0 && pixel.y < CANVAS_HEIGHT) {
              canvasGrid[pixel.y][pixel.x] = pixel.color;
              
              // Also mark these pixels as confirmed in the pixel status
              setPixelStatus(prev => ({
                ...prev,
                [`${pixel.x},${pixel.y}`]: 'confirmed'
              }));
            }
          });
        }
        
        setCanvasData(canvasGrid);
      } catch (err) {
        console.error('Error fetching canvas:', err);
        setError('Failed to load canvas. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCanvas();
  }, [CANVAS_HEIGHT, CANVAS_WIDTH]);
  
  // Fetch game status from the mock contract service
  useEffect(() => {
    const fetchGameStatus = async () => {
      try {
        // Use mock game status
        setGameStatus({
          isActive: true,
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        });
      } catch (error) {
        console.error('Error fetching game status:', error);
      }
    };

    fetchGameStatus();
    // Refresh game status every minute
    const intervalId = setInterval(fetchGameStatus, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  // Fetch user's pixels when wallet is connected
  const fetchUserPixels = useCallback(async (address: string) => {
    if (!address) {
      setUserPixels([]);
      return;
    }
    
    try {
      // Use the mock contract service to get user's pixels
      const { owners, colors } = await getCanvasData();
      const userOwnedPixels: {x: number, y: number}[] = [];
      
      // Check each pixel to see if it's owned by the user
      let index = 0;
      for (let y = 0; y < CANVAS_HEIGHT; y++) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          if (owners[index]?.toLowerCase() === address.toLowerCase()) {
            userOwnedPixels.push({ x, y });
          }
          index++;
        }
      }
      
      setUserPixels(userOwnedPixels);
    } catch (err) {
      console.error('Error fetching user pixels:', err);
    }
  }, [CANVAS_HEIGHT, CANVAS_WIDTH]);

  // Handle wallet connection
  const handleWalletConnect = useCallback((address: string, displayName?: string) => {
    setWalletAddress(address);
    
    // Use the display name from Farcaster or a default
    setUsername(displayName || 'User');
    
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
    
    // Set the pixel status to pending for optimistic rendering
    setPixelStatus(prev => ({
      ...prev,
      [`${x},${y}`]: 'pending'
    }));
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
    
    // Check if this pixel is already in the transaction queue
    const pixelKey = `${x},${y}`;
    const existingTransaction = transactionQueue.find(tx => 
      tx.x === x && 
      tx.y === y && 
      (tx.status === 'queued' || tx.status === 'processing')
    );
    
    if (existingTransaction) {
      setNotification({
        message: `Pixel at (${x}, ${y}) is already in your transaction queue`,
        type: 'info'
      });
      return;
    }
    
    try {
      // Update the canvas immediately for visual feedback (optimistic rendering)
      updateCanvasWithNewPixel(x, y, selectedColor);
      
      // Add to transaction queue safely
      try {
        safeUpdateTransactionQueue(prev => {
          // Check for duplicates again (in case of race conditions)
          const isDuplicate = prev.some(tx => 
            tx.x === x && 
            tx.y === y && 
            (tx.status === 'queued' || tx.status === 'processing')
          );
          
          if (isDuplicate) return prev;
          
          return [
            ...prev,
            {
              x,
              y,
              color: selectedColor,
              status: 'queued' as const,
              timestamp: Date.now()
            }
          ];
        });
      } catch (queueErr) {
        console.error('Failed to update transaction queue:', queueErr);
      }
      
      // Get current price for this pixel from the smart contract
      try {
        const price = await getPixelPrice(x, y);
        // Safely convert price string to number with fallback
        try {
          const priceValue = parseFloat(price);
          if (!isNaN(priceValue) && isFinite(priceValue)) {
            setPixelPrices(prev => ({ ...prev, [pixelKey]: priceValue }));
          } else {
            // If conversion fails, use default price
            console.warn('Invalid price format, using default:', price);
            setPixelPrices(prev => ({ ...prev, [pixelKey]: 0.0001 }));
          }
        } catch (parseErr) {
          console.warn('Error parsing price, using default:', parseErr);
          setPixelPrices(prev => ({ ...prev, [pixelKey]: 0.0001 }));
        }
      } catch (priceErr) {
        console.error('Error getting pixel price from contract:', priceErr);
        // Fallback to API
        try {
          const response = await fetch(`/api/pixel/price?x=${x}&y=${y}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to fetch pixel price' }));
            throw new Error(errorData.error || 'Failed to fetch pixel price');
          }
          
          const data = await response.json().catch(() => null);
          if (!data) {
            throw new Error('Failed to parse pixel price response');
          }
          
          setPixelPrices(prev => ({ ...prev, [pixelKey]: data.price }));
        } catch (apiErr) {
          console.error('Error fetching pixel price from API:', apiErr);
          throw new Error('Failed to get pixel price from both contract and API');
        }
      }
      
      // Add to pending pixels
      setPendingPixels(prev => {
        // Check if this pixel is already in the list
        const exists = prev.some(pixel => pixel.x === x && pixel.y === y);
        if (exists) return prev;
        return [...prev, { x, y }];
      });
    } catch (err: any) {
      console.error('Error in pixel click handler:', err);
      
      // Safely mark the pixel as failed in the status
      if (typeof x !== 'undefined' && typeof y !== 'undefined') {
        try {
          setPixelStatus(prev => ({
            ...prev,
            [`${x},${y}`]: 'failed'
          }));
        } catch (statusErr) {
          console.error('Failed to update pixel status:', statusErr);
        }
        
        // Safely update transaction queue - with try/catch
        try {
          safeUpdateTransactionQueue(prev => 
            prev.map(item => 
              (item.x === x && item.y === y) 
                ? { ...item, status: 'failed' as const } 
                : item
            )
          );
        } catch (queueErr) {
          console.error('Failed to update transaction queue:', queueErr);
        }
      }
      
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to get pixel price. Please try again.',
        type: 'error'
      });
    }
  }, [walletAddress, selectedColor, updateCanvasWithNewPixel, safeUpdateTransactionQueue, transactionQueue]);

  // Handle pixel purchase
  const handlePurchasePixel = useCallback(async (x: number, y: number) => {
    if (!walletAddress) {
      setNotification({
        message: 'Please connect your wallet to purchase pixels',
        type: 'error'
      });
      return;
    }
    
    if (isPurchasing) {
      setNotification({
        message: 'Please wait for the current transaction to complete',
        type: 'info'
      });
      return;
    }
    
    try {
      // Get the current price of the pixel
      const price = await getPixelPrice(x, y);
      
      // Add the pixel to the transaction queue
      safeUpdateTransactionQueue(prev => [
        ...prev,
        {
          x,
          y,
          color: selectedColor,
          status: 'queued',
          timestamp: Date.now()
        }
      ]);
      
      // Update the canvas with the new color (optimistic rendering)
      updateCanvasWithNewPixel(x, y, selectedColor);
      
      // Add the pixel to the pending list
      setPendingPixels(prev => [...prev, { x, y }]);
      
    } catch (err) {
      console.error('Error initiating pixel purchase:', err);
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to initiate pixel purchase',
        type: 'error'
      });
    }
  }, [walletAddress, isPurchasing, selectedColor, updateCanvasWithNewPixel, safeUpdateTransactionQueue]);
  
  // Process the transaction queue
  const processTransactionQueue = useCallback(async () => {
    // Get all queued transactions
    const queuedTransactions = transactionQueue.filter(tx => tx.status === 'queued');
    
    if (queuedTransactions.length === 0) {
      return;
    }
    
    if (!walletAddress) {
      setNotification({
        message: 'Please connect your wallet to purchase pixels',
        type: 'error'
      });
      return;
    }
    
    try {
      setIsPurchasing(true);
      
      // Show a notification that we're processing the batch transaction
      setNotification({
        message: `Processing batch purchase of ${queuedTransactions.length} pixels...`,
        type: 'info'
      });
      
      // Process each queued pixel purchase in sequence
      const pixelsToPurchase: {x: number, y: number, color: string}[] = queuedTransactions.map(tx => ({ x: tx.x, y: tx.y, color: tx.color }));
      
      // Update all pixels to processing status
      setPixelStatus(prev => {
        const newStatus: Record<string, PixelStatus> = { ...prev };
        pixelsToPurchase.forEach(pixel => {
          newStatus[`${pixel.x},${pixel.y}`] = 'processing';
        });
        return newStatus;
      });
      
      // Execute the batch purchase
      const transaction = await purchasePixelsBatch(walletAddress, pixelsToPurchase);
      
      if (transaction.success) {
        // Mark all transactions as completed in the queue
        safeUpdateTransactionQueue(prev => 
          prev.map(item => 
            (pixelsToPurchase.some(pixel => pixel.x === item.x && pixel.y === item.y)) 
              ? { ...item, status: 'completed' as const } 
              : item
          )
        );
        
        // Update pixel status to confirmed
        setPixelStatus(prev => {
          const newStatus: Record<string, PixelStatus> = { ...prev };
          pixelsToPurchase.forEach(pixel => {
            newStatus[`${pixel.x},${pixel.y}`] = 'confirmed';
          });
          return newStatus;
        });
        
        // Add purchased pixels to localStorage
        pixelsToPurchase.forEach(pixel => {
          addPurchasedPixel({ x: pixel.x, y: pixel.y, color: pixel.color, timestamp: Date.now() });
        });
        
        // Show success notification
        setNotification({
          message: `Successfully purchased ${pixelsToPurchase.length} pixels!`,
          type: 'success'
        });
        
        // Update owned pixels
        fetchUserPixels(walletAddress);
      } else if (transaction.failedPixels && transaction.failedPixels.length > 0) {
        // Handle partially successful batch
        const successfulPixels = pixelsToPurchase.filter(pixel => 
          !transaction.failedPixels?.some(fp => fp.x === pixel.x && fp.y === pixel.y)
        );
        
        // Mark successful transactions as completed
        safeUpdateTransactionQueue(prev => 
          prev.map(item => {
            const isSuccessful = successfulPixels.some(pixel => pixel.x === item.x && pixel.y === item.y);
            const isFailed = transaction.failedPixels?.some(fp => fp.x === item.x && fp.y === item.y);
            
            if (isSuccessful) return { ...item, status: 'completed' as const };
            if (isFailed) return { ...item, status: 'failed' as const };
            return item;
          })
        );
        
        // Update pixel statuses
        setPixelStatus(prev => {
          const newStatus: Record<string, PixelStatus> = { ...prev };
          
          successfulPixels.forEach(pixel => {
            newStatus[`${pixel.x},${pixel.y}`] = 'confirmed';
          });
          
          transaction.failedPixels?.forEach(pixel => {
            newStatus[`${pixel.x},${pixel.y}`] = 'failed';
          });
          
          return newStatus;
        });
        
        // Add successful pixels to localStorage
        successfulPixels.forEach(pixel => {
          addPurchasedPixel({ x: pixel.x, y: pixel.y, color: pixel.color, timestamp: Date.now() });
        });
        
        // Show partial success notification
        setNotification({
          message: `Purchased ${successfulPixels.length} pixels, but ${transaction.failedPixels.length} failed`,
          type: 'info'
        });
        
        // Update owned pixels for successful purchases
        if (successfulPixels.length > 0) {
          fetchUserPixels(walletAddress);
        }
      }
      
    } catch (err) {
      console.error('Error in batch purchase process:', err);
      
      // Mark all transactions as failed
      safeUpdateTransactionQueue(prev => 
        prev.map(item => 
          (queuedTransactions.some(tx => tx.x === item.x && tx.y === item.y)) 
            ? { ...item, status: 'failed' as const } 
            : item
        )
      );
      
      // Update all pixel statuses to failed
      setPixelStatus(prev => {
        const newStatus: Record<string, PixelStatus> = { ...prev };
        queuedTransactions.forEach(tx => {
          newStatus[`${tx.x},${tx.y}`] = 'failed';
        });
        return newStatus;
      });
      
      setNotification({
        message: err instanceof Error ? err.message : 'Failed to process batch purchase',
        type: 'error'
      });
    } finally {
      setIsPurchasing(false);
      setPendingPixels([]);
    }
  }, [transactionQueue, walletAddress, fetchUserPixels, safeUpdateTransactionQueue]);

  // Function to cancel a specific pixel transaction
  const cancelPixel = useCallback((x: number, y: number) => {
    console.log('Canceling pixel:', x, y);
    
    // Find the pixel change to restore original color
    const pixelChange = tempPixelChanges.find(p => p.x === x && p.y === y);
    
    // Create a deep copy of the canvas data
    const newCanvasData = JSON.parse(JSON.stringify(canvasData));
    
    if (pixelChange) {
      console.log('Found pixel change, restoring original color:', pixelChange.originalColor);
      
      // Ensure the row array is properly cloned before modifying
      newCanvasData[y] = [...newCanvasData[y]];
      // Restore the original color
      newCanvasData[y][x] = pixelChange.originalColor;
    } else {
      console.warn('No pixel change found for', x, y);
      
      // Even if we don't have a temp pixel change, try to restore from the API
      getPixelColor(x, y)
        .then(originalColor => {
          console.log('Retrieved original color from API:', originalColor);
          
          // Create a deep copy of the canvas data
          const apiCanvasData = JSON.parse(JSON.stringify(canvasData));
          
          // Ensure the row array is properly cloned before modifying
          apiCanvasData[y] = [...apiCanvasData[y]];
          // Restore the original color
          apiCanvasData[y][x] = originalColor;
          
          // Update the canvas with the restored color
          setCanvasData(apiCanvasData);
        })
        .catch(err => {
          console.error('Failed to retrieve original color:', err);
          // Fallback to white if we can't get the original color
          const fallbackCanvasData = JSON.parse(JSON.stringify(canvasData));
          fallbackCanvasData[y] = [...fallbackCanvasData[y]];
          fallbackCanvasData[y][x] = '#FFFFFF';
          setCanvasData(fallbackCanvasData);
        });
      
      // For immediate feedback, set to white while API call is in progress
      newCanvasData[y] = [...newCanvasData[y]];
      newCanvasData[y][x] = '#FFFFFF';
    }
    
    // Update the canvas with the restored color (immediate update)
    setCanvasData(newCanvasData);
    
    // Clear pixel status
    setPixelStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[`${x},${y}`];
      return newStatus;
    });
    
    // Remove from temp pixel changes
    setTempPixelChanges(prev => 
      prev.filter(p => !(p.x === x && p.y === y))
    );
    
    // Remove from pending pixels
    setPendingPixels(prev => prev.filter(p => !(p.x === x && p.y === y)));
    
    // Remove from transaction queue
    setTransactionQueue(prev => prev.filter(tx => !(tx.x === x && tx.y === y)));
    
    // Remove the pixel price from pixelPrices
    setPixelPrices(prev => {
      const newPrices = { ...prev };
      delete newPrices[`${x},${y}`];
      return newPrices;
    });
    
    // Force a re-render of the canvas
    setTimeout(() => {
      setCanvasData(current => JSON.parse(JSON.stringify(current)));
    }, 50);
  }, [canvasData, tempPixelChanges]);

  // Cancel pending purchase (batch cancel)
  const handleCancelPurchase = useCallback(() => {
    console.log('Canceling all pending purchases');
    
    // Cancel each pending pixel
    pendingPixels.forEach(pixel => {
      cancelPixel(pixel.x, pixel.y);
    });
    
    // Clear the pending pixels array
    setPendingPixels([]);
    
    // Clear the pixel price
    setPixelPrice(null);
    
    // Clear the pixel prices
    setPixelPrices({});
  }, [pendingPixels, cancelPixel]);

  // Toggle visibility of owned pixels
  const toggleOwnedPixelsVisibility = useCallback(() => {
    setShowOwnedPixels(prev => !prev);
  }, []);

  // Format price to show with comma as decimal separator (European format)
  const formatPrice = (price: number): string => {
    if (price === 0) return '0 ETH';
    
    // Fix JavaScript floating-point precision issues
    // For example, 0.0001 * 1.1 might result in 0.00011000000000000002
    const fixedPrice = parseFloat(price.toFixed(8));
    
    // Determine the appropriate number of decimal places based on price magnitude
    const decimalPlaces = fixedPrice < 0.001 ? 6 : fixedPrice < 0.01 ? 5 : 4;
    
    // Convert the price to string with European format (comma as decimal separator)
    const priceStr = fixedPrice.toFixed(decimalPlaces).replace('.', ',');
    
    // Remove trailing zeros after the comma, but keep at least one decimal place
    const formattedPrice = priceStr.replace(/,0+$/, ',0');
    
    return `${formattedPrice} ETH`;
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
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pixel Battle</h1>
            {username && (
              <p className="text-purple-600 font-medium">Hi {username}.</p>
            )}
            <p className="text-gray-600">Paint pixels, own the canvas, win prizes!</p>
            <p className="text-sm text-gray-500 mt-1">
              Contract: <a 
                href={`https://sepolia.basescan.org/address/0xeA436Ce321B5dcb7F2e3F32d74Ef4b78e427BFbd`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                0xeA436Ce321B5dcb7F2e3F32d74Ef4b78e427BFbd
              </a>
            </p>
          </div>
          {/* Wallet Connection */}
          <div className="mb-6 w-full flex justify-center">
            <WalletConnection 
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
            />
          </div>
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
                <li>• Initial pixel cost: 0.001 ETH</li>
                <li>• Price increases 1.1x when purchased</li>
                <li>• 84% goes to previous owner</li>
                <li>• 15% goes to prize pool</li>
                <li>• Game ends after 24h of inactivity</li>
                <li>• Prize pool divided among all players lasting</li>
                <li>• Potential ROI up to 75%</li>
              </ul>
              
              {/* Game Status */}
              {gameStatus && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="font-medium mb-1">Game Status</h4>
                  <p className={`text-sm ${gameStatus.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {gameStatus.isActive ? 'Active' : 'Ended'}
                  </p>
                  {!gameStatus.isActive && gameStatus.endTime && (
                    <p className="text-xs mt-1">
                      Ended on: {new Date(gameStatus.endTime).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
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
              pixelStatus={pixelStatus}
            />
            
            {/* Single Color Palette */}
            <div className="mt-4">
              <ColorPalette 
                selectedColor={selectedColor}
                onColorSelect={handleColorSelect}
              />
            </div>
            
            {/* Transaction Queue Display */}
            {transactionQueue.length > 0 && (
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <h3 className="text-sm font-medium mb-2">Transaction Queue ({transactionQueue.length})</h3>
                <div className="max-h-40 overflow-y-auto">
                  {transactionQueue.map((tx, index) => (
                    <div 
                      key={`${tx.x},${tx.y}-${tx.timestamp}`} 
                      className={`text-xs p-2 mb-1 rounded-md flex justify-between items-center ${
                        tx.status === 'completed' ? 'bg-green-100' : 
                        tx.status === 'failed' ? 'bg-red-100' : 
                        tx.status === 'processing' ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}
                    >
                      <span>
                        Pixel ({tx.x}, {tx.y}) - 
                        {tx.status === 'queued' && 'Queued'}
                        {tx.status === 'processing' && (
                          <span className="flex items-center">
                            Processing
                            <div className="ml-1 w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
                          </span>
                        )}
                        {tx.status === 'completed' && 'Completed'}
                        {tx.status === 'failed' && 'Failed'}
                      </span>
                      {tx.status === 'queued' && (
                        <button 
                          onClick={() => {
                            // Use the unified cancelPixel function
                            cancelPixel(tx.x, tx.y);
                          }}
                          className="text-gray-500 hover:text-red-700"
                          title="Cancel this transaction"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Purchase Dialog */}
            {pendingPixels.length > 0 && (
              <div className="bg-gray-100 p-4 mt-4 rounded-lg" data-testid="purchase-dialog">
                <h3 className="text-lg font-medium mb-2">Confirm Purchase</h3>
                <p>
                  {pendingPixels.length} pixel{pendingPixels.length > 1 ? 's' : ''} at: {pendingPixels.map((pixel, index) => (
                    <span key={`${pixel.x}-${pixel.y}`}>
                      {pixel.x},{pixel.y}{index < pendingPixels.length - 1 ? '; ' : ''}
                    </span>
                  ))}
                  <br />
                  <span className="font-medium">Total price: {formatPrice(pendingPixels.reduce((acc, pixel) => acc + pixelPrices[`${pixel.x},${pixel.y}`], 0))}</span>
                </p>
                <div className="flex gap-2 mt-3">
                  <Button 
                    onClick={processTransactionQueue} 
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
    </div>
  );
};

export default PixelBattleApp;
