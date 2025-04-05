import { NextRequest, NextResponse } from 'next/server';
import { kv } from '~/lib/kv';

// Default canvas size from PRD
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

export async function GET(req: NextRequest): Promise<NextResponse> {
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
    
    return NextResponse.json({ 
      canvas: pixelColors,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    });
  } catch (error) {
    console.error('Error fetching canvas data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvas data' }, 
      { status: 500 }
    );
  }
}
