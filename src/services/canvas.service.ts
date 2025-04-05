import { ethers } from 'ethers';
import { CanvasData, CanvasRenderData, CanvasIPFSMetadata } from '@/types/canvas';
import { ipfsService } from './ipfs.service';

// Contract ABI for the PixelBattle contract (partial, only what we need)
const PIXEL_BATTLE_ABI = [
  "function getCanvasData() external view returns (address[] memory owners, string[] memory colors)",
  "function getGameState() external view returns (bool active, uint256 startTime, uint256 activity, uint256 inactivity, uint256 prizeBank)",
  "function CANVAS_WIDTH() external view returns (uint8)",
  "function CANVAS_HEIGHT() external view returns (uint8)"
];

// Constants
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;

/**
 * Service for managing canvas data and IPFS integration
 */
export class CanvasService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor() {
    // Initialize provider based on environment
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Set contract address from environment
    this.contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xbBdfF3945EB3cBf507d0dd4faAa933aC0A186BC4'; // Default to the deployed contract
    
    // Initialize contract
    this.contract = new ethers.Contract(this.contractAddress, PIXEL_BATTLE_ABI, this.provider);
  }

  /**
   * Fetches the current canvas data from the blockchain
   * @returns Canvas data
   */
  async fetchCanvasData(): Promise<CanvasData> {
    try {
      // Fetch canvas dimensions
      const width = CANVAS_WIDTH;
      const height = CANVAS_HEIGHT;
      
      // Fetch pixel data
      const [owners, colors] = await this.contract.getCanvasData();
      
      // Fetch game state
      const [active, startTime, lastActivityTime, inactivityPeriod, prizeBankBalance] = await this.contract.getGameState();
      
      // Get current block
      const blockNumber = await this.provider.getBlockNumber();
      
      // Create 2D array of pixels
      const pixels = Array(height).fill(null).map(() => Array(width).fill(null));
      
      // Fill pixel data
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          pixels[y][x] = {
            owner: owners[index],
            color: colors[index] || '#FFFFFF', // Default to white if no color
            lastUpdateTime: 0, // We don't have this info from getCanvasData
            price: '0' // We don't have this info from getCanvasData
          };
        }
      }
      
      // Create canvas data object
      const canvasData: CanvasData = {
        width,
        height,
        pixels,
        gameState: {
          active,
          startTime: Number(startTime),
          lastActivityTime: Number(lastActivityTime),
          inactivityPeriod: Number(inactivityPeriod),
          prizeBankBalance: prizeBankBalance.toString()
        },
        metadata: {
          timestamp: Date.now(),
          blockNumber,
          version: '1.0.0',
          contractAddress: this.contractAddress
        }
      };
      
      return canvasData;
    } catch (error) {
      console.error('Error fetching canvas data:', error);
      throw new Error('Failed to fetch canvas data from blockchain');
    }
  }

  /**
   * Converts canvas data to a simplified format for rendering
   * @param canvasData Full canvas data
   * @returns Simplified canvas data for rendering
   */
  convertToRenderData(canvasData: CanvasData): CanvasRenderData {
    const { width, height, pixels } = canvasData;
    
    // Initialize arrays
    const colors = Array(height).fill(null).map(() => Array(width).fill('#FFFFFF'));
    const owners = Array(height).fill(null).map(() => Array(width).fill('0x0000000000000000000000000000000000000000'));
    
    // Fill arrays with data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixel = pixels[y][x];
        colors[y][x] = pixel.color;
        owners[y][x] = pixel.owner;
      }
    }
    
    return { width, height, colors, owners };
  }

  /**
   * Creates and uploads canvas metadata to IPFS
   * @param canvasData Canvas data to upload
   * @returns IPFS CID of the metadata
   */
  async uploadCanvasToIPFS(canvasData: CanvasData): Promise<string> {
    try {
      // First, upload the full canvas data
      const canvasDataCid = await ipfsService.uploadCanvasData(canvasData);
      
      // Create metadata
      const metadata: CanvasIPFSMetadata = {
        name: `PixelBattle Canvas #${canvasData.metadata.blockNumber || 'latest'}`,
        description: 'A snapshot of the PixelBattle canvas',
        image: '', // We'll update this after generating the image
        external_url: `https://pixelbattle.xyz/canvas/${canvasData.metadata.blockNumber || 'latest'}`,
        attributes: [
          { trait_type: 'Width', value: canvasData.width },
          { trait_type: 'Height', value: canvasData.height },
          { trait_type: 'Game Active', value: canvasData.gameState.active ? 'Yes' : 'No' },
          { trait_type: 'Prize Bank', value: ethers.formatEther(canvasData.gameState.prizeBankBalance) + ' ETH' }
        ],
        properties: {
          canvasData: canvasDataCid,
          timestamp: canvasData.metadata.timestamp,
          gameState: {
            active: canvasData.gameState.active,
            lastActivityTime: canvasData.gameState.lastActivityTime,
            inactivityPeriod: canvasData.gameState.inactivityPeriod
          }
        }
      };
      
      // For now, we'll use a placeholder for the image
      // In a real implementation, you'd generate an actual image of the canvas
      metadata.image = canvasDataCid;
      
      // Upload metadata to IPFS
      const metadataCid = await ipfsService.uploadCanvasData(metadata as any);
      
      console.log(`Canvas metadata uploaded to IPFS with CID: ${metadataCid}`);
      return metadataCid;
    } catch (error) {
      console.error('Error uploading canvas to IPFS:', error);
      throw new Error('Failed to upload canvas to IPFS');
    }
  }

  /**
   * Gets the IPFS URL for a canvas
   * @param cid IPFS CID of the canvas metadata
   * @returns IPFS gateway URL
   */
  getCanvasIPFSUrl(cid: string): string {
    return ipfsService.getIPFSUrl(cid);
  }
}

// Export a singleton instance
export const canvasService = new CanvasService();
