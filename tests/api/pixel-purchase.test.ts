import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/pixel/purchase/route';
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

describe('Pixel Purchase API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully purchases a pixel', async () => {
    // Mock canvas data
    const mockCanvas = Array(32).fill(0).map(() => Array(32).fill('#FFFFFF'));
    (kv.get as jest.Mock).mockImplementation((key) => {
      if (key === 'pixelCanvas') return JSON.stringify(mockCanvas);
      if (key === 'price:5:10') return '0.0001';
      if (key === 'user:0x123:pixels') return JSON.stringify([]);
      return null;
    });
    
    const reqBody = {
      x: 5,
      y: 10,
      color: '#FF0000',
      address: '0x123'
    };
    
    const req = new NextRequest('http://localhost:3000/api/pixel/purchase', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });
    
    const response = await POST(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(200);
    expect(responseData).toEqual({
      success: true,
      x: 5,
      y: 10,
      color: '#FF0000',
      newPrice: 0.00011 // 0.0001 * 1.1
    });
    
    // Verify canvas was updated
    expect(kv.set).toHaveBeenCalledWith('pixelCanvas', expect.any(String));
    
    // Verify price was updated (1.1x increase)
    expect(kv.set).toHaveBeenCalledWith('price:5:10', '0.00011');
    
    // Verify ownership was updated
    expect(kv.set).toHaveBeenCalledWith('owner:5:10', '0x123');
    
    // Verify user's pixel list was updated
    expect(kv.set).toHaveBeenCalledWith('user:0x123:pixels', JSON.stringify([{x: 5, y: 10}]));
  });

  test('updates existing user pixels list', async () => {
    // Mock existing user pixels
    const existingPixels = [{x: 1, y: 1}, {x: 2, y: 2}];
    const mockCanvas = Array(32).fill(0).map(() => Array(32).fill('#FFFFFF'));
    
    (kv.get as jest.Mock).mockImplementation((key) => {
      if (key === 'pixelCanvas') return JSON.stringify(mockCanvas);
      if (key === 'price:5:10') return '0.0001';
      if (key === 'user:0x123:pixels') return JSON.stringify(existingPixels);
      return null;
    });
    
    const reqBody = {
      x: 5,
      y: 10,
      color: '#FF0000',
      address: '0x123'
    };
    
    const req = new NextRequest('http://localhost:3000/api/pixel/purchase', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });
    
    await POST(req);
    
    // Verify user's pixel list was updated with the new pixel
    expect(kv.set).toHaveBeenCalledWith(
      'user:0x123:pixels', 
      JSON.stringify([...existingPixels, {x: 5, y: 10}])
    );
  });

  test('validates input parameters', async () => {
    const reqBody = {
      x: 50, // Invalid x coordinate (out of bounds)
      y: 10,
      color: '#FF0000',
      address: '0x123'
    };
    
    const req = new NextRequest('http://localhost:3000/api/pixel/purchase', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });
    
    const response = await POST(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(400);
    expect(responseData).toEqual({ error: 'Invalid input parameters' });
  });

  test('handles missing canvas data', async () => {
    // Mock missing canvas data
    (kv.get as jest.Mock).mockImplementation((key) => {
      if (key === 'pixelCanvas') return null;
      return null;
    });
    
    const reqBody = {
      x: 5,
      y: 10,
      color: '#FF0000',
      address: '0x123'
    };
    
    const req = new NextRequest('http://localhost:3000/api/pixel/purchase', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });
    
    const response = await POST(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(500);
    expect(responseData).toEqual({ error: 'Canvas data not found' });
  });

  test('handles errors gracefully', async () => {
    // Mock an error
    (kv.get as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    const reqBody = {
      x: 5,
      y: 10,
      color: '#FF0000',
      address: '0x123'
    };
    
    const req = new NextRequest('http://localhost:3000/api/pixel/purchase', {
      method: 'POST',
      body: JSON.stringify(reqBody)
    });
    
    const response = await POST(req);
    const responseData = await response.json();
    
    expect(response.status).toBe(500);
    expect(responseData).toEqual({ error: 'Failed to purchase pixel' });
  });
});
