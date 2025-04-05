import React from 'react';

// Define a single pastel color palette with 16 colors
const PASTEL_COLORS = [
  { hex: '#FFB3BA', name: 'Pastel Pink' },
  { hex: '#FFDFBA', name: 'Pastel Orange' },
  { hex: '#FFFFBA', name: 'Pastel Yellow' },
  { hex: '#BAFFC9', name: 'Pastel Green' },
  { hex: '#BAE1FF', name: 'Pastel Blue' },
  { hex: '#E2BAFF', name: 'Pastel Purple' },
  { hex: '#FFCCCC', name: 'Light Pink' },
  { hex: '#FFEACC', name: 'Light Peach' },
  { hex: '#FFFFCC', name: 'Light Yellow' },
  { hex: '#CCFFCC', name: 'Light Green' },
  { hex: '#CCE5FF', name: 'Light Blue' },
  { hex: '#E5CCFF', name: 'Light Purple' },
  { hex: '#000000', name: 'Black' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#CCCCCC', name: 'Light Gray' },
  { hex: '#777777', name: 'Dark Gray' }
];

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onReset?: () => void;
  className?: string;
}

/**
 * ColorPalette component for selecting colors in the Pixel Battle game
 * Provides 16 pastel colors in a simple grid layout with a reset button
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
          {PASTEL_COLORS.map(({ hex, name }) => (
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
        
        {onReset && (
          <button
            className="w-full py-1 px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium transition-colors"
            onClick={onReset}
            aria-label="Reset unpurchased pixels"
            data-testid="reset-pixels-button"
          >
            Reset Unpurchased Pixels
          </button>
        )}
      </div>
    </div>
  );
};

// Export the component and color constants for reuse
export { PASTEL_COLORS };
export default ColorPalette;
