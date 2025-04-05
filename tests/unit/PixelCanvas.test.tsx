import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PixelCanvas from '../../src/components/PixelCanvas';

describe('PixelCanvas Component', () => {
  const mockOnPixelClick = jest.fn();
  const mockUpdateCanvasWithNewPixel = jest.fn();
  const defaultProps = {
    width: 32,
    height: 32,
    pixelSize: 10,
    initialColors: Array(32).fill(Array(32).fill('#FFFFFF')),
    readOnly: false,
    onPixelClick: mockOnPixelClick,
    selectedColor: '#FF0000',
    updateCanvasWithNewPixel: mockUpdateCanvasWithNewPixel
  };

  beforeEach(() => {
    mockOnPixelClick.mockClear();
    mockUpdateCanvasWithNewPixel.mockClear();
  });

  test('renders the correct number of pixels', () => {
    render(<PixelCanvas {...defaultProps} />);
    const pixels = screen.getAllByTestId(/pixel-/);
    expect(pixels.length).toBe(32 * 32); // 1024 pixels total
  });

  test('handles pixel click correctly', () => {
    render(<PixelCanvas {...defaultProps} />);
    const pixel = screen.getByTestId('pixel-5-10'); // Example pixel at x=5, y=10
    fireEvent.click(pixel);
    expect(mockOnPixelClick).toHaveBeenCalledWith(5, 10, '#FFFFFF');
  });

  test('does not allow clicks when readOnly is true', () => {
    render(<PixelCanvas {...defaultProps} readOnly={true} />);
    const pixel = screen.getByTestId('pixel-5-10');
    fireEvent.click(pixel);
    expect(mockOnPixelClick).not.toHaveBeenCalled();
  });

  test('renders pixels with correct colors', () => {
    const customColors = Array(32).fill(0).map(() => Array(32).fill('#FF0000'));
    customColors[5][10] = '#00FF00'; // Set a specific pixel to a different color
    
    render(<PixelCanvas {...defaultProps} initialColors={customColors} />);
    const redPixel = screen.getByTestId('pixel-0-0');
    const greenPixel = screen.getByTestId('pixel-5-10');
    
    expect(redPixel).toHaveStyle('background-color: #FF0000');
    expect(greenPixel).toHaveStyle('background-color: #00FF00');
  });

  test('uses selectedColor prop for painting', () => {
    const selectedColor = '#0000FF'; // Blue
    render(<PixelCanvas {...defaultProps} selectedColor={selectedColor} />);
    
    // Simulate mouse down on a pixel
    const pixel = screen.getByTestId('pixel-5-10');
    fireEvent.mouseDown(pixel);
    
    // Verify that updateCanvasWithNewPixel was called with the correct color
    expect(mockUpdateCanvasWithNewPixel).toHaveBeenCalledWith(5, 10, selectedColor);
  });

  test('handles mouse move for continuous painting', () => {
    render(<PixelCanvas {...defaultProps} />);
    
    // Get the canvas container
    const canvasContainer = screen.getByTestId('pixel-canvas-container');
    
    // Simulate mouse down on a pixel to start painting
    const startPixel = screen.getByTestId('pixel-5-10');
    fireEvent.mouseDown(startPixel);
    
    // Mock getBoundingClientRect for the canvas container
    const originalGetBoundingClientRect = canvasContainer.getBoundingClientRect;
    canvasContainer.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 320,
      height: 320,
      right: 320,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    // Simulate mouse move to another pixel
    fireEvent.mouseMove(canvasContainer, {
      clientX: 65, // Should be pixel at x=6
      clientY: 105 // Should be pixel at y=10
    });
    
    // Restore the original method
    canvasContainer.getBoundingClientRect = originalGetBoundingClientRect;
    
    // Verify that updateCanvasWithNewPixel was called for the second pixel
    expect(mockUpdateCanvasWithNewPixel).toHaveBeenCalledWith(6, 10, '#FF0000');
  });

  test('stops painting on mouse up', () => {
    render(<PixelCanvas {...defaultProps} />);
    
    // Get the canvas container
    const canvasContainer = screen.getByTestId('pixel-canvas-container');
    
    // Simulate mouse down on a pixel to start painting
    const startPixel = screen.getByTestId('pixel-5-10');
    fireEvent.mouseDown(startPixel);
    
    // Simulate mouse up to stop painting
    fireEvent.mouseUp(canvasContainer);
    
    // Clear the mock to reset call count
    mockUpdateCanvasWithNewPixel.mockClear();
    
    // Mock getBoundingClientRect for the canvas container
    const originalGetBoundingClientRect = canvasContainer.getBoundingClientRect;
    canvasContainer.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 320,
      height: 320,
      right: 320,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    // Simulate mouse move to another pixel
    fireEvent.mouseMove(canvasContainer, {
      clientX: 65, // Should be pixel at x=6
      clientY: 105 // Should be pixel at y=10
    });
    
    // Restore the original method
    canvasContainer.getBoundingClientRect = originalGetBoundingClientRect;
    
    // Verify that updateCanvasWithNewPixel was NOT called after mouse up
    expect(mockUpdateCanvasWithNewPixel).not.toHaveBeenCalled();
  });

  test('handles touch events for mobile painting', () => {
    render(<PixelCanvas {...defaultProps} />);
    
    // Get the canvas container
    const canvasContainer = screen.getByTestId('pixel-canvas-container');
    
    // Mock getBoundingClientRect for the canvas container
    const originalGetBoundingClientRect = canvasContainer.getBoundingClientRect;
    canvasContainer.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 320,
      height: 320,
      right: 320,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    // Simulate touch start
    fireEvent.touchStart(canvasContainer, {
      touches: [{ clientX: 55, clientY: 105 }] // Should be pixel at x=5, y=10
    });
    
    // Verify that updateCanvasWithNewPixel was called for the touch position
    expect(mockUpdateCanvasWithNewPixel).toHaveBeenCalledWith(5, 10, '#FF0000');
    
    // Clear the mock to reset call count
    mockUpdateCanvasWithNewPixel.mockClear();
    
    // Simulate touch move
    fireEvent.touchMove(canvasContainer, {
      touches: [{ clientX: 65, clientY: 105 }] // Should be pixel at x=6, y=10
    });
    
    // Verify that updateCanvasWithNewPixel was called for the new touch position
    expect(mockUpdateCanvasWithNewPixel).toHaveBeenCalledWith(6, 10, '#FF0000');
    
    // Restore the original method
    canvasContainer.getBoundingClientRect = originalGetBoundingClientRect;
  });

  test('renders with correct pixel size', () => {
    const pixelSize = 15;
    render(<PixelCanvas {...defaultProps} pixelSize={pixelSize} />);
    const pixel = screen.getByTestId('pixel-0-0');
    
    expect(pixel).toHaveStyle(`width: ${pixelSize}px`);
    expect(pixel).toHaveStyle(`height: ${pixelSize}px`);
  });

  test('canvas has correct dimensions', () => {
    const width = 20;
    const height = 25;
    const pixelSize = 10;
    
    render(
      <PixelCanvas 
        {...defaultProps} 
        width={width} 
        height={height} 
        pixelSize={pixelSize} 
        initialColors={Array(height).fill(Array(width).fill('#FFFFFF'))}
      />
    );
    
    const canvas = screen.getByTestId('pixel-canvas');
    expect(canvas).toHaveStyle(`width: ${width * pixelSize}px`);
    expect(canvas).toHaveStyle(`height: ${height * pixelSize}px`);
  });
});
