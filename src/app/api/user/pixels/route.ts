import { NextRequest, NextResponse } from 'next/server';
import { kv } from '~/lib/kv';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' }, 
        { status: 400 }
      );
    }
    
    // Get the user's owned pixels
    const userPixelsKey = `user:${address}:pixels`;
    const userPixelsData = await kv.get(userPixelsKey);
    const pixels = userPixelsData ? JSON.parse(userPixelsData) : [];
    
    return NextResponse.json({ 
      pixels,
      count: pixels.length
    });
  } catch (error) {
    console.error('Error fetching user pixels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user pixels' }, 
      { status: 500 }
    );
  }
}
