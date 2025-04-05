// Mock implementation of the contract service
// This file provides mock functionality without using actual smart contracts

// Canvas dimensions from the contract
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

// Initial price in ETH
const INITIAL_PRICE = 0.0001;

// Price increase factor (1.1x)
const PRICE_INCREASE_FACTOR = 1.1; // 10% increase per repaint

// Mock storage for pixel data
type Pixel = {
  owner: string;
  color: string;
  price: number;
  lastPurchaseTime: number;
};

// Initialize the canvas with default values
const initializeCanvas = (): Pixel[][] => {
  const canvas: Pixel[][] = [];
  
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    canvas[y] = [];
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      canvas[y][x] = {
        owner: '0x0000000000000000000000000000000000000000', // Zero address
        color: '#FFFFFF', // White
        price: INITIAL_PRICE,
        lastPurchaseTime: 0
      };
    }
  }
  
  return canvas;
};

// Mock canvas data
const mockCanvas = initializeCanvas();

// Mock game state
let gameActive = true;
let gameEndTime = Date.now() + 86400000; // 24 hours from now

/**
 * Get the current price of a pixel
 */
export async function getPixelPrice(x: number, y: number): Promise<string> {
  try {
    // Validate coordinates
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`);
    }
    
    // Return the current price
    return mockCanvas[y][x].price.toString();
  } catch (error) {
    console.warn('Error getting pixel price, using default price:', error);
    return INITIAL_PRICE.toString();
  }
}

/**
 * Get the current owner of a pixel
 */
export async function getPixelOwner(x: number, y: number): Promise<string> {
  try {
    // Validate coordinates
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`);
    }
    
    return mockCanvas[y][x].owner;
  } catch (error) {
    console.error('Error getting pixel owner:', error);
    return '0x0000000000000000000000000000000000000000'; // Zero address
  }
}

/**
 * Get the current color of a pixel
 */
export async function getPixelColor(x: number, y: number): Promise<string> {
  try {
    // Validate coordinates
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`);
    }
    
    return mockCanvas[y][x].color;
  } catch (error) {
    console.error('Error getting pixel color:', error);
    return '#FFFFFF'; // White
  }
}

/**
 * Check if the game is active
 */
export async function isGameActive(): Promise<boolean> {
  return gameActive;
}

/**
 * Get the game end time
 */
export async function getGameEndTime(): Promise<number> {
  return gameEndTime;
}

/**
 * Purchase a pixel
 */
export async function purchasePixel(
  walletAddress: string, 
  x: number, 
  y: number, 
  color: string
): Promise<any> {
  try {
    // Validate coordinates
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`);
    }
    
    // Validate color (simple hex validation)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      throw new Error(`Invalid color: ${color}`);
    }
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update the pixel
    const currentPrice = mockCanvas[y][x].price;
    const newPrice = parseFloat((currentPrice * PRICE_INCREASE_FACTOR).toFixed(8)); // Fix precision issues
    mockCanvas[y][x] = {
      owner: walletAddress,
      color: color,
      price: newPrice,
      lastPurchaseTime: Date.now()
    };
    
    // Update game end time (24 hours from last purchase)
    gameEndTime = Date.now() + 86400000;
    
    // Return a mock transaction receipt
    return {
      hash: `0x${Math.random().toString(16).substring(2)}`,
      wait: async () => ({
        status: 1, // Success
        events: [{
          event: 'PixelPurchased',
          args: {
            buyer: walletAddress,
            x,
            y,
            color,
            price: currentPrice
          }
        }]
      })
    };
  } catch (error) {
    console.error('Error purchasing pixel:', error);
    throw error;
  }
}

/**
 * Purchase multiple pixels in a single transaction (batch purchase)
 */
export async function purchasePixelsBatch(
  address: string, 
  pixels: Array<{x: number, y: number, color: string}>
): Promise<{
  success: boolean;
  failedPixels?: Array<{x: number, y: number, reason: string}>;
}> {
  if (!address) {
    throw new Error('Wallet address is required');
  }
  
  if (!pixels || pixels.length === 0) {
    throw new Error('No pixels provided for batch purchase');
  }
  
  // Validate all pixel coordinates and colors
  for (const pixel of pixels) {
    if (pixel.x < 0 || pixel.x >= CANVAS_WIDTH || pixel.y < 0 || pixel.y >= CANVAS_HEIGHT) {
      throw new Error(`Invalid pixel coordinates: (${pixel.x}, ${pixel.y})`);
    }
    
    if (!pixel.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error(`Invalid color format for pixel (${pixel.x}, ${pixel.y}): ${pixel.color}`);
    }
  }
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  const failedPixels: Array<{x: number, y: number, reason: string}> = [];
  
  // Process each pixel in the batch
  for (const pixel of pixels) {
    const { x, y, color } = pixel;
    
    try {
      // Get the current pixel data
      const currentPixel = mockCanvas[y][x];
      
      // Store the previous owner for revenue distribution (in a real contract)
      const previousOwner = currentPixel.owner;
      
      // Update the pixel data
      const newPrice = parseFloat((currentPixel.price * PRICE_INCREASE_FACTOR).toFixed(8)); // Fix precision issues
      mockCanvas[y][x] = {
        owner: address,
        color: color,
        price: newPrice,
        lastPurchaseTime: Date.now()
      };
      
      // Update game end time (in a real contract this would reset the inactivity timer)
      gameEndTime = Date.now() + 86400000; // 24 hours from now
    } catch (error) {
      failedPixels.push({
        x, 
        y, 
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    success: failedPixels.length === 0,
    failedPixels: failedPixels.length > 0 ? failedPixels : undefined
  };
}

/**
 * Get all canvas data (owners and colors)
 */
export async function getCanvasData(): Promise<{owners: string[], colors: string[]}> {
  try {
    const totalPixels = CANVAS_WIDTH * CANVAS_HEIGHT;
    const owners: string[] = new Array(totalPixels);
    const colors: string[] = new Array(totalPixels);
    
    let index = 0;
    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        owners[index] = mockCanvas[y][x].owner;
        colors[index] = mockCanvas[y][x].color;
        index++;
      }
    }
    
    return { owners, colors };
  } catch (error) {
    console.error('Error getting canvas data:', error);
    return { owners: [], colors: [] };
  }
}

// Mock functions for compatibility with the original interface
export function getReadOnlyContract() {
  return null;
}

export function getWritableContract(signer: any) {
  return null;
}
