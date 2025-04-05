import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/user/pixels/route';
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

describe('User Pixels API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns pixels owned by a user', async () => {
    // Mock user pixels data
    const userPixels = [
      { x: 5, y: 10 },
      { x: 6, y: 11 },
      { x: 7, y: 12 }
    ];
    
    (kv.get as jest.Mock).mockResolvedValue(JSON.stringify(userPixels));
    
    const req = new NextRequest('http://localhost:3000/api/user/pixels?address=0x123');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      pixels: userPixels
    });
    
    // Verify KV was called with the correct key
    expect(kv.get).toHaveBeenCalledWith('user:0x123:pixels');
  });

  test('returns empty array when user has no pixels', async () => {
    // Mock no pixels for this user
    (kv.get as jest.Mock).mockResolvedValue(null);
    
    const req = new NextRequest('http://localhost:3000/api/user/pixels?address=0x456');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      pixels: []
    });
  });

  test('validates address parameter', async () => {
    // Missing address parameter
    const req = new NextRequest('http://localhost:3000/api/user/pixels');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(400);
    expect(responseData).toEqual({
      error: 'Address parameter is required'
    });
  });

  test('handles KV store errors gracefully', async () => {
    // Mock KV store error
    (kv.get as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    const req = new NextRequest('http://localhost:3000/api/user/pixels?address=0x123');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(500);
    expect(responseData).toEqual({
      error: 'Failed to fetch user pixels'
    });
  });

  test('handles malformed data in KV store', async () => {
    // Mock invalid JSON in KV store
    (kv.get as jest.Mock).mockResolvedValue('invalid json');
    
    const req = new NextRequest('http://localhost:3000/api/user/pixels?address=0x123');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(500);
    expect(responseData).toEqual({
      error: 'Failed to fetch user pixels'
    });
  });

  test('normalizes wallet addresses', async () => {
    // Mock user pixels data
    const userPixels = [{ x: 5, y: 10 }];
    
    (kv.get as jest.Mock).mockResolvedValue(JSON.stringify(userPixels));
    
    // Use mixed case address in query
    const req = new NextRequest('http://localhost:3000/api/user/pixels?address=0x123AbC');
    await GET(req);
    
    // Verify KV was called with lowercase address
    expect(kv.get).toHaveBeenCalledWith('user:0x123abc:pixels');
  });

  test('handles pagination parameters', async () => {
    // Create a large array of pixels
    const manyPixels = Array(50).fill(0).map((_, i) => ({ 
      x: i % 32, 
      y: Math.floor(i / 32) 
    }));
    
    (kv.get as jest.Mock).mockResolvedValue(JSON.stringify(manyPixels));
    
    // Request with pagination
    const req = new NextRequest('http://localhost:3000/api/user/pixels?address=0x123&limit=10&offset=20');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    
    // Should return pixels 20-29
    expect(responseData.pixels.length).toBe(10);
    expect(responseData.pixels[0]).toEqual(manyPixels[20]);
    expect(responseData.pixels[9]).toEqual(manyPixels[29]);
    
    // Should include pagination metadata
    expect(responseData.pagination).toBeDefined();
    expect(responseData.pagination.total).toBe(50);
    expect(responseData.pagination.limit).toBe(10);
    expect(responseData.pagination.offset).toBe(20);
    expect(responseData.pagination.hasMore).toBe(true);
  });
});
