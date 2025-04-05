const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PixelBattle", function () {
  let pixelBattle;
  let owner;
  let developer;
  let user1;
  let user2;
  const initialPrice = ethers.parseEther("0.0001");
  const CANVAS_WIDTH = 32;

  beforeEach(async function () {
    // Get signers
    [owner, developer, user1, user2] = await ethers.getSigners();
    
    // Deploy the contract
    const PixelBattle = await ethers.getContractFactory("PixelBattle");
    pixelBattle = await PixelBattle.deploy(developer.address);
    
    // Start the game
    await pixelBattle.startGame();
  });

  describe("Game Setup", function () {
    it("Should set the correct developer wallet", async function () {
      expect(await pixelBattle.developerWallet()).to.equal(developer.address);
    });

    it("Should start the game correctly", async function () {
      const gameState = await pixelBattle.getGameState();
      expect(gameState[0]).to.equal(true); // gameActive
      expect(gameState[1]).to.not.equal(0); // gameStartTime
      expect(gameState[2]).to.not.equal(0); // lastActivityTime
    });
  });

  describe("Pixel Purchases", function () {
    it("Should allow purchasing a pixel", async function () {
      const x = 5;
      const y = 10;
      const color = "#FF0000"; // Red
      
      const tx = await pixelBattle.connect(user1).purchasePixel(x, y, color, {
        value: initialPrice
      });
      
      const receipt = await tx.wait();
      const event = receipt.logs[0];
      
      // Verify the event was emitted with correct parameters
      expect(event.fragment.name).to.equal("PixelPurchased");
      expect(event.args[0]).to.equal(user1.address); // buyer
      expect(event.args[1]).to.equal(x); // x
      expect(event.args[2]).to.equal(y); // y
      expect(event.args[3]).to.equal(color); // color
      expect(event.args[4]).to.equal(initialPrice); // price
      // We don't check the timestamp since it's dynamic
      
      // Verify the pixel data
      const pixel = await pixelBattle.getPixel(x, y);
      expect(pixel[0]).to.equal(user1.address); // owner
      expect(pixel[1]).to.equal(initialPrice * 110n / 100n); // new price (1.1x)
      expect(pixel[2]).to.equal(color); // color
    });

    it("Should increase the price after purchase", async function () {
      const x = 15;
      const y = 20;
      const color1 = "#FF0000"; // Red
      const color2 = "#00FF00"; // Green
      
      // First purchase
      await pixelBattle.connect(user1).purchasePixel(x, y, color1, {
        value: initialPrice
      });
      
      // Get the new price
      const pixel = await pixelBattle.getPixel(x, y);
      const newPrice = pixel[1];
      
      // Verify price increased by 1.1x
      expect(newPrice).to.equal(initialPrice * 110n / 100n);
      
      // Second purchase
      const tx = await pixelBattle.connect(user2).purchasePixel(x, y, color2, {
        value: newPrice
      });
      
      const receipt = await tx.wait();
      const event = receipt.logs[0];
      
      // Verify the event was emitted with correct parameters
      expect(event.fragment.name).to.equal("PixelPurchased");
      expect(event.args[0]).to.equal(user2.address); // buyer
      expect(event.args[1]).to.equal(x); // x
      expect(event.args[2]).to.equal(y); // y
      expect(event.args[3]).to.equal(color2); // color
      expect(event.args[4]).to.equal(newPrice); // price
      // We don't check the timestamp since it's dynamic
      
      // Verify the pixel data and price increase
      const updatedPixel = await pixelBattle.getPixel(x, y);
      expect(updatedPixel[0]).to.equal(user2.address); // new owner
      expect(updatedPixel[1]).to.equal(newPrice * 110n / 100n); // new price (1.1x)
      expect(updatedPixel[2]).to.equal(color2); // new color
    });

    it("Should distribute payment correctly", async function () {
      const x = 5;
      const y = 10;
      const color1 = "#FF0000"; // Red
      const color2 = "#00FF00"; // Green
      
      // First purchase - this will add both the prize bank share (15%) and the previous owner share (84%)
      // to the prize bank since there is no previous owner
      await pixelBattle.connect(user1).purchasePixel(x, y, color1, {
        value: initialPrice
      });
      
      // Get the prize bank balance after first purchase
      let gameState = await pixelBattle.getGameState();
      const firstPrizeBankBalance = gameState[4];
      
      // Expected first prize bank balance: 15% + 84% = 99% of initial price
      const expectedFirstPrizeBankShare = (initialPrice * 99n) / 100n;
      expect(firstPrizeBankBalance).to.equal(expectedFirstPrizeBankShare);
      
      // Get the new price for the second purchase
      const pixel = await pixelBattle.getPixel(x, y);
      const newPrice = pixel[1];
      
      // Second purchase - this will add only the prize bank share (15%) to the prize bank
      // since there is now a previous owner who gets 84%
      await pixelBattle.connect(user2).purchasePixel(x, y, color2, {
        value: newPrice
      });
      
      // Check prize bank after second purchase
      gameState = await pixelBattle.getGameState();
      const secondPrizeBankBalance = gameState[4];
      
      // Expected second prize bank balance: first balance + 15% of new price
      const expectedSecondPrizeBankShare = firstPrizeBankBalance + (newPrice * 15n) / 100n;
      expect(secondPrizeBankBalance).to.equal(expectedSecondPrizeBankShare);
    });
  });

  describe("Game Mechanics", function () {
    it("Should track pixel ownership correctly", async function () {
      // User1 buys 3 pixels
      await pixelBattle.connect(user1).purchasePixel(1, 1, "#FF0000", { value: initialPrice });
      await pixelBattle.connect(user1).purchasePixel(2, 2, "#00FF00", { value: initialPrice });
      await pixelBattle.connect(user1).purchasePixel(3, 3, "#0000FF", { value: initialPrice });
      
      // User2 buys 2 pixels
      await pixelBattle.connect(user2).purchasePixel(4, 4, "#FFFF00", { value: initialPrice });
      await pixelBattle.connect(user2).purchasePixel(5, 5, "#FF00FF", { value: initialPrice });
      
      // Check pixel counts
      expect(await pixelBattle.pixelCounts(user1.address)).to.equal(3);
      expect(await pixelBattle.pixelCounts(user2.address)).to.equal(2);
      
      // User2 overwrites one of user1's pixels
      const newPrice = (initialPrice * 110n) / 100n;
      await pixelBattle.connect(user2).purchasePixel(1, 1, "#FFFFFF", { value: newPrice });
      
      // Check updated pixel counts
      expect(await pixelBattle.pixelCounts(user1.address)).to.equal(2);
      expect(await pixelBattle.pixelCounts(user2.address)).to.equal(3);
    });

    it("Should allow getting canvas data", async function () {
      // Purchase some pixels
      await pixelBattle.connect(user1).purchasePixel(0, 0, "#FF0000", { value: initialPrice });
      await pixelBattle.connect(user2).purchasePixel(1, 1, "#00FF00", { value: initialPrice });
      
      // Get canvas data
      const canvasData = await pixelBattle.getCanvasData();
      const owners = canvasData[0];
      const colors = canvasData[1];
      
      // Check first pixel (0,0)
      expect(owners[0]).to.equal(user1.address);
      expect(colors[0]).to.equal("#FF0000");
      
      // Check second pixel (1,1) - index is (1 * CANVAS_WIDTH) + 1
      const secondPixelIndex = CANVAS_WIDTH + 1;
      expect(owners[secondPixelIndex]).to.equal(user2.address);
      expect(colors[secondPixelIndex]).to.equal("#00FF00");
    });

    it("Should handle game inactivity period correctly", async function () {
      // Purchase a pixel to start activity
      await pixelBattle.connect(user1).purchasePixel(3, 3, "#FF00FF", {
        value: initialPrice
      });
      
      // Check that the game is active
      const gameState = await pixelBattle.getGameState();
      expect(gameState[0]).to.be.true; // gameActive
      
      // Check time remaining - should be 24 hours
      let timeRemaining = await pixelBattle.getTimeRemainingBeforeEnd();
      expect(timeRemaining).to.be.gt(0);
      
      // Fast forward time by 24 hours + 1 second
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Check if the game should end
      const shouldEnd = await pixelBattle.shouldEndGame();
      expect(shouldEnd).to.be.true;
      
      // End the game
      await pixelBattle.connect(user1).checkAndEndGame();
      
      // Verify game ended and new game started
      const newGameState = await pixelBattle.getGameState();
      expect(newGameState[0]).to.be.true; // gameActive
      
      // The game start time should be updated
      expect(newGameState[1]).to.be.gt(gameState[1]);
    });
  });
});
