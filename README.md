# tokenproof Founder's Circle
tokenproof Founder's Circle is an ERC-721 NFT.

Website: https://tokenproof.xyz/

Twitter: https://twitter.com/tokenproof

# ERC-721 Specifications
- Name: "tokenproof Founders Circle"
- Symbol: TKPFC
- 5,000 supply
- free allowlist
- max one free claim per address

# Deploy
```
# deploy contract
npx hardhat run scripts/deploy.js --network ropsten --verbose

# verify source code on Etherscan
# seems to always require clean/compile
npx hardhat clean
npx hardhat compile
npx hardhat verify <contract_addr> "ipfs://QmV7yYX4BdWttXaAdBbPAPikyZFYfxDrhpkbLiLHMB8mwd" --network ropsten
```
