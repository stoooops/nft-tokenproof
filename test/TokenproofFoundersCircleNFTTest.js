const { expect, assert } = require('chai')
const { ethers, waffle } = require('hardhat')
const Web3Utils = require('web3-utils')
const { MerkleTree } = require("merkletreejs");
const keccak256 = require('keccak256')

const ALLOWLIST_ADDRESSES =  [
    // 2-4 from default provider mneumonic
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    // tokenproof testnet accounts
    "0x6F836d79dB63044BBD34BeA6E7E9E6004987A75E",
    "0x30145D714Db337606c8f520bee9a3e3eAC910636",
    "0x2311C8A1C7A31694AdfF5E53A3dD5cd922d806Cb" //,
//    "0xd1968902b1A702F8cF4dcd7df1DfADE2BD5ADB67"
]

const MINT_PRICE = '0.0001'
const TEST_URI = 'https://test_uri/'

const ERROR_MSG_WRONG_ETHER = "Ether sent is not correct"
const ERROR_MSG_ALREADY_MINTED = "Address has already minted"
const ERROR_MSG_ALREADY_OWNED = "Cannot mint if already own NFT"
const ERROR_MSG_INVALID_PROOF = "Invalid proof"

describe('TokenproofFoundersCircleNFT', function () {
  let owner, allowlist1, allowlist2, allowlist3, other
  let merkleTree
  let TokenproofFoundersCircleNFT
  let nftContract

  const provider = waffle.provider

  before(async function () {
    [owner, allowlist1, allowlist2, allowlist3, other, _] = await ethers.getSigners()

    const leafNodes = ALLOWLIST_ADDRESSES.map(addr => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  })

  beforeEach(async function () {
    TokenproofFoundersCircleNFT = await ethers.getContractFactory('TokenproofFoundersCircleNFT')
    nftContract = await TokenproofFoundersCircleNFT.deploy(TEST_URI)
    await nftContract.deployed()
  })

  describe("Deployment", function () {

    it("Should set the right owner", async function () {
      expect(await nftContract.owner()).to.equal(owner.address);
    });

    it('Should have 0 supply after deployment', async function () {
      expect(await nftContract.totalSupply()).to.equal(0)
    })

  });

  describe("Mint", function () {

    describe("freeClaim", function () {

        it('Should be able to allowlist mint NFT #1', async function () {
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).freeClaim(merkleProof)

            expect(await nftContract.totalSupply()).to.equal(1)
            expect(await nftContract.tokenURI(1)).to.equal(TEST_URI)
        })

        it('Should be able to allowlist mint NFT #1, #2, #3', async function () {
            for (const addr of [allowlist1, allowlist2, allowlist3]) {
                const merkleProof = merkleTree.getHexProof(keccak256(addr.address));
                console.log("-------------------")
                console.log(addr.address)
                console.log(merkleProof)
                console.log("-------------------")
                await nftContract.connect(addr).freeClaim(merkleProof)
            }

            expect(await nftContract.totalSupply()).to.equal(3)
        })

        it('Should be able to allowlist mint NFT #1 but not a second', async function () {
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).freeClaim(merkleProof)

            await expect(nftContract.connect(allowlist1).freeClaim(merkleProof)).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })

        it('Should not be able to mint, transfer, mint same wallet', async function () {
            // should succeed
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).freeClaim(merkleProof)
            await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 1)

            // should fail because already minted from that wallet
            await expect(nftContract.connect(allowlist1).freeClaim(merkleProof)).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })

        it('Should not be able to mint, transfer, mint received wallet', async function () {
            // should succeed
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })
            await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 1)

            // should fail because already in that wallet
            await expect(nftContract.publicSale({
                    value: Web3Utils.toWei(MINT_PRICE, 'ether'),
                })).to.be.revertedWith(ERROR_MSG_ALREADY_OWNED)
        })

        it('Should not be able to use wrong MerkleProof', async function () {
            // merkle proof for #1
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));

            // transact with #2
            await expect(nftContract.connect(allowlist2).freeClaim(merkleProof)).to.be.revertedWith(ERROR_MSG_INVALID_PROOF)
            await expect(nftContract.connect(other).freeClaim(merkleProof)).to.be.revertedWith(ERROR_MSG_INVALID_PROOF)
        })
    });

    describe("preSale", function () {

        it('Should be able to allowlist mint NFT #1', async function () {
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })

            expect(await nftContract.totalSupply()).to.equal(1)
            expect(await nftContract.tokenURI(1)).to.equal(TEST_URI)
        })

        it('Should not mint if no value sent', async function () {
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await expect(nftContract.connect(allowlist1).preSale(merkleProof, {
                value: 0,
            })).to.be.revertedWith(ERROR_MSG_WRONG_ETHER)
        })

        it('Should be able to allowlist mint NFT #1, #2, #3', async function () {
            for (const addr of [allowlist1, allowlist2, allowlist3]) {
                const merkleProof = merkleTree.getHexProof(keccak256(addr.address));
                await nftContract.connect(addr).preSale(merkleProof, {
                    value: Web3Utils.toWei(MINT_PRICE, 'ether'),
                })
            }

            expect(await nftContract.totalSupply()).to.equal(3)
        })

        it('Should be able to allowlist mint NFT #1 but not a second', async function () {
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })

            await expect(nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })

        it('Should not be able to mint, transfer, mint same wallet', async function () {
            // should succeed
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })
            await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 1)

            // should fail because already minted from that wallet
            await expect(nftContract.connect(allowlist1).publicSale({
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })

        it('Should not be able to mint, transfer, mint received wallet', async function () {
            // should succeed
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })
            await nftContract.connect(allowlist1).transferFrom(allowlist1.address, owner.address, 1)

            // should fail because already in that wallet
                await expect(nftContract.publicSale({
                    value: Web3Utils.toWei(MINT_PRICE, 'ether'),
                })).to.be.revertedWith(ERROR_MSG_ALREADY_OWNED)
        })

        it('Should not be able to use wrong MerkleProof', async function () {
            // merkle proof for #1
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));

            // transact with #2
                await expect( nftContract.connect(allowlist2).preSale(merkleProof, {
                    value: Web3Utils.toWei(MINT_PRICE, 'ether'),
                })).to.be.revertedWith(ERROR_MSG_INVALID_PROOF)

            // transact with other
            await expect( nftContract.connect(other).preSale(merkleProof, {
                    value: Web3Utils.toWei(MINT_PRICE, 'ether'),
                })).to.be.revertedWith(ERROR_MSG_INVALID_PROOF)
        })
    });

    describe("publicSale", function () {

        it('Should be able to pay to mint NFT #1', async function () {
            await nftContract.publicSale({
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })

            expect(await nftContract.totalSupply()).to.equal(1)
            expect(await nftContract.tokenURI(1)).to.equal(TEST_URI)
        })

        it('Should be able to pay to mint from different accounts', async function () {
            for (const addr of await ethers.getSigners()) {
                await nftContract.connect(addr).publicSale({
                    value: Web3Utils.toWei(MINT_PRICE, 'ether'),
                })
            }
        })

        it('Should not mint if no value sent', async function () {
            await expect(nftContract.publicSale({ value: 0 })).to.be.revertedWith(ERROR_MSG_WRONG_ETHER)
        })

        it('Should not be able to mint two in sequence for same wallet', async function () {
            // should succeed
            await nftContract.publicSale({
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })

            // should fail because already minted from that wallet
            await expect(nftContract.publicSale({
                            value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })

        it('Should not be able to mint, transfer out, mint same wallet', async function () {
            // should succeed
            await nftContract.publicSale({
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })
            await nftContract.transferFrom(owner.address, allowlist1.address, 1)

            // should fail because already minted from that wallet
            await expect(nftContract.publicSale({
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })

        // TODO check if desired
        it('Should be not be able to mint if completed preSale', async function () {
            const merkleProof = merkleTree.getHexProof(keccak256(allowlist1.address));
            await nftContract.connect(allowlist1).preSale(merkleProof, {
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })

            await expect(nftContract.connect(allowlist1).publicSale({
                value: Web3Utils.toWei(MINT_PRICE, 'ether'),
            })).to.be.revertedWith(ERROR_MSG_ALREADY_MINTED)
        })
    });
  });
})
