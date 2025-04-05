import { NextRequest, NextResponse } from 'next/server';
import { kv } from '~/lib/kv';

// Default canvas size from PRD
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

// Get current pixel price
async function getPixelPrice(x: number, y: number) {
  const priceKey = `price:${x}:${y}`;
  const price = await kv.get(priceKey);
  
  // Initial price from PRD is 0.0001 ETH
  return price ? parseFloat(price) : 0.0001;
}

// Update pixel price (1.1x increase as per PRD)
async function updatePixelPrice(x: number, y: number) {
  const priceKey = `price:${x}:${y}`;
  const currentPrice = await getPixelPrice(x, y);
  const newPrice = currentPrice * 1.1; // 1.1x price increase per PRD
  
  await kv.set(priceKey, newPrice.toString());
  return newPrice;
}

// Update pixel ownership
async function updatePixelOwnership(x: number, y: number, address: string) {
  const ownerKey = `owner:${x}:${y}`;
  await kv.set(ownerKey, address);
  
  // Also update the user's owned pixels list
  const userPixelsKey = `user:${address}:pixels`;
  let userPixels = await kv.get(userPixelsKey);
  let pixelsList = userPixels ? JSON.parse(userPixels) : [];
  
  // Check if pixel is already in the list
  const pixelExists = pixelsList.some((p: {x: number, y: number}) => p.x === x && p.y === y);
  if (!pixelExists) {
    pixelsList.push({ x, y });
    await kv.set(userPixelsKey, JSON.stringify(pixelsList));
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { x, y, color, address } = await req.json();
    
    // Validate inputs
    if (
      typeof x !== 'number' || 
      typeof y !== 'number' || 
      !color || 
      !address ||
      x < 0 || 
      x >= CANVAS_WIDTH || 
      y < 0 || 
      y >= CANVAS_HEIGHT
    ) {
      return NextResponse.json(
        { error: 'Invalid input parameters' }, 
        { status: 400 }
      );
    }
    
    // Get current canvas state
    const canvasData = await kv.get('pixelCanvas');
    if (!canvasData) {
      return NextResponse.json(
        { error: 'Canvas data not found' }, 
        { status: 500 }
      );
    }
    
    // Update canvas with new pixel color
    const canvas = JSON.parse(canvasData);
    canvas[y][x] = color;
    await kv.set('pixelCanvas', JSON.stringify(canvas));
    
    // Update pixel price (1.1x increase)
    const newPrice = await updatePixelPrice(x, y);
    
    // Update ownership
    await updatePixelOwnership(x, y, address);
    
    // In a real implementation, this would handle the payment transaction
    // and split revenue according to the PRD (84% to previous owner, 15% to prize bank, 1% to developer)
    
    return NextResponse.json({
      success: true,
      x,
      y,
      color,
      newPrice
    });
  } catch (error) {
    console.error('Error purchasing pixel:', error);
    return NextResponse.json(
      { error: 'Failed to purchase pixel' }, 
      { status: 500 }
    );
  }
}
