import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/canvas/route';
import { kv } from '../../src/lib/kv';

// Mock the KV store
jest.mock('../../src/lib/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
    del: jest.fn()
  }
}));

describe('Canvas API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns existing canvas data', async () => {
    // Mock canvas data
    const mockCanvas = Array(32).fill(Array(32).fill('#FFFFFF'));
    (kv.get as jest.Mock).mockResolvedValue(JSON.stringify(mockCanvas));
    
    const req = new NextRequest('http://localhost:3000/api/canvas');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      canvas: mockCanvas,
      width: 32,
      height: 32
    });
    expect(kv.get).toHaveBeenCalledWith('pixelCanvas');
  });

  test('initializes canvas if it does not exist', async () => {
    // Mock canvas data doesn't exist
    (kv.get as jest.Mock).mockResolvedValue(null);
    
    const req = new NextRequest('http://localhost:3000/api/canvas');
    const response = await GET(req);
    const responseData = await response.json();
    
    // Check that a blank canvas was created
    const blankCanvas = Array(32).fill(0).map(() => Array(32).fill('#FFFFFF'));
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      canvas: blankCanvas,
      width: 32,
      height: 32
    });
    
    // Verify the canvas was stored
    expect(kv.set).toHaveBeenCalledWith('pixelCanvas', JSON.stringify(blankCanvas));
  });

  test('handles errors gracefully', async () => {
    // Mock an error
    (kv.get as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    const req = new NextRequest('http://localhost:3000/api/canvas');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(500);
    expect(responseData).toEqual({ error: 'Failed to fetch canvas data' });
  });
});
