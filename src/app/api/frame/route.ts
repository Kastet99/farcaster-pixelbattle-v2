import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@farcaster/frame-node';
import { kv } from '~/lib/kv';

// Default canvas size from PRD
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

// Initialize canvas state if it doesn't exist
async function initializeCanvasIfNeeded() {
  const canvasExists = await kv.exists('pixelCanvas');
  
  if (!canvasExists) {
    // Create a blank canvas (all white pixels)
    const blankCanvas = Array(CANVAS_HEIGHT).fill(0).map(() => 
      Array(CANVAS_WIDTH).fill('#FFFFFF')
    );
    
    await kv.set('pixelCanvas', JSON.stringify(blankCanvas));
    return blankCanvas;
  }
  
  const canvasData = await kv.get('pixelCanvas');
  return JSON.parse(canvasData || '[]');
}

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
  const newPrice = currentPrice * 1.1; // Increase price by exactly 10% per repaint
  
  await kv.set(priceKey, newPrice.toString());
  return newPrice;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validate frame request
  const body = await req.json();
  const { isValid, message } = await getFrameMessage(body);
  
  if (!isValid || !message) {
    return NextResponse.json({ error: 'Invalid frame request' }, { status: 400 });
  }

  // Get current canvas state
  const canvas = await initializeCanvasIfNeeded();
  
  // Base URL for the app
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  
  // Handle different button actions
  const { buttonIndex, inputText } = message;
  
  // Default frame response
  let frameResponse: FrameRequest = {
    version: 'vNext',
    image: `${baseUrl}/api/frame/image`,
    buttons: [
      { label: 'View Canvas' },
      { label: 'Open App', action: 'link', target: baseUrl }
    ],
    postUrl: `${baseUrl}/api/frame`
  };
  
  // If user clicked a button, handle the action
  if (buttonIndex) {
    switch (buttonIndex) {
      case 1: // View Canvas
        // Just show the canvas (default behavior)
        break;
      case 2: // Open App
        // Handled by the action: 'link' in the button definition
        break;
      default:
        break;
    }
  }
  
  return NextResponse.json(frameResponse);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // For direct access to the frame endpoint
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  
  const frameResponse: FrameRequest = {
    version: 'vNext',
    image: `${baseUrl}/api/frame/image`,
    buttons: [
      { label: 'View Canvas' },
      { label: 'Open App', action: 'link', target: baseUrl }
    ],
    postUrl: `${baseUrl}/api/frame`
  };
  
  return NextResponse.json(frameResponse);
}
