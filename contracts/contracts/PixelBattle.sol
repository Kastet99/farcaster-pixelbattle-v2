// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PixelBattle
 * @dev A competitive game where users paint pixels on a shared canvas with an escalating price model
 * @notice Each pixel can be purchased and repainted at escalating costs
 * @notice Previous pixel owners earn profit when their pixels are overwritten
 */
contract PixelBattle is Ownable, ReentrancyGuard {
    // Constants
    uint8 public constant CANVAS_WIDTH = 32;
    uint8 public constant CANVAS_HEIGHT = 32;
    uint256 public constant INITIAL_PRICE = 0.0001 ether;
    uint256 public constant PRICE_INCREASE_FACTOR = 110; // 1.1x increase (110/100)
    uint256 public constant PRICE_INCREASE_DIVISOR = 100;
    
    // Revenue split percentages
    uint8 public constant PREVIOUS_OWNER_PERCENTAGE = 84;
    uint8 public constant PRIZE_BANK_PERCENTAGE = 15;
    uint8 public constant DEVELOPER_PERCENTAGE = 1;
    
    // Game state
    uint256 public gameStartTime;
    uint256 public lastActivityTime;
    uint256 public inactivityPeriod = 24 hours; // Game ends after 24 hours of inactivity
    uint256 public prizeBankBalance;
    bool public gameActive = false;
    
    // Developer wallet
    address public developerWallet;
    
    // Pixel struct
    struct Pixel {
        address owner;
        uint256 price;
        string color;
        uint256 lastUpdateTime;
    }
    
    // Mapping from pixel coordinates to Pixel struct
    mapping(uint8 => mapping(uint8 => Pixel)) public pixels;
    
    // Mapping from address to owned pixels count
    mapping(address => uint256) public pixelCounts;
    
    // Events
    event GameStarted(uint256 timestamp);
    event GameEnded(uint256 timestamp, address[] winners, uint256 prizeAmount);
    event PixelPurchased(
        address indexed buyer, 
        uint8 x, 
        uint8 y, 
        string color, 
        uint256 price,
        uint256 timestamp
    );
    event PrizeDistributed(address indexed recipient, uint256 amount);
    
    /**
     * @dev Constructor sets the developer wallet address
     * @param _developerWallet Address of the developer wallet to receive fees
     */
    constructor(address _developerWallet) {
        require(_developerWallet != address(0), "Developer wallet cannot be zero address");
        developerWallet = _developerWallet;
    }
    
    /**
     * @dev Start a new game cycle
     */
    function startGame() external onlyOwner {
        require(!gameActive, "Game is already active");
        
        gameActive = true;
        gameStartTime = block.timestamp;
        lastActivityTime = block.timestamp;
        
        emit GameStarted(block.timestamp);
    }
    
    /**
     * @dev Purchase a pixel on the canvas
     * @param x X-coordinate of the pixel (0-31)
     * @param y Y-coordinate of the pixel (0-31)
     * @param color Color of the pixel in hex format (e.g., "#FF0000")
     */
    function purchasePixel(uint8 x, uint8 y, string calldata color) external payable nonReentrant {
        require(gameActive, "Game is not active");
        require(x < CANVAS_WIDTH, "X-coordinate out of bounds");
        require(y < CANVAS_HEIGHT, "Y-coordinate out of bounds");
        require(bytes(color).length > 0, "Color cannot be empty");
        
        Pixel storage pixel = pixels[x][y];
        
        // If this is a new game cycle and the pixel hasn't been initialized yet
        if (pixel.lastUpdateTime < gameStartTime) {
            // Reset the pixel for the new game cycle
            pixel.owner = address(0);
            pixel.price = INITIAL_PRICE;
            pixel.color = "#FFFFFF"; // Default white color
            pixel.lastUpdateTime = gameStartTime;
        }
        
        require(msg.value >= pixel.price, "Insufficient payment");
        
        // Store the previous owner for payment distribution
        address previousOwner = pixel.owner;
        
        // If the sender already owns this pixel, they can't buy it again
        require(previousOwner != msg.sender, "You already own this pixel");
        
        // Update pixel counts
        if (previousOwner != address(0)) {
            pixelCounts[previousOwner]--;
        }
        pixelCounts[msg.sender]++;
        
        // Update pixel data
        pixel.owner = msg.sender;
        pixel.color = color;
        pixel.lastUpdateTime = block.timestamp;
        
        // Calculate new price (1.1x increase)
        pixel.price = (pixel.price * PRICE_INCREASE_FACTOR) / PRICE_INCREASE_DIVISOR;
        
        // Distribute payment
        _distributePayment(previousOwner, msg.value);
        
        // Update last activity time
        lastActivityTime = block.timestamp;
        
        emit PixelPurchased(msg.sender, x, y, color, msg.value, block.timestamp);
    }
    
    /**
     * @dev Distribute payment according to the revenue split rules
     * @param previousOwner Address of the previous pixel owner
     * @param amount Amount to distribute
     */
    function _distributePayment(address previousOwner, uint256 amount) internal {
        // Calculate shares
        uint256 previousOwnerShare = 0;
        uint256 prizeBankShare = (amount * PRIZE_BANK_PERCENTAGE) / 100;
        uint256 developerShare = (amount * DEVELOPER_PERCENTAGE) / 100;
        
        // If there was a previous owner, calculate their share
        if (previousOwner != address(0)) {
            previousOwnerShare = (amount * PREVIOUS_OWNER_PERCENTAGE) / 100;
            
            // Send payment to previous owner
            if (previousOwnerShare > 0) {
                (bool success, ) = payable(previousOwner).call{value: previousOwnerShare}("");
                require(success, "Payment to previous owner failed");
            }
        } else {
            // If no previous owner, add their share to prize bank
            prizeBankShare += (amount * PREVIOUS_OWNER_PERCENTAGE) / 100;
        }
        
        // Add to prize bank
        prizeBankBalance += prizeBankShare;
        
        // Send developer fee
        if (developerShare > 0) {
            (bool success, ) = payable(developerWallet).call{value: developerShare}("");
            require(success, "Payment to developer failed");
        }
        
        // Check if there's any remaining ETH due to rounding
        uint256 totalDistributed = previousOwnerShare + prizeBankShare + developerShare;
        if (amount > totalDistributed) {
            // Add the remainder to the prize bank
            prizeBankBalance += (amount - totalDistributed);
        }
    }
    
    /**
     * @dev Check if the game should end due to inactivity
     * @return bool True if the game should end
     */
    function shouldEndGame() public view returns (bool) {
        return gameActive && (block.timestamp - lastActivityTime) >= inactivityPeriod;
    }
    
    /**
     * @dev End the current game cycle and distribute prizes
     */
    function endGame() external {
        require(gameActive, "Game is not active");
        require(shouldEndGame(), "Game cannot be ended yet");
        
        gameActive = false;
        
        // Find winners (players with the most pixels)
        address[] memory winners = _findWinners();
        
        // Distribute prizes
        _distributePrizes(winners);
        
        emit GameEnded(block.timestamp, winners, prizeBankBalance);
        
        // Reset prize bank
        prizeBankBalance = 0;
        
        // Start a new game cycle
        _startNewGameCycle();
    }
    
    /**
     * @dev Check and end the game if the inactivity period has passed
     * @return ended Whether the game was ended
     */
    function checkAndEndGame() external returns (bool ended) {
        if (shouldEndGame()) {
            // End the game
            gameActive = false;
            
            // Find winners (players with the most pixels)
            address[] memory winners = _findWinners();
            
            // Distribute prizes
            _distributePrizes(winners);
            
            emit GameEnded(block.timestamp, winners, prizeBankBalance);
            
            // Reset prize bank
            prizeBankBalance = 0;
            
            // Start a new game cycle
            _startNewGameCycle();
            
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Get time remaining before game ends due to inactivity
     * @return timeRemaining Time in seconds before game ends, 0 if game should end
     */
    function getTimeRemainingBeforeEnd() external view returns (uint256 timeRemaining) {
        if (!gameActive) {
            return 0;
        }
        
        uint256 timeSinceLastActivity = block.timestamp - lastActivityTime;
        
        if (timeSinceLastActivity >= inactivityPeriod) {
            return 0;
        }
        
        return inactivityPeriod - timeSinceLastActivity;
    }
    
    /**
     * @dev Find players with the most pixels
     * @return winners Array of addresses of the winners
     */
    function _findWinners() internal view returns (address[] memory) {
        // First, find the maximum pixel count
        uint256 maxPixelCount = 0;
        uint256 winnerCount = 0;
        
        // Count total players with pixels
        uint256 totalPlayers = 0;
        for (uint8 x = 0; x < CANVAS_WIDTH; x++) {
            for (uint8 y = 0; y < CANVAS_HEIGHT; y++) {
                if (pixels[x][y].owner != address(0)) {
                    totalPlayers++;
                }
            }
        }
        
        // Create a temporary array to store all player addresses
        address[] memory players = new address[](totalPlayers);
        uint256 playerIndex = 0;
        
        // Collect unique player addresses
        for (uint8 x = 0; x < CANVAS_WIDTH; x++) {
            for (uint8 y = 0; y < CANVAS_HEIGHT; y++) {
                address owner = pixels[x][y].owner;
                if (owner != address(0)) {
                    // Check if owner is already in the players array
                    bool found = false;
                    for (uint256 i = 0; i < playerIndex; i++) {
                        if (players[i] == owner) {
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        players[playerIndex] = owner;
                        playerIndex++;
                        
                        // Update max pixel count
                        if (pixelCounts[owner] > maxPixelCount) {
                            maxPixelCount = pixelCounts[owner];
                            winnerCount = 1;
                        } else if (pixelCounts[owner] == maxPixelCount) {
                            winnerCount++;
                        }
                    }
                }
            }
        }
        
        // Create winners array
        address[] memory winners = new address[](winnerCount);
        uint256 winnerIndex = 0;
        
        // Fill winners array
        for (uint256 i = 0; i < playerIndex; i++) {
            if (pixelCounts[players[i]] == maxPixelCount) {
                winners[winnerIndex] = players[i];
                winnerIndex++;
            }
        }
        
        return winners;
    }
    
    /**
     * @dev Distribute prizes to winners proportionally
     * @param winners Array of addresses of the winners
     */
    function _distributePrizes(address[] memory winners) internal {
        if (winners.length == 0 || prizeBankBalance == 0) {
            return;
        }
        
        // Calculate total pixels owned by all players
        uint256 totalPixels = 0;
        for (uint8 x = 0; x < CANVAS_WIDTH; x++) {
            for (uint8 y = 0; y < CANVAS_HEIGHT; y++) {
                if (pixels[x][y].owner != address(0)) {
                    totalPixels++;
                }
            }
        }
        
        if (totalPixels == 0) {
            return;
        }
        
        // Distribute prizes to unique owners
        address[] memory processedOwners = new address[](totalPixels);
        uint256[] memory prizeAmounts = new uint256[](totalPixels);
        uint256 ownerCount = 0;
        uint256 totalDistributed = 0;
        
        // First pass: calculate prize amounts for each unique owner
        for (uint8 x = 0; x < CANVAS_WIDTH; x++) {
            for (uint8 y = 0; y < CANVAS_HEIGHT; y++) {
                address owner = pixels[x][y].owner;
                if (owner != address(0)) {
                    // Calculate prize share for this pixel
                    uint256 prizeShare = (prizeBankBalance * 1) / totalPixels;
                    
                    if (prizeShare > 0) {
                        // Check if owner is already in the array
                        bool found = false;
                        uint256 ownerIndex = 0;
                        
                        for (uint256 i = 0; i < ownerCount; i++) {
                            if (processedOwners[i] == owner) {
                                found = true;
                                ownerIndex = i;
                                break;
                            }
                        }
                        
                        if (found) {
                            // Add to existing prize amount
                            prizeAmounts[ownerIndex] += prizeShare;
                        } else {
                            // Add new owner to the array
                            processedOwners[ownerCount] = owner;
                            prizeAmounts[ownerCount] = prizeShare;
                            ownerCount++;
                        }
                        
                        totalDistributed += prizeShare;
                    }
                }
            }
        }
        
        // Second pass: distribute prizes to unique owners
        for (uint256 i = 0; i < ownerCount; i++) {
            address owner = processedOwners[i];
            uint256 amount = prizeAmounts[i];
            
            if (amount > 0) {
                (bool success, ) = payable(owner).call{value: amount}("");
                require(success, "Prize distribution failed");
                
                emit PrizeDistributed(owner, amount);
            }
        }
        
        // If there's any remaining ETH due to rounding, keep it in the prize bank
        if (prizeBankBalance > totalDistributed) {
            prizeBankBalance = prizeBankBalance - totalDistributed;
        } else {
            prizeBankBalance = 0;
        }
    }
    
    /**
     * @dev Start a new game cycle after the previous one ends
     */
    function _startNewGameCycle() internal {
        // Instead of resetting all pixels, we'll just reset the game state
        // Pixels will be lazily initialized when they are purchased
        
        // Set game state
        gameActive = true;
        gameStartTime = block.timestamp;
        lastActivityTime = block.timestamp;
        
        emit GameStarted(block.timestamp);
    }
    
    /**
     * @dev Get pixel data
     * @param x X-coordinate of the pixel
     * @param y Y-coordinate of the pixel
     * @return owner Address of the pixel owner
     * @return price Current price of the pixel
     * @return color Color of the pixel
     * @return lastUpdateTime Last time the pixel was updated
     */
    function getPixel(uint8 x, uint8 y) external view returns (
        address owner,
        uint256 price,
        string memory color,
        uint256 lastUpdateTime
    ) {
        require(x < CANVAS_WIDTH && y < CANVAS_HEIGHT, "Coordinates out of bounds");
        
        Pixel storage pixel = pixels[x][y];
        
        return (
            pixel.owner,
            pixel.price > 0 ? pixel.price : INITIAL_PRICE,
            pixel.color,
            pixel.lastUpdateTime
        );
    }
    
    /**
     * @dev Get all pixels owned by an address
     * @param owner Address to check
     * @return pixelCoordinates Array of pixel coordinates [x1, y1, x2, y2, ...]
     */
    function getPixelsByOwner(address owner) external view returns (uint8[] memory) {
        uint256 count = pixelCounts[owner];
        uint8[] memory pixelCoordinates = new uint8[](count * 2);
        
        if (count == 0) {
            return pixelCoordinates;
        }
        
        uint256 index = 0;
        
        for (uint8 x = 0; x < CANVAS_WIDTH; x++) {
            for (uint8 y = 0; y < CANVAS_HEIGHT; y++) {
                if (pixels[x][y].owner == owner) {
                    pixelCoordinates[index * 2] = x;
                    pixelCoordinates[index * 2 + 1] = y;
                    index++;
                    
                    if (index >= count) {
                        break;
                    }
                }
            }
            
            if (index >= count) {
                break;
            }
        }
        
        return pixelCoordinates;
    }
    
    /**
     * @dev Update the inactivity period
     * @param _inactivityPeriod New inactivity period in seconds
     */
    function setInactivityPeriod(uint256 _inactivityPeriod) external onlyOwner {
        inactivityPeriod = _inactivityPeriod;
    }
    
    /**
     * @dev Update the developer wallet address
     * @param _developerWallet New developer wallet address
     */
    function setDeveloperWallet(address _developerWallet) external onlyOwner {
        require(_developerWallet != address(0), "Developer wallet cannot be zero address");
        developerWallet = _developerWallet;
    }
    
    /**
     * @dev Get the current game state
     * @return active Whether the game is active
     * @return startTime Game start time
     * @return activity Last activity time
     * @return inactivity Inactivity period
     * @return prizeBank Current prize bank balance
     */
    function getGameState() external view returns (
        bool active,
        uint256 startTime,
        uint256 activity,
        uint256 inactivity,
        uint256 prizeBank
    ) {
        return (
            gameActive,
            gameStartTime,
            lastActivityTime,
            inactivityPeriod,
            prizeBankBalance
        );
    }
    
    /**
     * @dev Get the entire canvas data
     * @return owners Array of pixel owners
     * @return colors Array of pixel colors
     */
    function getCanvasData() external view returns (
        address[] memory owners,
        string[] memory colors
    ) {
        uint256 totalPixels = uint256(CANVAS_WIDTH) * uint256(CANVAS_HEIGHT);
        owners = new address[](totalPixels);
        colors = new string[](totalPixels);
        
        uint256 index = 0;
        for (uint8 y = 0; y < CANVAS_HEIGHT; y++) {
            for (uint8 x = 0; x < CANVAS_WIDTH; x++) {
                Pixel storage pixel = pixels[x][y];
                owners[index] = pixel.owner;
                colors[index] = pixel.color;
                index++;
            }
        }
        
        return (owners, colors);
    }
}
