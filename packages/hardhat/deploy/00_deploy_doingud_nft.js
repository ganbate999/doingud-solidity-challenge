// deploy/00_deploy_your_contract.js

const fs = require("fs");
const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n\n 📡 Deploying...\n");

  // read in all the assets to get their IPFS hash...
  const uploadedAssets = JSON.parse(fs.readFileSync("./uploaded.json"));
  const bytes32Array = [];

  for(const a in uploadedAssets){
    console.log(" 🏷 IPFS:", a);
    const bytes32 = ethers.utils.id(a);
    console.log(" #️⃣ hashed:", bytes32);
    bytes32Array.push(bytes32);
  }
  console.log(" \n");

  await deploy("DoinGudNFT", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [bytes32Array],
    log: true,
  });

  await deploy("DoinGudNFTTrader", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [],
    log: true,
  });
};
module.exports.tags = ["GoinGudNFT"];

/*
Tenderly verification
let verification = await tenderly.verify({
  name: contractName,
  address: contractAddress,
  network: targetNetwork,
});
*/
