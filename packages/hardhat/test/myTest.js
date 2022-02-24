const { ethers } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs");
const {add} = require("ramda");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BASE_URI = "https://ipfs.io/ipfs/";

function getIPFSURI(id) {
  return BASE_URI + id;
}

describe("DoinGud NFT Contracts Test", function () {
  let doinGudNft;
  let nftTrader;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let ipfsIds;
  let bytes32Array;

  beforeEach(async () => {
    this.ctx.signers = await ethers.getSigners();
    [owner, addr1, addr2, addr3] = this.ctx.signers;

    /// Deploy DoinGudNFT Token
    const DoinGudNFTFactory = await ethers.getContractFactory(
      "DoinGudNFT",
      owner
    );

    // read in all the assets to get their IPFS hash...
    const uploadedAssets = JSON.parse(fs.readFileSync("./uploaded.json"));
    ipfsIds = [];
    bytes32Array = [];
    for (const a in uploadedAssets) {
      ipfsIds.push(a);
      const bytes32 = ethers.utils.id(a);
      bytes32Array.push(bytes32);
    }
    // Deploy DoinGudNFT
    doinGudNft = await DoinGudNFTFactory.deploy(bytes32Array);
    await doinGudNft.deployed();

    // Deploy DoinGudNFT Token
    const NftTraderFactory = await ethers.getContractFactory(
      "DoinGudNFTTrader",
      owner
    );

    nftTrader = await NftTraderFactory.deploy();
    await nftTrader.deployed();
  });

  describe("1. NFT Contract", function () {
    it("1.1 Anyone can mint nft", async function () {
      /// Self Royalty: 5%, SIO Royalty: 5%
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);

      await expect(doinGudNft.connect(addr2).mintItem(ipfsIds[1]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr2.address, 2);
    });

    it("1.2 Check Token URI", async function () {
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);
      expect(await doinGudNft.tokenURI(1)).to.be.eq(getIPFSURI(ipfsIds[0]));

      /// Revert Transaction About not minted NFT
      await expect(doinGudNft.tokenURI(2)).to.revertedWith(
        "ERC721URIStorage: URI query for nonexistent token"
      );
    });

    it("1.3 Check Token`s Creator", async function () {
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);
      expect(await doinGudNft.tokenCreator(1)).to.be.eq(addr1.address);
    });
  });

  describe("2. NFT Trader", function () {
    it("2.1 NFT Owner can create trade", async function () {
      /// Mint NFT with Royalty: 5%, SIO Royalty: 5%
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);

      /// Approve
      await doinGudNft
        .connect(addr1)
        .setApprovalForAll(nftTrader.address, true);

      /// Add Trade
      await expect(
        nftTrader.connect(addr1).addTrade(100, doinGudNft.address, 1)
      )
        .to.emit(nftTrader, "AddTrade")
        .withArgs(100, doinGudNft.address, 1);

      await expect(
        nftTrader.addTrade(100, doinGudNft.address, 1)
      ).to.revertedWith("NftTrader: caller is not owner");
    });

    it("2.1 Only NFT Owner can remove trade", async function () {
      /// Mint NFT with Royalty: 5%, SIO Royalty: 5%
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);

      /// Approve
      await doinGudNft
        .connect(addr1)
        .setApprovalForAll(nftTrader.address, true);

      /// Add Trade
      await expect(
        nftTrader.connect(addr1).addTrade(100, doinGudNft.address, 1)
      )
        .to.emit(nftTrader, "AddTrade")
        .withArgs(100, doinGudNft.address, 1);

      await expect(
        nftTrader.removeTrade(doinGudNft.address, 1)
      ).to.revertedWith("NftTrader: caller is not owner");

      await expect(nftTrader.connect(addr1).removeTrade(doinGudNft.address, 1))
        .to.emit(nftTrader, "RemoveTrade")
        .withArgs(doinGudNft.address, 1);
    });

    it("2.2 Anyone can buy nft", async function () {
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);
      await doinGudNft
        .connect(addr1)
        .setApprovalForAll(nftTrader.address, true);
      await expect(
        nftTrader.connect(addr1).addTrade(100, doinGudNft.address, 1)
      )
        .to.emit(nftTrader, "AddTrade")
        .withArgs(100, doinGudNft.address, 1);

      await expect(
        nftTrader.connect(addr2).purchase(doinGudNft.address, 1, { value: 100 })
      )
        .to.emit(nftTrader, "Purchase")
        .withArgs(doinGudNft.address, 1, 100);
    });

    it("2.3 Withdraw", async function () {
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);
      await doinGudNft
        .connect(addr1)
        .setApprovalForAll(nftTrader.address, true);
      await expect(
        nftTrader.connect(addr1).addTrade(100, doinGudNft.address, 1)
      )
        .to.emit(nftTrader, "AddTrade")
        .withArgs(100, doinGudNft.address, 1);

      await expect(
        nftTrader.connect(addr2).purchase(doinGudNft.address, 1, { value: 100 })
      )
        .to.emit(nftTrader, "Purchase")
        .withArgs(doinGudNft.address, 1, 100);

      await expect(nftTrader.connect(addr1).withdraw(addr1.address))
        .to.emit(nftTrader, "Withdraw")
        .withArgs(addr1.address, 94);
    });

    it("2.3 Withdraw Fee by NFT Creator", async function () {
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);
      await doinGudNft
        .connect(addr1)
        .setApprovalForAll(nftTrader.address, true);
      await expect(
        nftTrader.connect(addr1).addTrade(100, doinGudNft.address, 1)
      )
        .to.emit(nftTrader, "AddTrade")
        .withArgs(100, doinGudNft.address, 1);

      await expect(
        nftTrader.connect(addr2).purchase(doinGudNft.address, 1, { value: 100 })
      )
        .to.emit(nftTrader, "Purchase")
        .withArgs(doinGudNft.address, 1, 100);

      await expect(nftTrader.connect(addr1).claimFee(addr1.address))
        .to.emit(nftTrader, "ClaimFee")
        .withArgs(addr1.address, 5);
    });

    it("2.4 Withdraw Treasury Fee by Only Marketplace Owner", async function () {
      await expect(doinGudNft.connect(addr1).mintItem(ipfsIds[0]))
        .to.emit(doinGudNft, "Transfer")
        .withArgs(ZERO_ADDRESS, addr1.address, 1);
      await doinGudNft
        .connect(addr1)
        .setApprovalForAll(nftTrader.address, true);
      await expect(
        nftTrader.connect(addr1).addTrade(100, doinGudNft.address, 1)
      )
        .to.emit(nftTrader, "AddTrade")
        .withArgs(100, doinGudNft.address, 1);

      await expect(
        nftTrader.connect(addr2).purchase(doinGudNft.address, 1, { value: 100 })
      )
        .to.emit(nftTrader, "Purchase")
        .withArgs(doinGudNft.address, 1, 100);

      // Revert by not owner
      await expect(nftTrader.connect(addr1).claimTreasuryFee()).to.revertedWith(
        "Ownable: caller is not the owner"
      );

      const treasuryFeeAddr = await nftTrader.DOINGUD_TREASURY_ADDR();
      // Claim Treasury Fee 1 (1%)
      await expect(nftTrader.connect(owner).claimTreasuryFee())
        .to.emit(nftTrader, "ClaimTreasuryFee")
        .withArgs(treasuryFeeAddr, 1);
    });
  });
});
