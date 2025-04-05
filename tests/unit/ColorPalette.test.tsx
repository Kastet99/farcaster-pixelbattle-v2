import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorPalette from '../../src/components/ColorPalette';

describe('ColorPalette Component', () => {
  const mockOnColorSelect = jest.fn();
  const mockOnReset = jest.fn();
  
  beforeEach(() => {
    mockOnColorSelect.mockClear();
    mockOnReset.mockClear();
  });
  
  test('renders all 16 colors', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect} 
      />
    );
    
    // The component should have 16 color buttons
    const colorButtons = screen.getAllByRole('button');
    expect(colorButtons).toHaveLength(16);
  });
  
  test('highlights the selected color', () => {
    const selectedColor = '#0000FF';
    
    render(
      <ColorPalette 
        selectedColor={selectedColor} 
        onColorSelect={mockOnColorSelect} 
      />
    );
    
    // Find the selected color button
    const selectedButton = screen.getByTestId(`color-${selectedColor.replace('#', '')}`);
    
    // Check that it has the selected styling (border-black class)
    expect(selectedButton.className).toContain('border-black');
    expect(selectedButton.className).toContain('scale-110');
  });
  
  test('calls onColorSelect when a color is clicked', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect} 
      />
    );
    
    // Click on the blue color
    const blueColorButton = screen.getByTestId('color-0000FF');
    fireEvent.click(blueColorButton);
    
    // Check that the callback was called with the correct color
    expect(mockOnColorSelect).toHaveBeenCalledTimes(1);
    expect(mockOnColorSelect).toHaveBeenCalledWith('#0000FF');
  });
  
  test('applies custom className when provided', () => {
    const customClass = 'custom-test-class';
    
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect}
        className={customClass}
      />
    );
    
    const paletteContainer = screen.getByTestId('color-palette');
    expect(paletteContainer.className).toContain(customClass);
  });
  
  test('each color button has accessible label', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect} 
      />
    );
    
    // Check that each button has an aria-label
    const colorButtons = screen.getAllByRole('button');
    colorButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('Select color');
    });
  });
  
  test('renders with default styling when no className is provided', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect} 
      />
    );
    
    const paletteContainer = screen.getByTestId('color-palette');
    expect(paletteContainer.className).toContain('flex');
    expect(paletteContainer.className).toContain('bg-gray-100');
    expect(paletteContainer.className).toContain('rounded-lg');
  });

  test('renders reset button when onReset is provided', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect}
        onReset={mockOnReset}
      />
    );
    
    const resetButton = screen.getByTestId('reset-pixels-button');
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveTextContent('Reset Unpurchased Pixels');
  });

  test('does not render reset button when onReset is not provided', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect}
      />
    );
    
    expect(screen.queryByTestId('reset-pixels-button')).not.toBeInTheDocument();
  });

  test('calls onReset when reset button is clicked', () => {
    render(
      <ColorPalette 
        selectedColor="#FF0000" 
        onColorSelect={mockOnColorSelect}
        onReset={mockOnReset}
      />
    );
    
    const resetButton = screen.getByTestId('reset-pixels-button');
    fireEvent.click(resetButton);
    
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });
});
