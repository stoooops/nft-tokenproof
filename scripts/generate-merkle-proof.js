const { MerkleTree } = require("merkletreejs");
const keccak256 = require('keccak256')

const fs = require('fs');
let rawdata = fs.readFileSync('./allowlists/test_allowlist.json');
const allowListAddresses = JSON.parse(rawdata);

// leaves, merkleTree, and rootHash are all determined prior to claim.

// Creates a new array 'leafNodes' by hashing all indexes of the allowListAddresses
// using keccak256.
const leafNodes = allowListAddresses.map(addr => keccak256(addr));
console.log("LeafNodes: addr --> keccak256(addr)");
for (let i = 0; i < leafNodes.length; i++) {
    console.log(`${allowListAddresses[i]} --> ${leafNodes[i].toString('hex')}`)
}
console.log();

// Then create a new Merkle Tree object using keccak256 as the desired hashing algorithm
const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
console.log(`Allowlist Merkle Tree\n${merkleTree}\n`);

// root hash
console.log(`Root Hash: ${merkleTree.getRoot().toString('hex')}\n`);


//////////////////////////////////////////////////////////////////////////
// WEBSITE
//////////////////////////////////////////////////////////////////////////


const claimAddress = "0x5652140Ad99f6Fc9241d122Cc376E4Af2Ac4242f";
console.log(`claimAddress: ${claimAddress}`)
const index = allowListAddresses.indexOf(claimAddress);
if (index < 0) {
    throw Error(`Unknown claim address: ${claimAddress}`)
}

const keccakClaimAddress = keccak256(claimAddress);
const hexProof = merkleTree.getHexProof(keccakClaimAddress);

console.log(hexProof)
console.log()
console.log(`Claim Address:  ${claimAddress}`)
console.log(`keccak256 leaf: ${keccakClaimAddress.toString('hex')}`)
console.log(`Merkle Proof:   ${hexProof}`)


