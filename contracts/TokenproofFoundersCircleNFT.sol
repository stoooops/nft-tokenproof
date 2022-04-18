// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import "erc721a/contracts/ERC721A.sol";


// Name: "tokenproof Founders Circle"
// Symbol: TKPFC
// 5,000 supply
// free allowlist
contract TokenproofFoundersCircleNFT is ERC721A, Ownable {

    using Strings for uint256;

    // IPFS URI for metadata
    string _baseTokenURI;

    // mint paused/unpaused
    bool public _isFreeClaimActive = false;

    // track who called free claim already to disallow repeated calls
    mapping(address => bool) private _hasFreeClaimed;

    // allowlist for freeClaim
    bytes32 public merkleRootFreeClaim;

    constructor(string memory baseURI) ERC721A("tokenproof Founders Circle", "TKPFC")  {
        setBaseURI(baseURI);
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // ERC721Metadata
    ////////////////////////////////////////////////////////////////////////////////////

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

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
    // Merkle Tree updateable if needed
    ////////////////////////////////////////////////////////////////////////////////////

    function setAllowListFreeClaim(bytes32 newRoot) public onlyOwner {
        merkleRootFreeClaim = newRoot;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // mint
    ////////////////////////////////////////////////////////////////////////////////////

    function setIsFreeClaimActive(bool val) public onlyOwner {
        _isFreeClaimActive = val;
    }

    function freeClaim(bytes32[] calldata _merkleProof) external payable {
        // ensure active freeClaim
        require( _isFreeClaimActive,  "Free claim not active" );

        // ensure not already free claimed
        require(!_hasFreeClaimed[msg.sender], "Address has already free claimed");
        _hasFreeClaimed[msg.sender] = true;

        // ensure correct merkle proof supplied
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, merkleRootFreeClaim, leaf), "Invalid proof.");

        // ERC721A mint
        // the version of ERC721A included here does not enforce max supply so we do it ourself
        require(totalSupply() < 5000, "Max supply already has been minted");
        _safeMint(msg.sender, 1);
    }

    function devMint(uint256 n) public onlyOwner {
        _safeMint(msg.sender, n);
        // the version of ERC721A included here does not enforce max supply so we do it ourself
        require(5001 > totalSupply(), "Max supply already has been minted");
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Treasury
    ////////////////////////////////////////////////////////////////////////////////////

    function withdrawAll(uint256 amount) public onlyOwner {
        require(amount <= address(this).balance);
        payable(msg.sender).transfer(amount);
    }
}
