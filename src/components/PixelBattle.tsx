"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import PixelCanvas from './PixelCanvas';
import { Button } from './ui/Button';
import { useFrame } from './providers/FrameProvider';

// Canvas dimensions from PRD
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

export default function PixelBattle() {
  const { isConnected, address } = useAccount();
  const { addFrame } = useFrame();
  const [canvasData, setCanvasData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPixel, setSelectedPixel] = useState<{x: number, y: number, price: number} | null>(null);
  const [ownedPixels, setOwnedPixels] = useState<{x: number, y: number}[]>([]);
  
  // Fetch canvas data
  useEffect(() => {
    const fetchCanvasData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/canvas');
        if (response.ok) {
          const data = await response.json();
          setCanvasData(data.canvas);
          
          // If user is connected, fetch their owned pixels
          if (isConnected && address) {
            fetchOwnedPixels(address);
          }
        } else {
          console.error('Failed to fetch canvas data');
        }
      } catch (error) {
        console.error('Error fetching canvas data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCanvasData();
  }, [isConnected, address]);
  
  // Fetch pixels owned by the user
  const fetchOwnedPixels = async (userAddress: string) => {
    try {
      const response = await fetch(`/api/user/pixels?address=${userAddress}`);
      if (response.ok) {
        const data = await response.json();
        setOwnedPixels(data.pixels || []);
      }
    } catch (error) {
      console.error('Error fetching owned pixels:', error);
    }
  };
  
  // Handle pixel click
  const handlePixelClick = async (x: number, y: number, currentColor: string) => {
    try {
      // Fetch the current price for this pixel
      const response = await fetch(`/api/pixel/price?x=${x}&y=${y}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPixel({ x, y, price: data.price });
      }
    } catch (error) {
      console.error('Error fetching pixel price:', error);
    }
  };
  
  // Purchase and paint a pixel
  const purchasePixel = async (color: string) => {
    if (!selectedPixel || !isConnected) return;
    
    try {
      const { x, y, price } = selectedPixel;
      
      // In a real implementation, this would trigger a blockchain transaction
      // For now, we'll just simulate it with an API call
      const response = await fetch('/api/pixel/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x,
          y,
          color,
          address,
        }),
      });
      
      if (response.ok) {
        // Update the canvas with the new pixel
        const newCanvasData = [...canvasData];
        newCanvasData[y][x] = color;
        setCanvasData(newCanvasData);
        
        // Update owned pixels
        if (address) {
          fetchOwnedPixels(address);
        }
        
        // Clear selected pixel
        setSelectedPixel(null);
      }
    } catch (error) {
      console.error('Error purchasing pixel:', error);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6">Pixel Battle</h1>
        
        {/* Canvas */}
        <div className="mb-8">
          <PixelCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            pixelSize={12}
            initialColors={canvasData}
            readOnly={!isConnected}
            onPixelClick={handlePixelClick}
          />
        </div>
        
        {/* Connection status and actions */}
        <div className="w-full max-w-md mb-8">
          {!isConnected ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-center">
              <p className="text-yellow-700 mb-2">Connect your wallet to paint pixels</p>
              <Button>Connect Wallet</Button>
            </div>
          ) : selectedPixel ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="font-medium mb-2">Selected Pixel ({selectedPixel.x}, {selectedPixel.y})</h3>
              <p className="mb-3">Price: {selectedPixel.price.toFixed(4).replace('.', ',').replace(/,0+$/, ',0')} ETH</p>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSelectedPixel(null)}>Cancel</Button>
                <Button onClick={() => purchasePixel('#FF0000')}>Purchase & Paint</Button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
              <p className="text-green-700">Select a pixel to paint</p>
            </div>
          )}
        </div>
        
        {/* Owned pixels */}
        {isConnected && ownedPixels.length > 0 && (
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-3">Your Pixels</h2>
            <div className="bg-white border border-gray-200 rounded-md p-4">
              <p>You own {ownedPixels.length} pixels</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => {
                  // Highlight owned pixels on the canvas
                }}
              >
                Show My Pixels
              </Button>
            </div>
          </div>
        )}
        
        {/* Add to Warpcast */}
        <div className="mt-8">
          <Button onClick={addFrame}>
            Add to Warpcast
          </Button>
        </div>
      </div>
    </div>
  );
}
