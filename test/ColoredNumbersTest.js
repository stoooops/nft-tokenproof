const { expect, assert } = require('chai')
const { ethers, waffle } = require('hardhat')
const Web3Utils = require('web3-utils')

const MINT_PRICE = '0.0001'
const TEST_URI = 'https://test_uri/'

const provider = waffle.provider

describe('ColoredNumbers', function () {
  let addr1, addr2, addr3, addr4
  let FungibleToken
  let ColoredNumbers
  let nftContract
  let erc20Contract

  beforeEach(async function () {
    ;[addr1, addr2, addr3, addr4, _] = await ethers.getSigners()

    ColoredNumbers = await ethers.getContractFactory('ColoredNumbers')
    nftContract = await ColoredNumbers.deploy(TEST_URI)
    await nftContract.deployed()

    FungibleToken = await ethers.getContractFactory('FungibleToken')
    erc20Contract = await FungibleToken.deploy('Test Token', 'TEST', 100)
    await erc20Contract.deployed()
  })

  it('Should have 0 supply after deployment', async function () {
    expect(await nftContract.totalSupply()).to.equal(0)
  })

  it('Should not mint if no value sent', async function () {
    await nftContract.deployed()

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
    expect(await nftContract.tokenURI(1)).to.equal(TEST_URI + '1.json')
  })

  it('Should be able to mint NFT #1, mint TEST token, and sent it to NFT #1', async function () {
    await nftContract.awardItem(1, {
      value: Web3Utils.toWei(MINT_PRICE, 'ether'),
    })

    expect(await erc20Contract.balanceOf(addr1.address)).to.equal(100)
    await erc20Contract.approve(nftContract.address, 100)
  })
})
