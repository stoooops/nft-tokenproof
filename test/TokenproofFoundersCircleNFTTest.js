const { expect } = require('chai');
const { ethers } = require('hardhat');
const Web3Utils = require('web3-utils');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const fs = require('fs');
const rawdata = fs.readFileSync('./allowlists/test_allowlist.json');
const ALLOWLIST_ADDRESSES = JSON.parse(rawdata);
//
const TEST_MERKLE_ROOT = "0x95758bb7678be816e57e10f33116431676b9263618ea7f42b2e45f3b23f3bb55";

const TEST_URI = 'https://test_uri/';

const ERROR_MSG_ALREADY_FREE_CLAIMED = 'Address has already free claimed';
const ERROR_MSG_CALLER_IS_NOT_THE_OWNER = 'Ownable: caller is not the owner';
const ERROR_MSG_FREE_CLAIM_NOT_ACTIVE = 'Free claim not active';
const ERROR_MSG_INVALID_PROOF = 'Invalid proof';

describe('TokenproofFoundersCircleNFT', function () {
  let owner, allowlist1, allowlist2, allowlist3, other;
  let merkleTree;
  let TokenproofFoundersCircleNFT;
  let nftContract;

  // const provider = waffle.provider;

  before(async function () {
    [owner, allowlist1, allowlist2, allowlist3, other] = await ethers.getSigners();

    const leafNodes = ALLOWLIST_ADDRESSES.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  });

  beforeEach(async function () {
    TokenproofFoundersCircleNFT = await ethers.getContractFactory('TokenproofFoundersCircleNFT');
    nftContract = await TokenproofFoundersCircleNFT.deploy(TEST_URI);
    await nftContract.deployed();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await nftContract.owner()).to.equal(owner.address);
    });

    it('Should have 0 supply after deployment', async function () {
      expect(await nftContract.totalSupply()).to.equal(0);
    });
  });

  describe('Mint', function () {

    /// /////////////////////////////////////////////////////////////////////////////////
    // freeClaim TESTS
    /// /////////////////////////////////////////////////////////////////////////////////
    describe('freeClaim', function () {
      beforeEach(async function () {
        await nftContract.connect(owner).setAllowListFreeClaim(TEST_MERKLE_ROOT);
        await nftContract.setIsFreeClaimActive(true);
      });

      it('Should be able to set new allowlist merkle root', async function () {
        await nftContract.connect(owner).setAllowListFreeClaim("0x0000000000000000000000000000000000000000000000000000000123456789");

        // standard merkleproof
        // merkle proof for #1
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));

        // unable to free claim since merkle root was changed
        await expect(nftContract.connect(allowlist1).freeClaim(merkleProof)).to.be.revertedWith(
          ERROR_MSG_INVALID_PROOF
        );
      });

      it('Should be able to pause/unpause freeClaim', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        // pause
        await nftContract.setIsFreeClaimActive(false);
        await expect(nftContract.connect(allowlist1).freeClaim(merkleProof)).to.be.revertedWith(
          ERROR_MSG_FREE_CLAIM_NOT_ACTIVE
        );

        // unpause
        await nftContract.setIsFreeClaimActive(true);
        await nftContract.connect(allowlist1).freeClaim(merkleProof);
      });

      it('Should be able to allowlist freeClaim NFT #0', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).freeClaim(merkleProof);

        expect(await nftContract.totalSupply()).to.equal(1);
        expect(await nftContract.tokenURI(0)).to.equal(TEST_URI);
      });

      it('Should be able to allowlist freeClaim NFT #0, #1, #2', async function () {
        const allowlists = [allowlist1, allowlist2, allowlist3];
        for (const addr of allowlists) {
          const merkleProof = merkleTree.getHexProof(keccak256(addr.address));
          await nftContract.connect(addr).freeClaim(merkleProof);
        }

        expect(await nftContract.totalSupply()).to.equal(allowlists.length);
      });

      it('Should be able to allowlist freeClaim NFT #0 but not a second', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).freeClaim(merkleProof);

        await expect(nftContract.connect(allowlist1).freeClaim(merkleProof)).to.be.revertedWith(
          ERROR_MSG_ALREADY_FREE_CLAIMED
        );
      });

      it('Should not be able to freeClaim, transfer, freeClaim same wallet', async function () {
        // should succeed
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).freeClaim(merkleProof);
        await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 0);

        // should fail because already minted from that wallet
        await expect(nftContract.connect(allowlist1).freeClaim(merkleProof)).to.be.revertedWith(
          ERROR_MSG_ALREADY_FREE_CLAIMED
        );
      });

      it('Should not be able to use wrong MerkleProof', async function () {
        // merkle proof for #1
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));

        // transact with #2
        await expect(nftContract.connect(allowlist2).freeClaim(merkleProof)).to.be.revertedWith(
          ERROR_MSG_INVALID_PROOF
        );
        await expect(nftContract.connect(other).freeClaim(merkleProof)).to.be.revertedWith(ERROR_MSG_INVALID_PROOF);
      });
    });
  });
});
