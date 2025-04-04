# Pixel Battle: Product Requirements Document

## 1. Product Overview

### 1.1 Product Vision
Pixel Battle is a competitive, money-focused game built on Farcaster Frames where users paint pixels on a shared canvas. The core mechanic revolves around an escalating price model where users can overwrite existing pixels at an increasing cost, with previous owners receiving a portion of the payment.

### 1.2 Core Concept
- Players compete to paint pixels on a shared canvas
- Each pixel can be purchased and repainted at escalating costs
- Previous pixel owners earn profit when their pixels are overwritten
- Games run in cycles with clear start and end conditions
- Strategic focus on being either creators (building cohesive images) or disruptors (overwriting others' work)

## 2. Game Mechanics

### 2.1 Pixel Economics
- **Initial Cost**: 0.0001 ETH for painting a blank pixel
- **Price Escalation**: Each repaint costs 1.1x the previous price
- **Revenue Split**: 84% to previous pixel owner, 23% to final prize bank, 1% developer wallet
- **Currency**: ETH on Base network

### 2.2 Game Flow
1. Game starts on a predetermined date
2. Players purchase and paint pixels on the canvas
3. Game ends after 24 hours of inactivity (calculated in blocks)
4. A new game cycle begins after the end of the previous game

### 2.3 Win Conditions
- Players with the most pixels owned at the end of a game cycle win
- All players with pixels on the final canvas receive proportional rewards from prize bank, money to which was collected during all game

## 3. Technical Architecture

### 3.1 Platform
- **Primary Interface**: Farcaster Mini App
- **Blockchain**: Base (Ethereum L2)
- **Framework**: MUD for on-chain game state management (possible 

### 3.2 Components
1. **Smart Contract**:
   - Manages pixel ownership, pricing, and transactions
   - Handles game state transitions
   - Distributes payments between previous owners and developer

2. **Farcaster Frame**:
   - Displays current canvas state in Farcaster feeds
   - Provides entry point to the full Mini App

3. **Mini App**:
   - Full game interface with pixel selection, color palette
   - Wallet integration for transactions
   - User statistics and game information

4. **Backend Services**:
   - Canvas state management
   - Notification handling
   - Webhook processing for Farcaster events

### 3.3 Data Storage
- **On-chain**: Pixel ownership, price history, game state
- **IPFS/Off-chain**: Canvas visual representation, user preferences

## 4. User Experience

### 4.1 Canvas Interface
- 32×32 pixel grid (1,024 pixels total)
- 16-color palette inspired by retro gaming:
  - 4 primary colors
  - 4 secondary colors
  - 4 earth tones
  - Black, white, light gray, dark gray

### 4.2 Pixel Interaction
- Users select a pixel from the grid
- Choose a color from the palette
- Confirm purchase with wallet transaction
- Pixel updates immediately with optimistic rendering

### 4.3 User Stats and Feedback
- Display of pixels currently owned
- Button for Button for isual indication of owned pixels on canvas
- Transaction history and earnings

## 5. Notification Strategy

### 5.1 Key Notification Events
- Pixel overwritten (earnings notification)
- Game ending soon due to inactivity
- Game finished - Game finished
- New game cycle starting

### 5.2 Implementation
- Farcaster notification system integration
- Clear calls to action in notifications

## 6. Implementation Plan

BUILD IT FAST AND PROPERLY

## 7. Monetization

### 7.1 Revenue Streams
- 23% of all pixel transactions
- Potential for special edition games with custom themes
- Possibility for brand collaborations and sponsored canvases

### 7.2 Game Economy Considerations
- Balance between accessibility and profitability
- Prevention of whale domination
- Incentives for active participation

## 8. Risk Assessment

### 8.1 Technical Risks
- Smart contract vulnerabilities
- Scaling issues with high concurrent users
- Transaction throughput limitations
- Blockchain congestion affecting game experience

### 8.2 Game Design Risks
- Economic model leading to early player disengagement
- Price escalation becoming prohibitive too quickly
- Whale dominance disrupting gameplay balance
- Limited canvas size constraining creativity

### 8.3 Mitigation Strategies
- Thorough smart contract testing and auditing
- Economic model simulation before launch
- Clear game rules and anti-exploitation mechanisms
- Community feedback incorporation during beta testing
