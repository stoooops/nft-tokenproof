// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';
import "./lib/ERC721A.sol";

// Supply: 20000
// All 20,000 are priced at 0.095 ETH
// Paid allowlist
// Free allowlist
// 1 txn/wallet
contract TokenproofFoundersCircleNFT is ERC721A, Ownable, ReentrancyGuard {

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
    mapping(address => uint256) private _numMintedByAddress;

    // track who called free claim already to disallow repeated calls
    mapping(address => bool) private _hasFreeClaimed;

    // allowlist for freeClaim
    bytes32 public merkleRootFreeClaim = 0x95758bb7678be816e57e10f33116431676b9263618ea7f42b2e45f3b23f3bb55;

    // allowlist for preSale
    bytes32 public merkleRootPreSale = 0x95758bb7678be816e57e10f33116431676b9263618ea7f42b2e45f3b23f3bb55;

    constructor(string memory baseURI) ERC721A("tokenproof Founders Circle", "TKPFC", 5, 20000)  {
        setBaseURI(baseURI);
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // ERC721Metadata
    ////////////////////////////////////////////////////////////////////////////////////

    // TODO /0 /1 /2
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
    // Price updates if needed
    ////////////////////////////////////////////////////////////////////////////////////

    function setPrice(uint256 newPrice) public onlyOwner {
        _price = newPrice;
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

    function _recordAndValidateMintNum(uint256 _num) private {
        require(_num < 6, "Cannot mint more than 5");
        unchecked {
            _numMintedByAddress[msg.sender] += _num;
        }
        require(_numMintedByAddress[msg.sender] < 6, "Address has minted too many");
    }

    function _merkleMint(uint256 _num, bytes32[] calldata _merkleProof, bytes32 _merkleRoot) private {
        // verify the provided merkle proof, given to us through the API call on our website
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, _merkleRoot, leaf), "Invalid proof.");

        // mark claimed
        _recordAndValidateMintNum(_num);

        // Mint
        _safeMint(msg.sender, _num);
    }

    function freeClaim(bytes32[] calldata _merkleProof) external payable nonReentrant {
        require( _isFreeClaimActive,  "Free claim not active" );

        require(!_hasFreeClaimed[msg.sender], "Address has already free claimed");
        _hasFreeClaimed[msg.sender] = true;

        _merkleMint(1, _merkleProof, merkleRootFreeClaim);
    }

    function preSale(uint256 _num, bytes32[] calldata _merkleProof) external payable nonReentrant {
        require( _isPreSaleActive,  "Pre sale not active" );
        // correct price
        require( msg.value == _num * _price,   "Ether sent is not correct" );

        _merkleMint(_num, _merkleProof, merkleRootPreSale);
    }

    function publicSale(uint256 _num) public payable nonReentrant {
        require( _isPublicSaleActive,  "Public sale not active" );
        // correct price
        require( msg.value == _num * _price, "Ether sent is not correct" );

        // mark claimed
        _recordAndValidateMintNum(_num);

        // #1 - 20000
        _safeMint(msg.sender, _num);
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
