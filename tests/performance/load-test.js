import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const pixelPurchaseErrors = new Counter('pixel_purchase_errors');
const canvasLoadErrors = new Counter('canvas_load_errors');

// Test configuration
export const options = {
  // Simulation scenarios
  scenarios: {
    // Scenario 1: Constant load of users viewing the canvas
    canvas_viewers: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 requests per second
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'viewCanvas',
    },
    
    // Scenario 2: Spike test for pixel purchases
    pixel_purchasers: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '20s', target: 5 },   // Ramp up to 5 purchases/second
        { duration: '30s', target: 20 },  // Spike to 20 purchases/second
        { duration: '20s', target: 5 },   // Ramp down to 5 purchases/second
        { duration: '10s', target: 0 },   // Ramp down to 0
      ],
      exec: 'purchasePixel',
    },
    
    // Scenario 3: Stress test for concurrent users
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },  // Ramp up to 200 concurrent users
        { duration: '30s', target: 200 }, // Stay at 200 for 30s
        { duration: '30s', target: 0 },   // Ramp down to 0
      ],
      exec: 'mixedActions',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
    'pixel_purchase_errors': ['count<10'], // Less than 10 pixel purchase errors
    'canvas_load_errors': ['count<5'],     // Less than 5 canvas load errors
  },
};

// Base URL for the API
const BASE_URL = 'http://localhost:3000/api';

// Simulated wallet addresses for testing
const TEST_WALLETS = [
  '0x1234567890123456789012345678901234567890',
  '0x2345678901234567890123456789012345678901',
  '0x3456789012345678901234567890123456789012',
  '0x4567890123456789012345678901234567890123',
  '0x5678901234567890123456789012345678901234',
];

// Color palette for testing
const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#000000', '#FFFFFF',
  '#FFA500', '#800080', '#008000', '#FFC0CB',
  '#A52A2A', '#808080', '#C0C0C0', '#000080',
];

// Function to view the canvas
export function viewCanvas() {
  const response = http.get(`${BASE_URL}/canvas`);
  
  check(response, {
    'canvas loaded successfully': (r) => r.status === 200,
    'canvas has correct dimensions': (r) => {
      const body = JSON.parse(r.body);
      return body.width === 32 && body.height === 32;
    },
  }) || canvasLoadErrors.add(1);
  
  sleep(1);
}

// Function to get a random pixel price
export function getPixelPrice() {
  const x = Math.floor(Math.random() * 32);
  const y = Math.floor(Math.random() * 32);
  
  const response = http.get(`${BASE_URL}/pixel/price?x=${x}&y=${y}`);
  
  check(response, {
    'price fetched successfully': (r) => r.status === 200,
    'price is a number': (r) => {
      const body = JSON.parse(r.body);
      return typeof body.price === 'number';
    },
  });
  
  return { x, y, price: JSON.parse(response.body).price };
}

// Function to purchase a pixel
export function purchasePixel() {
  // Get a random pixel and its price
  const { x, y } = getPixelPrice();
  
  // Random color and wallet
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const address = TEST_WALLETS[Math.floor(Math.random() * TEST_WALLETS.length)];
  
  const payload = JSON.stringify({
    x,
    y,
    color,
    address,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(`${BASE_URL}/pixel/purchase`, payload, params);
  
  check(response, {
    'pixel purchased successfully': (r) => r.status === 200,
    'response contains success flag': (r) => {
      const body = JSON.parse(r.body);
      return body.success === true;
    },
  }) || pixelPurchaseErrors.add(1);
  
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Function to get user pixels
export function getUserPixels() {
  const address = TEST_WALLETS[Math.floor(Math.random() * TEST_WALLETS.length)];
  
  const response = http.get(`${BASE_URL}/user/pixels?address=${address}`);
  
  check(response, {
    'user pixels fetched successfully': (r) => r.status === 200,
  });
  
  sleep(1);
}

// Mixed actions function for stress testing
export function mixedActions() {
  // Randomly choose an action based on probability
  const rand = Math.random();
  
  if (rand < 0.6) {
    // 60% chance to view canvas (most common action)
    viewCanvas();
  } else if (rand < 0.8) {
    // 20% chance to get user pixels
    getUserPixels();
  } else {
    // 20% chance to purchase a pixel
    purchasePixel();
  }
}

// Setup function that runs once per VU
export function setup() {
  console.log('Starting Pixel Battle load test');
}

// Teardown function that runs at the end
export function teardown(data) {
  console.log('Completed Pixel Battle load test');
}
