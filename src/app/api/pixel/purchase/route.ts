import { NextRequest, NextResponse } from 'next/server';
import { kv } from '~/lib/kv';
import { ethers } from 'ethers';
import { purchasePixel, getPixelPrice } from '~/services/contract.service';

// Default canvas size from PRD
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

// Get current pixel price from the smart contract
async function getPixelPriceFromContract(x: number, y: number) {
  try {
    const price = await getPixelPrice(x, y);
    return parseFloat(price);
  } catch (error) {
    console.error('Error getting pixel price from contract:', error);
    // Fallback to initial price if contract call fails
    return 0.0001;
  }
}

// Update pixel in local canvas
async function updateLocalCanvas(x: number, y: number, color: string) {
  try {
    // Get current canvas state
    const canvasData = await kv.get('pixelCanvas');
    if (!canvasData) {
      throw new Error('Canvas data not found');
    }
    
    // Update canvas with new pixel color
    const canvas = JSON.parse(canvasData);
    canvas[y][x] = color;
    await kv.set('pixelCanvas', JSON.stringify(canvas));
    return true;
  } catch (error) {
    console.error('Error updating local canvas:', error);
    throw new Error('Failed to update canvas data');
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
    
    try {
      // In a production environment, you would:
      // 1. Create a server-side wallet using a private key from environment variables
      // 2. Sign and send the transaction on behalf of the user
      // 3. Handle gas fees appropriately
      
      // For demo purposes, we'll just update the local canvas
      // In a real implementation, this would be triggered by blockchain events
      await updateLocalCanvas(x, y, color);
      
      // Get the current price from the contract
      const currentPrice = await getPixelPriceFromContract(x, y);
      
      // Log the transaction for debugging
      console.log(`API: Pixel purchase simulated for (${x}, ${y}) with color ${color} at price ${currentPrice} ETH`);
      
      return NextResponse.json({
        success: true,
        message: "Pixel purchase simulated. In production, this would interact with the smart contract.",
        x,
        y,
        color,
        price: currentPrice,
        contractAddress: '0xeA436Ce321B5dcb7F2e3F32d74Ef4b78e427BFbd'
      });
    } catch (contractError: any) {
      console.error('Error interacting with contract:', contractError);
      return NextResponse.json(
        { 
          error: 'Failed to interact with smart contract', 
          details: contractError?.message || 'Unknown contract error'
        }, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error processing pixel purchase:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process pixel purchase',
        details: error?.message || 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
