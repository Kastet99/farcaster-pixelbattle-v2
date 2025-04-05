import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/pixel/price/route';
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

describe('Pixel Price API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns initial price for a new pixel', async () => {
    // Mock no existing price (new pixel)
    (kv.get as jest.Mock).mockResolvedValue(null);
    
    const req = new NextRequest('http://localhost:3000/api/pixel/price?x=5&y=10');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      price: 0.0001, // Initial price from PRD
      x: 5,
      y: 10
    });
    expect(kv.get).toHaveBeenCalledWith('price:5:10');
  });

  test('returns existing price for a previously purchased pixel', async () => {
    // Mock existing price
    const existingPrice = '0.00011'; // Price after one purchase (0.0001 * 1.1)
    (kv.get as jest.Mock).mockResolvedValue(existingPrice);
    
    const req = new NextRequest('http://localhost:3000/api/pixel/price?x=5&y=10');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      price: parseFloat(existingPrice),
      x: 5,
      y: 10
    });
  });

  test('validates pixel coordinates', async () => {
    // Test with invalid coordinates
    const req = new NextRequest('http://localhost:3000/api/pixel/price?x=50&y=10');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(400);
    expect(responseData).toEqual({ error: 'Invalid pixel coordinates' });
  });

  test('handles errors gracefully', async () => {
    // Mock an error
    (kv.get as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    const req = new NextRequest('http://localhost:3000/api/pixel/price?x=5&y=10');
    const response = await GET(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(500);
    expect(responseData).toEqual({ error: 'Failed to fetch pixel price' });
  });
});
