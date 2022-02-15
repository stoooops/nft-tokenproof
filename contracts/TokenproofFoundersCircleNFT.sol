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
    // TODO update price before deployment
    uint256 private _price = 0.0001 ether;

    // mint paused/unpaused
    bool public _isFreeClaimActive = false;
    bool public _isPreSaleActive = false;
    bool public _isPublicSaleActive = false;

    // track who has minted and allow 1 mint per address
    mapping(address => bool) private _mintedAddresses;

    // allowlist for freeClaim
    bytes32 public merkleRootFreeClaim = 0x95758bb7678be816e57e10f33116431676b9263618ea7f42b2e45f3b23f3bb55;

    // allowlist for preSale
    bytes32 public merkleRootPreSale = 0x95758bb7678be816e57e10f33116431676b9263618ea7f42b2e45f3b23f3bb55;

    constructor(string memory baseURI) ERC721("tokenproof Founders Circle", "TKPFC")  {
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
    // Merkle Tree updates if needed
    ////////////////////////////////////////////////////////////////////////////////////

    function setAllowListFreeClaim(bytes32 newRoot) public onlyOwner {
        merkleRootFreeClaim = newRoot;
    }

    function setAllowListPreSale(bytes32 newRoot) public onlyOwner {
        merkleRootPreSale = newRoot;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Mint Function
    ////////////////////////////////////////////////////////////////////////////////////

    function setIsFreeClaimActive(bool val) public onlyOwner {
        _isFreeClaimActive = val;
    }

    function setIsPreSaleActive(bool val) public onlyOwner {
        _isPreSaleActive = val;
    }

    function setIsPublicSaleActive(bool val) public onlyOwner {
        _isPublicSaleActive = val;
    }

    function _merkleMint(bytes32[] calldata _merkleProof, mapping(address => bool) storage _claimed, bytes32 _merkleRoot) private {
        // ensure unclaimed
        require(!_claimed[msg.sender], "Address has already minted");
        require(balanceOf(msg.sender) == 0, "Cannot mint if already own NFT");

        // verify the provided merkle proof, given to us through the API call on our website
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, _merkleRoot, leaf), "Invalid proof.");

        // check supply
        uint256 supply = totalSupply();
        require( supply < 20000, "Exceeds maximum NFT supply" );

        // mark claimed
        _claimed[msg.sender] = true;
        // Mint
        _safeMint(msg.sender, supply + 1);

    }

    function freeClaim(bytes32[] calldata _merkleProof) external payable {
        require( _isFreeClaimActive,  "Free claim not active" );
        _merkleMint(_merkleProof, _mintedAddresses, merkleRootFreeClaim);
    }

    function preSale(bytes32[] calldata _merkleProof) external payable {
        require( _isPreSaleActive,  "Pre sale not active" );
        // correct price
        require( msg.value >= _price,   "Ether sent is not correct" );

        _merkleMint(_merkleProof, _mintedAddresses, merkleRootPreSale);
    }

    function publicSale() public payable {
        require( _isPublicSaleActive,  "Public sale not active" );
        // ensure unclaimed
        require(!_mintedAddresses[msg.sender], "Address has already minted");
        // one per wallet to avoid funkiness
        require(balanceOf(msg.sender) == 0, "Cannot mint if already own NFT");
        // correct price
        require( msg.value == _price, "Ether sent is not correct" );
        // still available to mint
        uint256 supply = totalSupply();
        require( supply < 20000, "Exceeds maximum NFT supply" );

        // mark claimed
        _mintedAddresses[msg.sender] = true;

        // #1 - 20000
        _safeMint( msg.sender, supply + 1 );
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
