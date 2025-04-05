// Deployment script for PixelBattle contract
const hre = require("hardhat");

async function main() {
  console.log("Deploying PixelBattle contract to Base Sepolia...");

  // Get the developer wallet address from environment or use deployer address
  let developerWallet;
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // If no developer wallet is specified, use the deployer address
  developerWallet = process.env.DEVELOPER_WALLET || deployer.address;
  console.log("Developer wallet address:", developerWallet);
  
  // Deploy the contract
  const PixelBattle = await hre.ethers.getContractFactory("PixelBattle");
  const pixelBattle = await PixelBattle.deploy(developerWallet);

  await pixelBattle.waitForDeployment();
  
  const pixelBattleAddress = await pixelBattle.getAddress();
  console.log("PixelBattle deployed to:", pixelBattleAddress);
  
  console.log("Starting the game...");
  const tx = await pixelBattle.startGame();
  await tx.wait();
  console.log("Game started successfully!");
  
  // Display contract details for verification
  console.log("\nContract Details for Verification:");
  console.log("--------------------------------");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", pixelBattleAddress);
  console.log("Owner:", deployer.address);
  console.log("Developer Wallet:", developerWallet);
  console.log("Transaction Hash:", tx.hash);
  console.log("Block Number:", (await tx.wait()).blockNumber);
  
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${pixelBattleAddress} "${developerWallet}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
