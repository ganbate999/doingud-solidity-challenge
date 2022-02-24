//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./DoinGudNFT.sol";

import "hardhat/console.sol";

/// NFT Trader Contract for buying/selling NFT
/// @author hosokawa-zen
contract DoinGudNFTTrader is Ownable, ReentrancyGuard {

    /// NFT Trade Structure
    struct Trade {
        uint256 price;
        address seller;
    }

    /// Trade map : Mapping of tokenId => Trade
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public feeBalances;
    uint256 public treasuryFeeAmt;

    /// Percent Division
    uint16 internal constant PERCENT_DIVISOR = 10 ** 4;
    /// NFT Creator Fee (5%)
    uint16 internal constant CREATOR_FEE = 500;
    /// Treasury Fee (1%)
    uint16 internal constant TREASURY_FEE = 100;

    address public DOINGUD_TREASURY_ADDR = 0x6155711b7a66B1473C9eFeF10150340E69ea48de;

    /// Events
    event AddTrade(uint256 price, address indexed contractAddr, uint256 tokenId);
    event RemoveTrade(address indexed contractAddr, uint256 tokenId);
    event Purchase(address indexed contractAddr, uint256 tokenId, uint256 price);
    event Withdraw(address indexed destAddr, uint256 amount);
    event ClaimFee(address indexed destAddr, uint256 amount);
    event ClaimTreasuryFee(address indexed destAddr, uint256 amount);
    event SetTreasuryAddress(address newAddr);

    /// Add Trade
    /// @param price NFT Token Price
    /// @param contractAddr NFT Contract Address
    /// @param tokenId NFT Token ID
    function addTrade(uint256 price, address contractAddr, uint256 tokenId) external {
        IERC721 token = IERC721(contractAddr);

        require(token.ownerOf(tokenId) == msg.sender, "NftTrader: caller is not owner");
        require(token.isApprovedForAll(msg.sender, address(this)), "NftTrader: contract must be approved");
        require(trades[tokenId].seller == address(0), "NFTTrader: already added");

        trades[tokenId] = Trade({
            price: price,
            seller: msg.sender
        });

        emit AddTrade(price, contractAddr, tokenId);
    }

    /// Remove Trade
    /// @param contractAddr NFT Contract Address
    /// @param tokenId NFT Token ID
    function removeTrade(address contractAddr, uint256 tokenId) external {
        IERC721 token = IERC721(contractAddr);

        require(token.ownerOf(tokenId) == msg.sender, "NftTrader: caller is not owner");
        require(trades[tokenId].seller == msg.sender, "NFTTrader: caller is not seller");

        delete trades[tokenId];

        emit RemoveTrade(contractAddr, tokenId);
    }

    /// Purchase NftRoyalty Token
    /// @param contractAddr NFT Contract Address
    /// @param tokenId NFT Token ID
    function purchase(address contractAddr, uint256 tokenId) external payable nonReentrant {
        Trade memory item = trades[tokenId];
        require(msg.value >= item.price, "NftTrader: Insufficient funds");

        // Get NftRoyalty Token Data
        DoinGudNFT token = DoinGudNFT(contractAddr);

        // Pay to contract
        payable(address(this)).transfer(msg.value);

        // NFT Transfer
        token.transferFrom(item.seller, msg.sender, tokenId);

        // Calculate Creator Fee
        uint256 creatorFee = (CREATOR_FEE * msg.value)/PERCENT_DIVISOR;
        // Calculate Treasury Fee
        uint256 treasuryFee = (TREASURY_FEE * msg.value)/PERCENT_DIVISOR;
        // Get NFT Creator
        address creator = token.tokenCreator(tokenId);

        // Update Balances
        feeBalances[creator] += creatorFee;
        treasuryFeeAmt += treasuryFee;
        balances[item.seller] += msg.value - creatorFee - treasuryFee;

        // Remove Trade
        delete trades[tokenId];

        emit Purchase(contractAddr, tokenId, item.price);
    }

    /// Withdraw about Token Sell Trade
    function withdraw(address payable destAddr) external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No Funds");

        destAddr.transfer(amount);

        balances[msg.sender] = 0;

        emit Withdraw(destAddr, amount);
    }

    /// Withdraw NFT Creator Fee
    function claimFee(address payable destAddr) external {
        uint256 amount = feeBalances[msg.sender];
        require(amount > 0, "No Funds");

        destAddr.transfer(amount);

        feeBalances[msg.sender] = 0;

        emit ClaimFee(destAddr, amount);
    }

    /// Withdraw Treasury Fee
    function claimTreasuryFee() external onlyOwner{
        uint256 amount = treasuryFeeAmt;
        require(amount > 0, "No Funds");

        payable(address(DOINGUD_TREASURY_ADDR)).transfer(amount);

        treasuryFeeAmt = 0;

        emit ClaimTreasuryFee(DOINGUD_TREASURY_ADDR, amount);
    }

    function setTreasury(address newAddr) external onlyOwner{
        DOINGUD_TREASURY_ADDR = newAddr;

        emit SetTreasuryAddress(newAddr);
    }

    event Receive(uint value);
    /// Receive Ether
    fallback() external payable {
        emit Receive(msg.value);
    }
    receive() external payable {
        emit Receive(msg.value);
    }
}
