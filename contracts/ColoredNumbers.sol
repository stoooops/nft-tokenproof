// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Base64 } from "./lib/Base64.sol";

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';


contract ColoredNumbers is ERC721Enumerable, Ownable {

    using Strings for uint256;

    string _baseTokenURI;
    uint256 private _price = 0.0001 ether;
    bool public _paused = false;

    mapping(uint256 => mapping(address => uint256)) public _tokenAccounts;

    constructor(string memory baseURI) ERC721("Colored Numbers", "COLORNUM")  {
        setBaseURI(baseURI);
    }

    function awardItem(uint256 num) public payable {
        uint256 supply = totalSupply();
        require( !_paused,                    "Sale paused" );
        require( num < 11,                    "You can mint a maximum of 10 NFTs at once");
        require( supply + num < 11,            "Exceeds maximum NFT supply" );
        require( msg.value >= _price * num,   "Ether sent is not correct" );

        for(uint256 i = 1; i <= num; i++) {
            _safeMint( msg.sender, supply + i );
        }
    }

    function walletOfOwner(address _owner) public view returns(uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);

        uint256[] memory tokensId = new uint256[](tokenCount);
        for(uint256 i; i < tokenCount; i++){
            tokensId[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokensId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function pause(bool val) public onlyOwner {
        _paused = val;
    }

    function withdrawAll(uint256 amount) public onlyOwner {
        require(amount <= getBalance());
        payable(msg.sender).transfer(amount);
    }

     function getBalance() public view returns (uint256) {
         return address(this).balance;
     }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Vault functionality
    ////////////////////////////////////////////////////////////////////////////////////

    function deposit(uint256 tokenId, address asset, uint amount) public {
        require(_exists(tokenId), "ERC721Metadata: Deposit for nonexistent token");
        require(ownerOf(tokenId) == msg.sender); // should this be disabled

        EIP20 token = EIP20(asset);

        token.transferFrom(msg.sender, address(this), amount);

        _tokenAccounts[tokenId]


    }

    // tokenId comes from ERC-721 tokenURI
    // asset/requestedAmount comes from Compound interface
    function withdraw(uint256 tokenId, address asset, uint requestedAmount) public returns (uint) {
        require(_exists(tokenId), "ERC721Metadata: Withdrawal for nonexistent token");
        require(ownerOf(tokenId) == msg.sender);

        // TODO must validate requestedAmount
        EIP20 token = EIP20(asset);
        token.transfer(msg.sender, requestedAmount);
    }

    // tokenId comes from ERC-721 tokenURI
    // asset/requestedAmount comes from Compound interface
    function withdraw(uint256 tokenId, address asset, uint requestedAmount) public returns (uint) {
        // TODO must validate requestedAmount
        EIP20 token = EIP20(asset);
        token.transfer(msg.sender, requestedAmount);
    }

    // testOnly
    function destroy() public onlyOwner {
        selfdestruct(payable(owner()));
    }
}
