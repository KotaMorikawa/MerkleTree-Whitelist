const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

function encodeLeaf(address, spots) {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint64"],
    [address, spots]
  );
}

describe("Merkle Trees", async function () {
  it("Should be able to verify if address is in Whitelist or not", async function () {
    const testAddresses = await ethers.getSigners();

    const list = [
      encodeLeaf(testAddresses[0].address, 2),
      encodeLeaf(testAddresses[1].address, 2),
      encodeLeaf(testAddresses[2].address, 2),
      encodeLeaf(testAddresses[3].address, 2),
      encodeLeaf(testAddresses[4].address, 2),
      encodeLeaf(testAddresses[5].address, 2),
    ];

    const merkleTree = new MerkleTree(list, keccak256, {
      hashLeaves: true,
      sortPairs: true,
      sortLeaves: true,
    });

    const root = merkleTree.getHexRoot();

    const whitelist = await ethers.deployContract("Whitelist", [root]);
    await whitelist.waitForDeployment();

    for (let i = 0; i < list.length; i++) {
      const leaf = keccak256(list[i]);
      const proof = merkleTree.getHexProof(leaf);
      const connectedWhitelist = whitelist.connect(testAddresses[i]);
      const verified = await connectedWhitelist.checkInWhitelist(proof, 2);
      expect(verified).to.equal(true);
    }

    const invalidCase_1 = await whitelist.checkInWhitelist([], 2);
    expect(invalidCase_1).to.equal(false);

    const fraudLeaf = keccak256(list[0]);
    const fraudProof = merkleTree.getHexProof(fraudLeaf);
    const connectedWhitelist_2 = whitelist.connect(testAddresses[0]);
    const invalidCase_2 = await connectedWhitelist_2.checkInWhitelist(
      fraudProof,
      3
    );
    expect(invalidCase_2).to.equal(false);
  });
});
