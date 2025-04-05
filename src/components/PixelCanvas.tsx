"use client";

import React, { useState, useEffect, useRef } from 'react';
import { BASIC_COLORS } from './ColorPalette';

// Define the PixelStatus type to match the one in PixelBattleApp
type PixelStatus = 'pending' | 'processing' | 'confirmed' | 'failed';

interface PixelCanvasProps {
  width: number;
  height: number;
  pixelSize?: number;
  initialColors?: string[][];
  readOnly?: boolean;
  onPixelClick?: (x: number, y: number, currentColor: string) => void;
  userOwnedPixels?: {x: number, y: number}[];
  highlightOwned?: boolean;
  selectedColor?: string;
  pixelStatus?: {[key: string]: PixelStatus};
}

/**
 * PixelCanvas component for the Pixel Battle game
 * Displays a grid of pixels that can be colored
 * Includes zoom/scale functionality with pinch gesture support
 */
export default function PixelCanvas({
  width,
  height,
  pixelSize: initialPixelSize = 10,
  initialColors,
  readOnly = false,
  onPixelClick,
  userOwnedPixels = [],
  highlightOwned = false,
  selectedColor = BASIC_COLORS[0].hex,
  pixelStatus = {}
}: PixelCanvasProps) {
  // Canvas state
  const [pixelColors, setPixelColors] = useState<string[][]>(() => {
    if (initialColors) return initialColors;
    
    const initialGrid = Array(height).fill(0).map(() => 
      Array(width).fill('#FFFFFF')
    );
    return initialGrid;
  });
  
  // Scaling/zoom state
  const [pixelSize, setPixelSize] = useState(initialPixelSize);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Painting state
  const [isPainting, setIsPainting] = useState(false);
  const [lastPaintedPixel, setLastPaintedPixel] = useState<{ x: number, y: number } | null>(null);

  // Check if a pixel is owned by the user
  const isPixelOwned = (x: number, y: number): boolean => {
    return userOwnedPixels.some(pixel => pixel.x === x && pixel.y === y);
  };

  // Handle pixel click for painting
  const handlePixelClick = (x: number, y: number) => {
    if (readOnly) return;
    
    const currentColor = pixelColors[y][x];
    
    // Update local state for immediate feedback
    const newPixelColors = [...pixelColors];
    newPixelColors[y][x] = selectedColor;
    setPixelColors(newPixelColors);
    
    // Call the callback if provided
    if (onPixelClick) {
      onPixelClick(x, y, currentColor);
    }
  };
  
  // Handle mouse down on a pixel
  const handleMouseDown = (x: number, y: number, e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      if (!readOnly) {
        setIsPainting(true);
        handlePixelClick(x, y);
        setLastPaintedPixel({ x, y });
      }
    } else if (e.button === 1 || e.button === 2) { // Middle or right click for panning
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Handle mouse move for continuous painting and panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({
        x: offset.x + dx,
        y: offset.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (isPainting && !readOnly) {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left - offset.x) / pixelSize);
      const y = Math.floor((e.clientY - rect.top - offset.y) / pixelSize);
      
      // Check if within bounds
      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Only update if the pixel color is different
        if (pixelColors[y][x] !== selectedColor) {
          handlePixelClick(x, y);
          setLastPaintedPixel({ x, y });
        }
      }
    }
  };
  
  // Handle mouse up to stop painting or dragging
  const handleMouseUp = () => {
    setIsPainting(false);
    setIsDragging(false);
  };
  
  // Handle mouse leave to stop painting or dragging
  const handleMouseLeave = () => {
    setIsPainting(false);
    setIsDragging(false);
  };
  
  // Handle zoom in/out
  const handleZoom = (zoomIn: boolean) => {
    setPixelSize(prev => {
      const newSize = zoomIn ? prev + 2 : prev - 2;
      return Math.max(4, Math.min(30, newSize)); // Limit zoom range
    });
  };
  
  // Handle touch start for panning or drawing
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (!readOnly) {
        // Get the touch position relative to the canvas
        const container = containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const x = Math.floor((e.touches[0].clientX - rect.left - offset.x) / pixelSize);
        const y = Math.floor((e.touches[0].clientY - rect.top - offset.y) / pixelSize);
        
        // Check if within bounds
        if (x >= 0 && x < width && y >= 0 && y < height) {
          setIsPainting(true);
          handlePixelClick(x, y);
          setLastPaintedPixel({ x, y });
        } else {
          // If not on a pixel, prepare for panning
          setIsDragging(true);
        }
      } else {
        // If in read-only mode, just prepare for panning
        setIsDragging(true);
      }
      
      setDragStart({ 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      });
    }
  };
  
  // Handle touch move for panning and drawing
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default scrolling behavior
    
    if (e.touches.length === 1) {
      if (isPainting && !readOnly) {
        // Draw pixels as the finger moves
        const container = containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const x = Math.floor((e.touches[0].clientX - rect.left - offset.x) / pixelSize);
        const y = Math.floor((e.touches[0].clientY - rect.top - offset.y) / pixelSize);
        
        // Check if within bounds
        if (x >= 0 && x < width && y >= 0 && y < height) {
          // Only update if the pixel color is different
          if (pixelColors[y][x] !== selectedColor) {
            handlePixelClick(x, y);
            setLastPaintedPixel({ x, y });
          }
        }
      } else if (isDragging) {
        // Handle panning with one finger
        const dx = e.touches[0].clientX - dragStart.x;
        const dy = e.touches[0].clientY - dragStart.y;
        
        setOffset({
          x: offset.x + dx,
          y: offset.y + dy
        });
        
        setDragStart({ 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        });
      }
    }
  };
  
  // Handle touch end
  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPainting(false);
  };
  
  // Prevent context menu on right click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };
  
  // Reset view to center and default zoom
  const resetView = () => {
    setPixelSize(initialPixelSize);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col items-center">
      {/* Zoom controls */}
      <div className="flex gap-2 mb-2">
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => handleZoom(true)}
          aria-label="Zoom in"
        >
          <span className="text-lg">+</span>
        </button>
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => handleZoom(false)}
          aria-label="Zoom out"
        >
          <span className="text-lg">-</span>
        </button>
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={resetView}
          aria-label="Reset view"
        >
          <span className="text-sm">Reset</span>
        </button>
      </div>
      
      {/* Canvas container with overflow handling */}
      <div 
        className="overflow-auto border border-gray-300 bg-white relative"
        style={{
          width: `${Math.min(width * pixelSize + 2, 600)}px`,
          height: `${Math.min(height * pixelSize + 2, 600)}px`,
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Canvas grid with transform for panning */}
        <div 
          ref={containerRef}
          className="absolute"
          style={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${width}, ${pixelSize}px)`,
            gridTemplateRows: `repeat(${height}, ${pixelSize}px)`,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            cursor: isPainting ? 'crosshair' : isDragging ? 'grabbing' : 'grab'
          }}
          onMouseMove={handleMouseMove}
          data-testid="pixel-grid"
        >
          {pixelColors.map((row, y) => 
            row.map((color, x) => {
              const owned = isPixelOwned(x, y);
              return (
                <div
                  key={`${x}-${y}`}
                  className={`relative ${owned && highlightOwned ? 'z-10' : ''}`}
                  style={{ 
                    backgroundColor: color,
                    width: `${pixelSize}px`,
                    height: `${pixelSize}px`,
                  }}
                  onMouseDown={(e) => handleMouseDown(x, y, e)}
                  data-testid={`pixel-${x}-${y}`}
                  data-owned={owned ? 'true' : 'false'}
                >
                  {owned && highlightOwned && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ 
                        boxShadow: '0 0 8px 2px rgba(255, 215, 0, 0.7) inset',
                        background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0) 70%)'
                      }}
                    />
                  )}
                  {pixelStatus[`${x},${y}`] === 'pending' && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                    />
                  )}
                  {pixelStatus[`${x},${y}`] === 'processing' && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    />
                  )}
                  {pixelStatus[`${x},${y}`] === 'confirmed' && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    />
                  )}
                  {pixelStatus[`${x},${y}`] === 'failed' && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)' }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
