/**
 * Pixel Battle Economic Model Simulation
 * 
 * This simulation tests the economic model of the Pixel Battle game to ensure:
 * 1. Price escalation is not prohibitive
 * 2. Game remains accessible to new players
 * 3. Whale dominance is limited
 * 4. Prize distribution is fair
 */

// Constants from PRD
const INITIAL_PRICE = 0.0001; // ETH
const PRICE_MULTIPLIER = 1.1;
const PREVIOUS_OWNER_SHARE = 0.84;
const PRIZE_BANK_SHARE = 0.15;
const DEVELOPER_SHARE = 0.01;
const CANVAS_WIDTH = 32;
const CANVAS_HEIGHT = 32;
const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT; // 1024 pixels

// Simulation parameters
const SIMULATION_DAYS = 30;
const TRANSACTIONS_PER_DAY = 200;
const TOTAL_TRANSACTIONS = SIMULATION_DAYS * TRANSACTIONS_PER_DAY;

// Player types
const PLAYER_TYPES = {
  CASUAL: { budget: 0.01, activityLevel: 0.2, maxPixels: 5 },
  REGULAR: { budget: 0.05, activityLevel: 0.5, maxPixels: 20 },
  ENTHUSIAST: { budget: 0.2, activityLevel: 0.8, maxPixels: 50 },
  WHALE: { budget: 1.0, activityLevel: 1.0, maxPixels: 200 }
};

// Create player distribution
const players = [];
for (let i = 0; i < 500; i++) {
  let type;
  const rand = Math.random();
  if (rand < 0.7) {
    type = 'CASUAL'; // 70% casual players
  } else if (rand < 0.9) {
    type = 'REGULAR'; // 20% regular players
  } else if (rand < 0.98) {
    type = 'ENTHUSIAST'; // 8% enthusiasts
  } else {
    type = 'WHALE'; // 2% whales
  }
  
  players.push({
    id: `player_${i}`,
    type,
    ...PLAYER_TYPES[type],
    pixels: [],
    spent: 0,
    earned: 0
  });
}

// Initialize canvas
const canvas = Array(CANVAS_HEIGHT).fill().map(() => 
  Array(CANVAS_WIDTH).fill().map(() => ({
    owner: null,
    price: INITIAL_PRICE,
    color: '#FFFFFF',
    purchaseCount: 0
  }))
);

// Prize bank
let prizeBank = 0;
let developerEarnings = 0;
let lastActivityTime = Date.now();
let gameEnded = false;

// Simulation metrics
const metrics = {
  averagePriceOverTime: [],
  pixelOwnershipDistribution: {},
  playerROI: {},
  prizeDistribution: {},
  accessibilityIndex: [],
  whaleIndex: []
};

// Helper functions
function getRandomPixel() {
  const x = Math.floor(Math.random() * CANVAS_WIDTH);
  const y = Math.floor(Math.random() * CANVAS_HEIGHT);
  return { x, y };
}

function getRandomPlayer() {
  // Weight by activity level
  const totalActivity = players.reduce((sum, p) => sum + p.activityLevel, 0);
  let rand = Math.random() * totalActivity;
  
  for (const player of players) {
    rand -= player.activityLevel;
    if (rand <= 0) return player;
  }
  
  return players[0]; // Fallback
}

function calculateAccessibilityIndex() {
  // Calculate what percentage of pixels are affordable by casual players
  const casualBudget = PLAYER_TYPES.CASUAL.budget;
  let affordablePixels = 0;
  
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      if (canvas[y][x].price <= casualBudget) {
        affordablePixels++;
      }
    }
  }
  
  return affordablePixels / TOTAL_PIXELS;
}

function calculateWhaleIndex() {
  // Calculate percentage of pixels owned by whales
  const whales = players.filter(p => p.type === 'WHALE');
  const whalePixelCount = whales.reduce((sum, p) => sum + p.pixels.length, 0);
  
  // Calculate total owned pixels
  const totalOwnedPixels = players.reduce((sum, p) => sum + p.pixels.length, 0);
  
  return totalOwnedPixels > 0 ? whalePixelCount / totalOwnedPixels : 0;
}

// Run simulation
console.log('Starting Pixel Battle Economic Simulation...');
console.log(`Simulating ${SIMULATION_DAYS} days with ${TRANSACTIONS_PER_DAY} transactions per day`);
console.log('---------------------------------------------------');

