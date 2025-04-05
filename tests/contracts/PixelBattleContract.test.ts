import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('PixelBattle Contract', function () {
  // Constants from PRD
  const INITIAL_PRICE = ethers.utils.parseEther('0.0001');
  const PRICE_MULTIPLIER = 110; // 1.1x as percentage
  const PREVIOUS_OWNER_SHARE = 84; // 84%
  const PRIZE_BANK_SHARE = 15; // 15%
  const DEVELOPER_SHARE = 1; // 1%
  const CANVAS_WIDTH = 32;
  const CANVAS_HEIGHT = 32;
  const GAME_TIMEOUT = 24 * 60 * 60; // 24 hours in seconds

  let pixelBattle: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let developer: SignerWithAddress;

  beforeEach(async function () {
    // Deploy the contract
    [owner, user1, user2, developer] = await ethers.getSigners();
    
    const PixelBattle = await ethers.getContractFactory('PixelBattle');
    pixelBattle = await PixelBattle.deploy(
      INITIAL_PRICE,
      PRICE_MULTIPLIER,
      PREVIOUS_OWNER_SHARE,
      PRIZE_BANK_SHARE,
      DEVELOPER_SHARE,
      developer.address,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      GAME_TIMEOUT
    );
    await pixelBattle.deployed();
  });

  describe('Initialization', function () {
    it('should set the correct initial values', async function () {
      expect(await pixelBattle.initialPrice()).to.equal(INITIAL_PRICE);
      expect(await pixelBattle.priceMultiplier()).to.equal(PRICE_MULTIPLIER);
      expect(await pixelBattle.previousOwnerShare()).to.equal(PREVIOUS_OWNER_SHARE);
      expect(await pixelBattle.prizeBankShare()).to.equal(PRIZE_BANK_SHARE);
      expect(await pixelBattle.developerShare()).to.equal(DEVELOPER_SHARE);
      expect(await pixelBattle.developer()).to.equal(developer.address);
      expect(await pixelBattle.canvasWidth()).to.equal(CANVAS_WIDTH);
      expect(await pixelBattle.canvasHeight()).to.equal(CANVAS_HEIGHT);
      expect(await pixelBattle.gameTimeout()).to.equal(GAME_TIMEOUT);
    });
  });

  describe('Pixel Purchase', function () {
    it('should allow purchasing a pixel at initial price', async function () {
      const x = 5;
      const y = 10;
      const color = '#FF0000';
      
      // Initial balance
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      // Purchase pixel
      await pixelBattle.connect(user1).purchasePixel(x, y, color, { 
        value: INITIAL_PRICE 
      });
      
      // Check ownership
      const pixelOwner = await pixelBattle.getPixelOwner(x, y);
      expect(pixelOwner).to.equal(user1.address);
      
      // Check color
      const pixelColor = await pixelBattle.getPixelColor(x, y);
      expect(pixelColor).to.equal(color);
      
      // Check price update (should be 1.1x initial price)
      const newPrice = await pixelBattle.getPixelPrice(x, y);
      const expectedPrice = INITIAL_PRICE.mul(PRICE_MULTIPLIER).div(100);
      expect(newPrice).to.equal(expectedPrice);
      
      // Check balance change
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(initialBalance.sub(finalBalance).gt(INITIAL_PRICE)).to.be.true; // Account for gas
    });
    
    it('should reject purchase with insufficient funds', async function () {
      const x = 5;
      const y = 10;
      const color = '#FF0000';
      
      // Try to purchase with less than required
      await expect(
        pixelBattle.connect(user1).purchasePixel(x, y, color, { 
          value: INITIAL_PRICE.div(2) 
        })
      ).to.be.revertedWith('Insufficient payment');
    });
    
    it('should distribute funds correctly when pixel is repurchased', async function () {
      const x = 5;
      const y = 10;
      const color1 = '#FF0000';
      const color2 = '#00FF00';
      
      // First purchase by user1
      await pixelBattle.connect(user1).purchasePixel(x, y, color1, { 
        value: INITIAL_PRICE 
      });
      
      // Get the new price
      const secondPrice = await pixelBattle.getPixelPrice(x, y);
      
      // Initial balances before second purchase
      const initialUser1Balance = await ethers.provider.getBalance(user1.address);
      const initialDeveloperBalance = await ethers.provider.getBalance(developer.address);
      const initialPrizeBankBalance = await pixelBattle.prizeBankBalance();
      
      // Second purchase by user2
      await pixelBattle.connect(user2).purchasePixel(x, y, color2, { 
        value: secondPrice 
      });
      
      // Check ownership transfer
      const pixelOwner = await pixelBattle.getPixelOwner(x, y);
      expect(pixelOwner).to.equal(user2.address);
      
      // Check color update
      const pixelColor = await pixelBattle.getPixelColor(x, y);
      expect(pixelColor).to.equal(color2);
      
      // Check price update (should be 1.1x second price)
      const thirdPrice = await pixelBattle.getPixelPrice(x, y);
      const expectedThirdPrice = secondPrice.mul(PRICE_MULTIPLIER).div(100);
      expect(thirdPrice).to.equal(expectedThirdPrice);
      
      // Check revenue distribution
      const finalUser1Balance = await ethers.provider.getBalance(user1.address);
      const finalDeveloperBalance = await ethers.provider.getBalance(developer.address);
      const finalPrizeBankBalance = await pixelBattle.prizeBankBalance();
      
      // Previous owner should get 84%
      const expectedUser1Share = secondPrice.mul(PREVIOUS_OWNER_SHARE).div(100);
      expect(finalUser1Balance.sub(initialUser1Balance)).to.equal(expectedUser1Share);
      
      // Developer should get 1%
      const expectedDeveloperShare = secondPrice.mul(DEVELOPER_SHARE).div(100);
      expect(finalDeveloperBalance.sub(initialDeveloperBalance)).to.equal(expectedDeveloperShare);
      
      // Prize bank should get 15%
      const expectedPrizeBankShare = secondPrice.mul(PRIZE_BANK_SHARE).div(100);
      expect(finalPrizeBankBalance.sub(initialPrizeBankBalance)).to.equal(expectedPrizeBankShare);
    });
  });

  describe('Game State Management', function () {
    it('should track last activity time', async function () {
      // Get initial last activity time
      const initialLastActivity = await pixelBattle.lastActivityTime();
      
      // Wait a bit
      await ethers.provider.send('evm_increaseTime', [60]); // 1 minute
      await ethers.provider.send('evm_mine', []);
      
      // Purchase a pixel
      await pixelBattle.connect(user1).purchasePixel(5, 10, '#FF0000', { 
        value: INITIAL_PRICE 
      });
      
      // Check that last activity time was updated
      const newLastActivity = await pixelBattle.lastActivityTime();
      expect(newLastActivity.gt(initialLastActivity)).to.be.true;
    });
    
    it('should end game after timeout period', async function () {
      // Purchase a pixel
      await pixelBattle.connect(user1).purchasePixel(5, 10, '#FF0000', { 
        value: INITIAL_PRICE 
      });
      
      // Fast forward past timeout
      await ethers.provider.send('evm_increaseTime', [GAME_TIMEOUT + 1]);
      await ethers.provider.send('evm_mine', []);
      
      // Check game state
      const isGameActive = await pixelBattle.isGameActive();
      expect(isGameActive).to.be.false;
    });
    
    it('should distribute prizes when game ends', async function () {
      // User1 buys 2 pixels
      await pixelBattle.connect(user1).purchasePixel(5, 10, '#FF0000', { value: INITIAL_PRICE });
      await pixelBattle.connect(user1).purchasePixel(6, 10, '#FF0000', { value: INITIAL_PRICE });
      
      // User2 buys 1 pixel
      await pixelBattle.connect(user2).purchasePixel(7, 10, '#00FF00', { value: INITIAL_PRICE });
      
      // Fast forward past timeout
      await ethers.provider.send('evm_increaseTime', [GAME_TIMEOUT + 1]);
      await ethers.provider.send('evm_mine', []);
      
      // Get initial balances
      const initialUser1Balance = await ethers.provider.getBalance(user1.address);
      const initialUser2Balance = await ethers.provider.getBalance(user2.address);
      
      // End game and distribute prizes
      await pixelBattle.endGameAndDistributePrizes();
      
      // Check balances after distribution
      const finalUser1Balance = await ethers.provider.getBalance(user1.address);
      const finalUser2Balance = await ethers.provider.getBalance(user2.address);
      
      // User1 should get 2/3 of prize bank
      // User2 should get 1/3 of prize bank
      expect(finalUser1Balance.gt(initialUser1Balance)).to.be.true;
      expect(finalUser2Balance.gt(initialUser2Balance)).to.be.true;
      
      // User1 should get approximately twice what User2 gets
      const user1Reward = finalUser1Balance.sub(initialUser1Balance);
      const user2Reward = finalUser2Balance.sub(initialUser2Balance);
      const ratio = user1Reward.mul(100).div(user2Reward);
      
      // Allow for some gas cost variation, but roughly 2:1 ratio
      expect(ratio.gte(190) && ratio.lte(210)).to.be.true;
    });
  });

  describe('Risk Mitigation Tests', function () {
    it('should prevent out-of-bounds pixel access', async function () {
      await expect(
        pixelBattle.connect(user1).purchasePixel(CANVAS_WIDTH, 10, '#FF0000', { 
          value: INITIAL_PRICE 
        })
      ).to.be.revertedWith('Invalid pixel coordinates');
    });
    
    it('should prevent reentrancy attacks', async function () {
      // Deploy a malicious contract that attempts reentrancy
      const AttackerFactory = await ethers.getContractFactory('ReentrancyAttacker');
      const attacker = await AttackerFactory.deploy(pixelBattle.address);
      await attacker.deployed();
      
      // Fund the attacker
      await owner.sendTransaction({
        to: attacker.address,
        value: ethers.utils.parseEther('1')
      });
      
      // Attempt attack
      await expect(
        attacker.attack(5, 10, '#FF0000', { value: INITIAL_PRICE })
      ).to.be.revertedWith('ReentrancyGuard: reentrant call');
    });
    
    it('should handle gas limit issues with many pixel owners', async function () {
      // Simulate having many pixel owners (50+)
      for (let i = 0; i < 50; i++) {
        const x = i % CANVAS_WIDTH;
        const y = Math.floor(i / CANVAS_WIDTH);
        
        // Create a new wallet for each pixel
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        
        // Fund the wallet
        await owner.sendTransaction({
          to: wallet.address,
          value: ethers.utils.parseEther('0.01')
        });
        
        // Purchase pixel
        await pixelBattle.connect(wallet).purchasePixel(x, y, '#FF0000', { 
          value: INITIAL_PRICE,
          gasLimit: 500000 // Ensure sufficient gas
        });
      }
      
      // Fast forward past timeout
      await ethers.provider.send('evm_increaseTime', [GAME_TIMEOUT + 1]);
      await ethers.provider.send('evm_mine', []);
      
      // End game should still work with many owners
      await pixelBattle.endGameAndDistributePrizes({ gasLimit: 5000000 });
      
      // Verify game ended
      const isGameActive = await pixelBattle.isGameActive();
      expect(isGameActive).to.be.false;
    });
    
    it('should prevent price manipulation attacks', async function () {
      // Try to manipulate the price multiplier
      await expect(
        pixelBattle.connect(user1).setPriceMultiplier(200) // 2x instead of 1.1x
      ).to.be.revertedWith('Ownable: caller is not the owner');
      
      // Even owner should not be able to change it after initialization
      await expect(
        pixelBattle.connect(owner).setPriceMultiplier(200)
      ).to.be.revertedWith('Cannot change after initialization');
    });
  });

  describe('Economic Model Simulation', function () {
    it('should simulate price growth over 100 purchases', async function () {
      const x = 5;
      const y = 10;
      let currentPrice = INITIAL_PRICE;
      
      // Simulate 100 purchases of the same pixel
      for (let i = 0; i < 100; i++) {
        // Purchase pixel
        await pixelBattle.connect(user1).purchasePixel(x, y, '#FF0000', { 
          value: currentPrice 
        });
        
        // Get new price
        currentPrice = await pixelBattle.getPixelPrice(x, y);
        
        // Log every 10th price
        if (i % 10 === 0) {
          console.log(`Purchase ${i}: Price = ${ethers.utils.formatEther(currentPrice)} ETH`);
        }
      }
      
      // After 100 purchases, price should be significantly higher but not prohibitive
      const finalPriceEth = parseFloat(ethers.utils.formatEther(currentPrice));
      
      // Price should grow but remain reasonable
      expect(finalPriceEth).to.be.lessThan(1.0); // Should still be less than 1 ETH
    });
    
    it('should simulate whale activity and verify game balance', async function () {
      // Simulate a whale buying many pixels
      const whaleWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      
      // Fund the whale
      await owner.sendTransaction({
        to: whaleWallet.address,
        value: ethers.utils.parseEther('10')
      });
      
      // Whale buys 25% of all pixels
      const totalPixels = CANVAS_WIDTH * CANVAS_HEIGHT;
      const whaleBuyCount = Math.floor(totalPixels * 0.25);
      
      for (let i = 0; i < whaleBuyCount; i++) {
        const x = i % CANVAS_WIDTH;
        const y = Math.floor(i / CANVAS_WIDTH);
        
        await pixelBattle.connect(whaleWallet).purchasePixel(x, y, '#0000FF', { 
          value: await pixelBattle.getPixelPrice(x, y),
          gasLimit: 500000
        });
      }
      
      // Regular users buy some pixels
      for (let i = whaleBuyCount; i < whaleBuyCount + 10; i++) {
        const x = i % CANVAS_WIDTH;
        const y = Math.floor(i / CANVAS_WIDTH);
        
        await pixelBattle.connect(user1).purchasePixel(x, y, '#FF0000', { 
          value: await pixelBattle.getPixelPrice(x, y) 
        });
      }
      
      // Fast forward past timeout
      await ethers.provider.send('evm_increaseTime', [GAME_TIMEOUT + 1]);
      await ethers.provider.send('evm_mine', []);
      
      // End game
      await pixelBattle.endGameAndDistributePrizes();
      
      // Verify whale got proportional rewards
      const whalePixelCount = await pixelBattle.getPlayerPixelCount(whaleWallet.address);
      const totalOwnedPixels = await pixelBattle.totalOwnedPixels();
      
      expect(whalePixelCount.mul(100).div(totalOwnedPixels)).to.be.approximately(25, 1);
    });
  });
});
