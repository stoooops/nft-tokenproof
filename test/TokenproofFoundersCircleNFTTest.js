const { expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const Web3Utils = require('web3-utils');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const fs = require('fs');
const rawdata = fs.readFileSync('./allowlists/test_allowlist.json');
const ALLOWLIST_ADDRESSES = JSON.parse(rawdata);

const MAX_MINT = 5;
const MINT_PRICE = '0.1';
const MAX_MINT_PRICE_WEI = (MAX_MINT * Web3Utils.toWei(MINT_PRICE, 'ether')).toString();
const TEST_URI = 'https://test_uri/';

const ERROR_MSG_ALREADY_FREE_CLAIMED = 'Address has already free claimed';
const ERROR_MSG_CALLER_IS_NOT_THE_OWNER = 'Ownable: caller is not the owner';
const ERROR_MSG_FREE_CLAIM_NOT_ACTIVE = 'Free claim not active';
const ERROR_MSG_INVALID_PROOF = 'Invalid proof';
const ERROR_MSG_MINTED_TOO_MANY = 'Address has minted too many';
const ERROR_MSG_PRE_SALE_NOT_ACTIVE = 'Pre sale not active';
const ERROR_MSG_PUBLIC_SALE_NOT_ACTIVE = 'Public sale not active';
const ERROR_MSG_WRONG_ETHER = 'Ether sent is not correct';

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
        await nftContract.setIsFreeClaimActive(true);
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

      it('Should be able to allowlist freeClaim then purchase max', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).freeClaim(merkleProof);

        await nftContract.setIsPublicSaleActive(true);
        await nftContract.connect(allowlist1).publicSale(MAX_MINT, {
          value: MAX_MINT_PRICE_WEI,
        });
        // should fail because already minted max from that wallet
        await expect(
          nftContract.connect(allowlist1).publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);

        expect(await nftContract.totalSupply()).to.equal(MAX_MINT + 1);
        for (let i = 0; i < MAX_MINT + 1; i++) {
          expect(await nftContract.tokenURI(i)).to.equal(TEST_URI);
        }
      });

      it('Should be able to purchase max then allowlist freeClaim', async function () {
        await nftContract.setIsPublicSaleActive(true);
        await nftContract.connect(allowlist1).publicSale(MAX_MINT, {
          value: MAX_MINT_PRICE_WEI,
        });
        // should fail because already minted max from that wallet
        await expect(
          nftContract.connect(allowlist1).publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);

        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).freeClaim(merkleProof);

        expect(await nftContract.totalSupply()).to.equal(MAX_MINT + 1);
        for (let i = 0; i < MAX_MINT + 1; i++) {
          expect(await nftContract.tokenURI(i)).to.equal(TEST_URI);
        }
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

      // TODO do we need to test this?
      //   it('Should not be able to mint, transfer, mint received wallet', async function () {
      //     // should succeed
      //     const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
      //     await nftContract.connect(allowlist1).freeClaim(merkleProof);
      //     await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 0);

      //     await nftContract.setIsPublicSaleActive(true);
      //     // should fail because already one in that wallet
      //     await expect(
      //       nftContract.publicSale(1, {
      //         value: Web3Utils.toWei(MINT_PRICE, 'ether'),
      //       })
      //     ).to.be.revertedWith(ERROR_MSG_ALREADY_OWNED);
      //   });

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

    /// /////////////////////////////////////////////////////////////////////////////////
    // preSale TESTS
    /// /////////////////////////////////////////////////////////////////////////////////
    describe('preSale', function () {
      beforeEach(async function () {
        await nftContract.setIsPreSaleActive(true);
      });

      it('Should be able to pause/unpause preSale', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        // pause
        await nftContract.setIsPreSaleActive(false);
        await expect(
          nftContract.connect(allowlist1).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_PRE_SALE_NOT_ACTIVE);

        // unpause
        await nftContract.setIsPreSaleActive(true);
        await nftContract.connect(allowlist1).preSale(1, merkleProof, {
          value: Web3Utils.toWei(MINT_PRICE, 'ether'),
        });
      });

      it('Should be able to allowlist preSale NFT #0', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).preSale(1, merkleProof, {
          value: Web3Utils.toWei(MINT_PRICE, 'ether'),
        });

        expect(await nftContract.totalSupply()).to.equal(1);
        expect(await nftContract.tokenURI(0)).to.equal(TEST_URI);
      });

      it('Should be able to allowlist preSale NFT #0-4 but not #5', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).preSale(MAX_MINT, merkleProof, {
          value: MAX_MINT_PRICE_WEI,
        });

        expect(await nftContract.totalSupply()).to.equal(MAX_MINT);
        for (let i = 0; i < MAX_MINT; i++) {
          expect(await nftContract.tokenURI(i)).to.equal(TEST_URI);
        }

        // should not be able to mint another
        await expect(
          nftContract.connect(allowlist1).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
      });

      it('Should not preSale if no value sent', async function () {
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await expect(
          nftContract.connect(allowlist1).preSale(1, merkleProof, {
            value: 0,
          })
        ).to.be.revertedWith(ERROR_MSG_WRONG_ETHER);
      });

      it('Should be able to allowlist preSale NFT #0, #1, #2', async function () {
        for (const addr of [allowlist1, allowlist2, allowlist3]) {
          const merkleProof = merkleTree.getHexProof(keccak256(addr.address));
          await nftContract.connect(addr).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          });
        }

        expect(await nftContract.totalSupply()).to.equal(3);
      });

      it('Should not be able to preSale max, transfer, preSale/publicSale same wallet', async function () {
        // should succeed
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).preSale(MAX_MINT, merkleProof, {
          value: MAX_MINT_PRICE_WEI,
        });
        for (let i = 0; i < MAX_MINT; i++) {
          await nftContract.connect(allowlist1).transferFrom(allowlist1.address, allowlist2.address, i);
        }

        // should fail because already minted from that wallet
        await expect(
          nftContract.connect(allowlist1).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
        // public sale also fail
        await nftContract.setIsPublicSaleActive(true);
        await expect(
          nftContract.connect(allowlist1).publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
      });

      //   it('Should not be able to mint, transfer, mint received wallet', async function () {
      //     // should succeed
      //     const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
      //     await nftContract.connect(allowlist1).preSale(1, merkleProof, {
      //       value: Web3Utils.toWei(MINT_PRICE, 'ether'),
      //     });
      //     await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 0);

      //     // should fail because already in that wallet
      //     await nftContract.setIsPublicSaleActive(true);
      //     await expect(
      //       nftContract.publicSale(1, {
      //         value: Web3Utils.toWei(MINT_PRICE, 'ether'),
      //       })
      //     ).to.be.revertedWith(ERROR_MSG_ALREADY_OWNED);
      //   });

      it('Should not be able to use wrong MerkleProof', async function () {
        // merkle proof for #1
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));

        // transact with #2
        await expect(
          nftContract.connect(allowlist2).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_INVALID_PROOF);

        // transact with other
        await expect(
          nftContract.connect(other).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_INVALID_PROOF);
      });
    });

    /// /////////////////////////////////////////////////////////////////////////////////
    // publicSale TESTS
    /// /////////////////////////////////////////////////////////////////////////////////
    describe('publicSale', function () {
      beforeEach(async function () {
        await nftContract.setIsPublicSaleActive(true);
      });

      it('Should be able to pause/unpause public sale', async function () {
        // pause
        await nftContract.setIsPublicSaleActive(false);
        await expect(
          nftContract.publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_PUBLIC_SALE_NOT_ACTIVE);
        // unpause
        await nftContract.setIsPublicSaleActive(true);
        await nftContract.publicSale(1, {
          value: Web3Utils.toWei(MINT_PRICE, 'ether'),
        });
      });

      it('Should be able to pay to mint NFT #0', async function () {
        await nftContract.publicSale(1, {
          value: Web3Utils.toWei(MINT_PRICE, 'ether'),
        });

        expect(await nftContract.totalSupply()).to.equal(1);
        expect(await nftContract.tokenURI(0)).to.equal(TEST_URI);
      });

      it('Should be able to pay to mint NFT #0, then #1 after price update', async function () {
        await nftContract.publicSale(1, {
          value: Web3Utils.toWei(MINT_PRICE, 'ether'),
        });

        expect(await nftContract.totalSupply()).to.equal(1);
        expect(await nftContract.tokenURI(0)).to.equal(TEST_URI);

        // update price
        const newPrice = Web3Utils.toWei((10 * parseInt(MINT_PRICE)).toString(), 'ether');
        // cannot change from non-owner address
        await expect(nftContract.connect(allowlist1).setPrice(newPrice)).to.be.revertedWith(
          ERROR_MSG_CALLER_IS_NOT_THE_OWNER
        );
        // can change from owner address
        await nftContract.setPrice(newPrice);

        // now buy again from new addr
        // should fail at old price
        await expect(
          nftContract.connect(allowlist1).publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_WRONG_ETHER);
        // should pass with new price
        await nftContract.connect(allowlist1).publicSale(1, {
          value: newPrice,
        });
      });

      it('Should be able to publicSale from different accounts', async function () {
        for (const addr of await ethers.getSigners()) {
          await nftContract.connect(addr).publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          });
        }
      });

      it('Should not publicSale if no value sent', async function () {
        await expect(nftContract.publicSale(1, { value: 0 })).to.be.revertedWith(ERROR_MSG_WRONG_ETHER);
      });

      it('Should not be able to publicSale max, 1 in sequence for same wallet', async function () {
        // should succeed
        await nftContract.publicSale(MAX_MINT, {
          value: MAX_MINT_PRICE_WEI,
        });

        // should fail because already minted max from that wallet
        await expect(
          nftContract.publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
      });

      it('Should not be able to publicSale max, transfer out, publicSale same wallet', async function () {
        // should succeed
        await nftContract.publicSale(MAX_MINT, {
          value: MAX_MINT_PRICE_WEI,
        });
        for (let i = 0; i < MAX_MINT; i++) {
          await nftContract.transferFrom(owner.address, allowlist1.address, i);
        }

        // should fail because already minted from that wallet
        await expect(
          nftContract.publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
      });

      it('Should not be able to publicSale max, transfer out, preSale same wallet', async function () {
        // should succeed
        await nftContract.connect(allowlist1).publicSale(MAX_MINT, {
          value: MAX_MINT_PRICE_WEI,
        });
        for (let i = 0; i < MAX_MINT; i++) {
          await nftContract.connect(allowlist1).transferFrom(allowlist1.address, allowlist2.address, i);
        }

        // should fail because already minted from that wallet
        await nftContract.setIsPreSaleActive(true);
        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await expect(
          nftContract.connect(allowlist1).preSale(1, merkleProof, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
      });

      // TODO check if desired
      it('Should be not be able to mint if completed preSale', async function () {
        await nftContract.setIsPreSaleActive(true);

        const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
        await nftContract.connect(allowlist1).preSale(MAX_MINT, merkleProof, {
          value: MAX_MINT_PRICE_WEI,
        });

        await expect(
          nftContract.connect(allowlist1).publicSale(1, {
            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
          })
        ).to.be.revertedWith(ERROR_MSG_MINTED_TOO_MANY);
      });
    });
  });
});
