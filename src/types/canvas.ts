/**
 * Represents a single pixel on the canvas
 */
export interface Pixel {
  owner: string;      // Ethereum address of the pixel owner
  color: string;      // Hex color code (e.g., "#FF0000")
  lastUpdateTime: number; // Timestamp of last update
  price: string;      // Current price in wei (as string to handle large numbers)
}

/**
 * Represents the entire canvas data
 */
export interface CanvasData {
  width: number;      // Canvas width in pixels
  height: number;     // Canvas height in pixels
  pixels: Pixel[][];  // 2D array of pixels
  gameState: {
    active: boolean;  // Whether the game is active
    startTime: number; // Game start timestamp
    lastActivityTime: number; // Last activity timestamp
    inactivityPeriod: number; // Inactivity period in seconds
    prizeBankBalance: string; // Prize bank balance in wei
  };
  metadata: {
    timestamp: number; // Timestamp when this canvas data was created
    blockNumber?: number; // Block number when this data was captured (optional)
    version: string;  // Version of the data format
    contractAddress: string; // Address of the PixelBattle contract
  };
}

/**
 * Represents a simplified canvas data for rendering
 */
export interface CanvasRenderData {
  width: number;
  height: number;
  colors: string[][]; // 2D array of color strings
  owners: string[][]; // 2D array of owner addresses
}

/**
 * Represents canvas metadata stored on IPFS
 */
export interface CanvasIPFSMetadata {
  name: string;
  description: string;
  image: string;      // IPFS CID of the canvas image
  external_url: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  properties: {
    canvasData: string; // IPFS CID of the full canvas data
    timestamp: number;
    gameState: {
      active: boolean;
      lastActivityTime: number;
      inactivityPeriod: number;
    };
  };
}
