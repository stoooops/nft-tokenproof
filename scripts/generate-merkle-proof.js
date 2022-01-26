const { MerkleTree } = require("merkletreejs");
const keccak256 = require('keccak256')

// function hashToken(account) {
//     return Buffer.from(ethers.utils.solidityKeccak256(
//         ['address'],
//         [account],
//     ).slice(1), 'hex');
// }

const allowListAddresses = [
    "0x6F836d79dB63044BBD34BeA6E7E9E6004987A75E",
    "0x30145D714Db337606c8f520bee9a3e3eAC910636",
    "0x2311C8A1C7A31694AdfF5E53A3dD5cd922d806Cb"
]

// leaves, merkleTree, and rootHash are all determined prior to claim.

// Creates a new array 'leafNodes' by hashing all indexes of the allowListAddresses
// using keccak256.
const leafNodes = allowListAddresses.map(addr => keccak256(addr));
console.log(`leafNodes: ${leafNodes}\n`);

// Then create a new Merkle Tree object using keccak256 as the desired hashing algorithm
const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
console.log(`Allowlist Merkle Tree\n${merkleTree}\n`);

// root hash
console.log(`Root Hash: ${merkleTree.getRoot()}\n`);



//////////////////////////////////////////////////////////////////////////
// WEBSITE
//////////////////////////////////////////////////////////////////////////

const claimingAddress = leafNodes[2];
const hexProof = merkleTree.getHexProof(claimingAddress);

console.log(`Merkle Proof for Address ${claimingAddress}\n${hexProof}`)
console.log(hexProof)
// const proof = merkleTree.getHexProof(hashToken(Object.entries(tokens)));
// console.log(`proof: ${proof}`);