import { NextRequest, NextResponse } from 'next/server';
import { getGameStatus, getGameEndTime } from '~/services/contract.service';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Get game status from smart contract
    const isActive = await getGameStatus();
    
    // Get game end time if available
    let endTime = null;
    try {
      endTime = await getGameEndTime();
    } catch (error) {
      console.error('Error getting game end time:', error);
    }
    
    return NextResponse.json({
      isActive,
      endTime: endTime ? new Date(endTime * 1000).toISOString() : null,
      contractAddress: '0xeA436Ce321B5dcb7F2e3F32d74Ef4b78e427BFbd'
    });
  } catch (error) {
    console.error('Error fetching game status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game status from smart contract' }, 
      { status: 500 }
    );
  }
}
