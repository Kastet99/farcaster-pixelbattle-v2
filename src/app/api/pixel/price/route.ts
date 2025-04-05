import { NextRequest, NextResponse } from 'next/server';
import { kv } from '~/lib/kv';

// Get current pixel price
async function getPixelPrice(x: number, y: number) {
  const priceKey = `price:${x}:${y}`;
  const price = await kv.get(priceKey);
  
  // Initial price is 0.0000001 ETH
  return price ? parseFloat(price) : 0.0000001;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const x = parseInt(searchParams.get('x') || '0', 10);
    const y = parseInt(searchParams.get('y') || '0', 10);
    
    if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x >= 32 || y >= 32) {
      return NextResponse.json(
        { error: 'Invalid pixel coordinates' }, 
        { status: 400 }
      );
    }
    
    const price = await getPixelPrice(x, y);
    
    return NextResponse.json({ 
      price,
      x,
      y
    });
  } catch (error) {
    console.error('Error fetching pixel price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pixel price' }, 
      { status: 500 }
    );
  }
}
