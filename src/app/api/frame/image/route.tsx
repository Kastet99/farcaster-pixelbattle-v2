import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { kv } from '~/lib/kv';

// Canvas dimensions from PRD
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;
const PIXEL_SIZE = 15; // Size of each pixel in the generated image
const PADDING = 40; // Padding around the canvas

// Image dimensions
const WIDTH = CANVAS_WIDTH * PIXEL_SIZE + PADDING * 2;
const HEIGHT = CANVAS_HEIGHT * PIXEL_SIZE + PADDING * 2 + 80; // Extra space for title

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // Get canvas data from KV store
    let canvasData = await kv.get('pixelCanvas');
    let pixelColors: string[][];
    
    if (!canvasData) {
      // Initialize with blank canvas if no data exists
      pixelColors = Array(CANVAS_HEIGHT).fill(0).map(() => 
        Array(CANVAS_WIDTH).fill('#FFFFFF')
      );
      await kv.set('pixelCanvas', JSON.stringify(pixelColors));
    } else {
      pixelColors = JSON.parse(canvasData);
    }

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            padding: `${PADDING}px`,
            fontFamily: 'sans-serif',
          }}
        >
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            marginBottom: '20px',
            color: '#333'
          }}>
            Pixel Battle
          </h1>
          
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${CANVAS_WIDTH}, ${PIXEL_SIZE}px)`,
              gridTemplateRows: `repeat(${CANVAS_HEIGHT}, ${PIXEL_SIZE}px)`,
              gap: '1px',
              backgroundColor: '#ddd',
              padding: '1px',
              borderRadius: '4px',
            }}
          >
            {pixelColors.map((row, y) =>
              row.map((color, x) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    backgroundColor: color,
                    width: `${PIXEL_SIZE}px`,
                    height: `${PIXEL_SIZE}px`,
                  }}
                />
              ))
            )}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            marginTop: '15px',
            color: '#666'
          }}>
            Paint pixels at escalating prices • Previous owners earn profit
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch (error) {
    console.error('Error generating frame image:', error);
    
    // Return a fallback image with error message
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            padding: '40px',
            fontFamily: 'sans-serif',
          }}
        >
          <h1 style={{ color: '#FF0000' }}>Error Loading Pixel Battle</h1>
          <p>Please try again later</p>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  }
}
