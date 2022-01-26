// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

// Supply: 20000
// All 20,000 are priced at 0.095 ETH
// Paid allowlist
// Free allowlist
// 1 txn/wallet
contract TokenproofFoundersCircleNFT is ERC721Enumerable, Ownable {

    using Strings for uint256;

    // IPFS URI for metadata
    string _baseTokenURI;

    // Mint price
    uint256 private _price = 0.0001 ether;

    // mint paused/unpaused
    bool public _paused = false;

    // free allowlist
    mapping(address => bool) private _allowListClaimed;
    bytes32 public merkleRoot = 0xf30e4a50fdbcd35d0b8c94e8bc5d5f29935c886a129dc6126d0acaff7d6c64b3;


    constructor(string memory baseURI) ERC721("tokenproof Founder's Circle", "TPROOFC")  {
        setBaseURI(baseURI);
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // ERC721Metadata
    ////////////////////////////////////////////////////////////////////////////////////

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(_baseTokenURI));
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // IPFS URI
    ////////////////////////////////////////////////////////////////////////////////////

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Mint Function
    ////////////////////////////////////////////////////////////////////////////////////

    function pause(bool val) public onlyOwner {
        _paused = val;
    }

    function presale(bytes32[] calldata _merkleProof) external payable {
        // ensure unclaimed
        require(!_allowListClaimed[msg.sender], "Address has already claimed");

        // verify the provided merkle proof, given to us through the API call on our website
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Invalid proof.");

        // mark claimed
        _allowListClaimed[msg.sender] = true;

        // Mint
        require( totalSupply() < 20000, "Exceeds maximum NFT supply" );
        _safeMint(msg.sender, totalSupply() + 1);
    }

    function awardItem(uint256 num) public payable {
        require( !_paused,                    "Sale paused" );
        // one per wallet
        require(balanceOf(msg.sender) == 0, 'Each address may only own one NFT');
        // one at a time
        require( num < 2,                    "You can mint a maximum of 1 NFT per wallet");
        // correct price
        require( msg.value >= _price * num,   "Ether sent is not correct" );
        // still available to mint
        uint256 supply = totalSupply();
        require( supply + num < 20001,            "Exceeds maximum NFT supply" );


        for(uint256 i = 1; i <= num; i++) {
            _safeMint( msg.sender, supply + i );
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Helpers?
    ////////////////////////////////////////////////////////////////////////////////////

    function walletOfOwner(address _owner) public view returns(uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);

        uint256[] memory tokensId = new uint256[](tokenCount);
        for(uint256 i; i < tokenCount; i++){
            tokensId[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokensId;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Treasury
    ////////////////////////////////////////////////////////////////////////////////////

    function withdrawAll(uint256 amount) public onlyOwner {
        require(amount <= address(this).balance);
        payable(msg.sender).transfer(amount);
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Test Cleanup
    ////////////////////////////////////////////////////////////////////////////////////

    function destroy() public onlyOwner {
        selfdestruct(payable(owner()));
    }
}
