import React from 'react';

// Define a palette of basic colors
const BASIC_COLORS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#FF0000', name: 'Red' },
  { hex: '#00FF00', name: 'Green' },
  { hex: '#0000FF', name: 'Blue' },
  { hex: '#FFFF00', name: 'Yellow' },
  { hex: '#FF00FF', name: 'Magenta' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#FFA500', name: 'Orange' },
  { hex: '#800080', name: 'Purple' },
  { hex: '#A52A2A', name: 'Brown' },
  { hex: '#808080', name: 'Gray' },
  { hex: '#FF69B4', name: 'Pink' },
  { hex: '#008000', name: 'Dark Green' },
  { hex: '#000080', name: 'Navy Blue' },
  { hex: '#8B4513', name: 'Saddle Brown' }
];

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onReset?: () => void;
  className?: string;
}

/**
 * ColorPalette component for selecting colors in the Pixel Battle game
 * Provides 16 basic colors in a simple grid layout
 */
const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
  onReset,
  className = '',
}) => {
  return (
    <div className={`p-3 bg-gray-100 rounded-lg ${className}`} data-testid="color-palette">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-8 gap-2">
          {BASIC_COLORS.map(({ hex, name }) => (
            <button
              key={hex}
              className={`w-8 h-8 rounded-full border-2 ${
                selectedColor === hex ? 'border-black shadow-lg scale-110' : 'border-gray-300'
              } transition-transform hover:scale-105`}
              style={{ backgroundColor: hex }}
              onClick={() => onColorSelect(hex)}
              aria-label={`Select color ${name}`}
              data-testid={`color-${hex.replace('#', '')}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Export the component and color constants for reuse
export { BASIC_COLORS };
export default ColorPalette;