for (let day = 1; day <= SIMULATION_DAYS; day++) {
  console.log(`\nDay ${day}:`);
  
  // Check if game should end (24 hours of inactivity)
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  if (timeSinceLastActivity >= 24 * 60 * 60 * 1000) {
    gameEnded = true;
    console.log('Game ended due to 24 hours of inactivity');
    break;
  }
  
  // Daily transactions
  for (let t = 0; t < TRANSACTIONS_PER_DAY; t++) {
    // Select a random player based on activity level
    const player = getRandomPlayer();
    
    // Check if player can afford more pixels
    if (player.pixels.length >= player.maxPixels) {
      continue; // Skip if player has reached their max pixels
    }
    
    // Select a random pixel
    const { x, y } = getRandomPixel();
    const pixel = canvas[y][x];
    
    // Check if player can afford the pixel
    if (pixel.price > player.budget) {
      continue; // Skip if too expensive
    }
    
    // Process the purchase
    const previousOwner = pixel.owner;
    const price = pixel.price;
    
    // Update last activity time
    lastActivityTime = Date.now();
    
    // Update pixel ownership
    if (previousOwner) {
      // Remove pixel from previous owner's list
      const prevOwnerObj = players.find(p => p.id === previousOwner);
      if (prevOwnerObj) {
        prevOwnerObj.pixels = prevOwnerObj.pixels.filter(p => !(p.x === x && p.y === y));
        
        // Previous owner gets 84%
        const previousOwnerShare = price * PREVIOUS_OWNER_SHARE;
        prevOwnerObj.earned += previousOwnerShare;
      }
    }
    
    // Add pixel to new owner's list
    player.pixels.push({ x, y });
    player.spent += price;
    
    // Update prize bank (15%)
    prizeBank += price * PRIZE_BANK_SHARE;
    
    // Update developer earnings (1%)
    developerEarnings += price * DEVELOPER_SHARE;
    
    // Update pixel data
    pixel.owner = player.id;
    pixel.price *= PRICE_MULTIPLIER; // 1.1x price increase
    pixel.purchaseCount++;
  }
  
  // Calculate daily metrics
  let totalPrice = 0;
  let pixelCount = 0;
  
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      if (canvas[y][x].purchaseCount > 0) {
        totalPrice += canvas[y][x].price;
        pixelCount++;
      }
    }
  }
  
  const averagePrice = pixelCount > 0 ? totalPrice / pixelCount : INITIAL_PRICE;
  metrics.averagePriceOverTime.push({ day, averagePrice });
  
  // Calculate accessibility index
  metrics.accessibilityIndex.push({ day, value: calculateAccessibilityIndex() });
  
  // Calculate whale index
  metrics.whaleIndex.push({ day, value: calculateWhaleIndex() });
  
  // Log daily summary
  console.log(`  Average Pixel Price: ${averagePrice.toFixed(6)} ETH`);
  console.log(`  Accessibility Index: ${(metrics.accessibilityIndex[metrics.accessibilityIndex.length - 1].value * 100).toFixed(2)}%`);
  console.log(`  Whale Dominance: ${(metrics.whaleIndex[metrics.whaleIndex.length - 1].value * 100).toFixed(2)}%`);
  console.log(`  Prize Bank: ${prizeBank.toFixed(6)} ETH`);
}

