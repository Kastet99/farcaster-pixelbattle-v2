import { NextRequest, NextResponse } from 'next/server';
import { canvasService } from '@/services/canvas.service';

/**
 * API route to create and store a canvas snapshot on IPFS
 * 
 * POST /api/canvas/snapshot
 * Optional body: { force: boolean } - Force snapshot creation even if recent one exists
 * 
 * Returns:
 * - cid: IPFS Content Identifier for the snapshot
 * - url: IPFS gateway URL to access the snapshot
 * - timestamp: When the snapshot was created
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key authentication
    const apiKey = request.headers.get('x-api-key');
    const envApiKey = process.env.CANVAS_SNAPSHOT_API_KEY;
    
    if (envApiKey && apiKey !== envApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    let body = { force: false };
    try {
      body = await request.json();
    } catch (e) {
      // No body or invalid JSON, use defaults
    }
    
    // Fetch current canvas data from blockchain
    const canvasData = await canvasService.fetchCanvasData();
    
    // Upload canvas data to IPFS
    const cid = await canvasService.uploadCanvasToIPFS(canvasData);
    
    // Get IPFS URL
    const url = canvasService.getCanvasIPFSUrl(cid);
    
    // Return success response
    return NextResponse.json({
      success: true,
      cid,
      url,
      timestamp: canvasData.metadata.timestamp,
      blockNumber: canvasData.metadata.blockNumber
    });
  } catch (error) {
    console.error('Error creating canvas snapshot:', error);
    
    return NextResponse.json(
      { error: 'Failed to create canvas snapshot', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * API route to get information about the latest canvas snapshot
 * 
 * GET /api/canvas/snapshot
 * 
 * Returns information about the latest snapshot if available
 */
export async function GET() {
  try {
    // For now, we'll just fetch the current canvas data
    // In a production system, you'd store and retrieve the latest CID from a database
    const canvasData = await canvasService.fetchCanvasData();
    
    return NextResponse.json({
      success: true,
      timestamp: canvasData.metadata.timestamp,
      blockNumber: canvasData.metadata.blockNumber,
      gameState: canvasData.gameState
    });
  } catch (error) {
    console.error('Error getting canvas snapshot info:', error);
    
    return NextResponse.json(
      { error: 'Failed to get canvas snapshot info', details: (error as Error).message },
      { status: 500 }
    );
  }
}
