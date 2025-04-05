import { NFTStorage, Blob } from 'nft.storage';
import { CanvasData } from '@/types/canvas';

// NFT.Storage API token - should be stored in environment variables
const NFT_STORAGE_TOKEN = process.env.NFT_STORAGE_TOKEN || '';

/**
 * Service for interacting with IPFS via NFT.Storage
 */
export class IPFSService {
  private client: NFTStorage;

  constructor() {
    if (!NFT_STORAGE_TOKEN) {
      console.warn('NFT_STORAGE_TOKEN not set. IPFS functionality will be limited.');
    }
    this.client = new NFTStorage({ token: NFT_STORAGE_TOKEN });
  }

  /**
   * Uploads canvas data to IPFS
   * @param canvasData The canvas data to upload
   * @returns The IPFS CID (Content Identifier)
   */
  async uploadCanvasData(canvasData: CanvasData): Promise<string> {
    try {
      // Convert canvas data to JSON
      const data = JSON.stringify(canvasData);
      
      // Create a blob with the JSON data
      const blob = new Blob([data], { type: 'application/json' });
      
      // Store the blob on IPFS
      const cid = await this.client.storeBlob(blob);
      
      console.log(`Canvas data uploaded to IPFS with CID: ${cid}`);
      return cid;
    } catch (error) {
      console.error('Error uploading canvas data to IPFS:', error);
      throw new Error('Failed to upload canvas data to IPFS');
    }
  }

  /**
   * Uploads an image to IPFS
   * @param imageData The image data as a Buffer or Blob
   * @param mimeType The MIME type of the image
   * @returns The IPFS CID (Content Identifier)
   */
  async uploadImage(imageData: Buffer | Blob, mimeType: string): Promise<string> {
    try {
      // Create a blob with the image data
      const blob = imageData instanceof Blob 
        ? imageData 
        : new Blob([imageData], { type: mimeType });
      
      // Store the blob on IPFS
      const cid = await this.client.storeBlob(blob);
      
      console.log(`Image uploaded to IPFS with CID: ${cid}`);
      return cid;
    } catch (error) {
      console.error('Error uploading image to IPFS:', error);
      throw new Error('Failed to upload image to IPFS');
    }
  }

  /**
   * Gets the IPFS gateway URL for a CID
   * @param cid The IPFS CID
   * @returns The gateway URL
   */
  getIPFSUrl(cid: string): string {
    return `https://nftstorage.link/ipfs/${cid}`;
  }
}

// Export a singleton instance
export const ipfsService = new IPFSService();
