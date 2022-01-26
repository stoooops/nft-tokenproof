const { expect, assert } = require('chai')
const { ethers, waffle } = require('hardhat')
const Web3Utils = require('web3-utils')

const MINT_PRICE = '0.0001'
const TEST_URI = 'https://test_uri/'

const provider = waffle.provider

describe('TokenproofFoundersCircleNFT', function () {
  let addr1, addr2, addr3, addr4
  let TokenproofFoundersCircleNFT
  let nftContract

  beforeEach(async function () {
    ;[addr1, addr2, addr3, addr4, _] = await ethers.getSigners()

    TokenproofFoundersCircleNFT = await ethers.getContractFactory('TokenproofFoundersCircleNFT')
    nftContract = await TokenproofFoundersCircleNFT.deploy(TEST_URI)
    await nftContract.deployed()
  })

  it('Should have 0 supply after deployment', async function () {
    expect(await nftContract.totalSupply()).to.equal(0)
  })

  it('Should not mint if no value sent', async function () {
    let err = null
    try {
      await nftContract.awardItem(1, { value: 0 })
    } catch (error) {
      err = error
    }
    assert.ok(err instanceof Error)
  })

  it('Should be able to mint NFT #1', async function () {
    await nftContract.awardItem(1, {
      value: Web3Utils.toWei(MINT_PRICE, 'ether'),
    })

    expect(await nftContract.totalSupply()).to.equal(1)
    expect(await nftContract.tokenURI(1)).to.equal(TEST_URI)
  })

  it('Should not be able to mint two at once', async function () {
    const NUM = 2
    let err = null
    try {
      await nftContract.awardItem(NUM, { value: Web3Utils.toWei(NUM * MINT_PRICE, 'ether') })
    } catch (error) {
      err = error
    }
    assert.ok(err instanceof Error)
  })

  it('Should not be able to mint two in sequence for same wallet', async function () {
      // should succeed
    await nftContract.awardItem(1, {
      value: Web3Utils.toWei(MINT_PRICE, 'ether'),
    })

    // should fail because already minted from that wallet
    let err = null
    try {
        await nftContract.awardItem(1, {
          value: Web3Utils.toWei(MINT_PRICE, 'ether'),
        })
    } catch (error) {
      err = error
    }
    assert.ok(err instanceof Error)
  })
})