// End of game - distribute prizes
if (gameEnded || day > SIMULATION_DAYS) {
  console.log('\n---------------------------------------------------');
  console.log('Game Ended - Distributing Prizes');
  
  // Count total owned pixels
  const totalOwnedPixels = players.reduce((sum, p) => sum + p.pixels.length, 0);
  
  if (totalOwnedPixels > 0) {
    // Distribute prize bank proportionally
    for (const player of players) {
      if (player.pixels.length > 0) {
        const share = player.pixels.length / totalOwnedPixels;
        const prize = prizeBank * share;
        player.earned += prize;
        
        metrics.prizeDistribution[player.id] = {
          type: player.type,
          pixelCount: player.pixels.length,
          share,
          prize
        };
      }
    }
  }
  
  // Calculate final ROI for each player
  for (const player of players) {
    if (player.spent > 0) {
      const roi = (player.earned - player.spent) / player.spent;
      metrics.playerROI[player.id] = {
        type: player.type,
        spent: player.spent,
        earned: player.earned,
        roi
      };
    }
  }
  
  // Calculate average ROI by player type
  const roiByType = {
    CASUAL: { total: 0, count: 0 },
    REGULAR: { total: 0, count: 0 },
    ENTHUSIAST: { total: 0, count: 0 },
    WHALE: { total: 0, count: 0 }
  };
  
  for (const playerId in metrics.playerROI) {
    const data = metrics.playerROI[playerId];
    if (data.spent > 0) {
      roiByType[data.type].total += data.roi;
      roiByType[data.type].count++;
    }
  }
  
  console.log('\nAverage ROI by Player Type:');
  for (const type in roiByType) {
    const avg = roiByType[type].count > 0 ? 
      roiByType[type].total / roiByType[type].count : 0;
    console.log(`  ${type}: ${(avg * 100).toFixed(2)}%`);
  }
  
  // Calculate pixel ownership distribution
  const ownershipByType = {
    CASUAL: 0,
    REGULAR: 0,
    ENTHUSIAST: 0,
    WHALE: 0
  };
  
  for (const player of players) {
    ownershipByType[player.type] += player.pixels.length;
  }
  
  console.log('\nFinal Pixel Ownership Distribution:');
  for (const type in ownershipByType) {
    const percentage = totalOwnedPixels > 0 ? 
      (ownershipByType[type] / totalOwnedPixels) * 100 : 0;
    console.log(`  ${type}: ${percentage.toFixed(2)}%`);
  }
}

console.log('\n---------------------------------------------------');
console.log('Economic Model Simulation Results:');

// Price escalation analysis
const initialAvgPrice = metrics.averagePriceOverTime[0]?.averagePrice || INITIAL_PRICE;
const finalAvgPrice = metrics.averagePriceOverTime[metrics.averagePriceOverTime.length - 1]?.averagePrice || INITIAL_PRICE;
const priceIncreaseFactor = finalAvgPrice / initialAvgPrice;

console.log(`\nPrice Escalation:`);
console.log(`  Initial Average Price: ${initialAvgPrice.toFixed(6)} ETH`);
console.log(`  Final Average Price: ${finalAvgPrice.toFixed(6)} ETH`);
console.log(`  Price Increase Factor: ${priceIncreaseFactor.toFixed(2)}x`);

// Accessibility analysis
const initialAccessibility = metrics.accessibilityIndex[0]?.value || 1;
const finalAccessibility = metrics.accessibilityIndex[metrics.accessibilityIndex.length - 1]?.value || 0;

console.log(`\nAccessibility Analysis:`);
console.log(`  Initial Accessibility: ${(initialAccessibility * 100).toFixed(2)}%`);
console.log(`  Final Accessibility: ${(finalAccessibility * 100).toFixed(2)}%`);

// Whale dominance analysis
const maxWhaleIndex = Math.max(...metrics.whaleIndex.map(m => m.value));
const finalWhaleIndex = metrics.whaleIndex[metrics.whaleIndex.length - 1]?.value || 0;

console.log(`\nWhale Dominance Analysis:`);
console.log(`  Maximum Whale Dominance: ${(maxWhaleIndex * 100).toFixed(2)}%`);
console.log(`  Final Whale Dominance: ${(finalWhaleIndex * 100).toFixed(2)}%`);

// Risk assessment
console.log('\nRisk Assessment:');

// Price escalation risk
if (priceIncreaseFactor > 100) {
  console.log('  ❌ HIGH RISK: Price escalation is extremely prohibitive');
} else if (priceIncreaseFactor > 50) {
  console.log('  ⚠️ MEDIUM RISK: Price escalation is significant');
} else {
  console.log('  ✅ LOW RISK: Price escalation is reasonable');
}

// Accessibility risk
if (finalAccessibility < 0.1) {
  console.log('  ❌ HIGH RISK: Game becomes inaccessible to casual players');
} else if (finalAccessibility < 0.3) {
  console.log('  ⚠️ MEDIUM RISK: Limited accessibility for casual players');
} else {
  console.log('  ✅ LOW RISK: Game remains accessible to casual players');
}

// Whale dominance risk
if (finalWhaleIndex > 0.7) {
  console.log('  ❌ HIGH RISK: Extreme whale dominance');
} else if (finalWhaleIndex > 0.5) {
  console.log('  ⚠️ MEDIUM RISK: Significant whale dominance');
} else {
  console.log('  ✅ LOW RISK: Balanced player distribution');
}

console.log('\nSimulation Complete!');
