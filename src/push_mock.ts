import { BigNumber, ethers } from "ethers";

const fs = require("fs");

const OWNER_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const NFTAbi = require("./abi/contracts/mocks/MockNFT.sol/MockNFT.json");
const TOP_N = 1000;
const BATCH_SIZE = 200;

type ContractInfo = {
  name: string;
  address: string;
  uriPath: string;
};

const contractInfos: Array<ContractInfo> = [
  {
    name: "BoredApeYachtClub",
    address: "0x2eE3380Cd4513cCECfc5853A80ECBA9debfE87Fa",
    uriPath: "NFTs/BoredApeYachtClub.txt",
  },
  {
    name: "MutantApeYachtClub",
    address: "0xEF0eaA3F9416235548B27dD80B179C8C0273e4a6",
    uriPath: "NFTs/MutantApeYachtClub.txt",
  },
  {
    name: "Otherdeed",
    address: "0xF85bb4e678466Fa402A1664cC84f3373faeE992C",
    uriPath: "NFTs/Otherdeed.txt",
  },
];

const processing = async (
  provider: ethers.providers.Provider,
  signer: ethers.Wallet,
  contractInfos: Array<ContractInfo>
) => {
  for (const contractInfo of contractInfos) {
    console.log(contractInfo.name);
    const lines = fs
      .readFileSync(contractInfo.uriPath, { encoding: "utf8", flag: "r" })
      .split("\n")
      .slice(0, TOP_N);
    const tokenIds: Array<BigNumber> = [];
    const tokenURIs: Array<string> = [];
    for (const line of lines) {
      if (line === "") continue;
      const [tokenId, tokenURI] = line.split(", ");
      tokenIds.push(BigNumber.from(tokenId));
      tokenURIs.push(tokenURI);
    }
    const NFT = new ethers.Contract(contractInfo.address, NFTAbi, provider);
    // eslint-disable-next-line camelcase
    for (let startI = 0; startI < TOP_N; startI += BATCH_SIZE) {
      console.log(startI);
      const endI = Math.min(startI + BATCH_SIZE, TOP_N);
      const tx = await NFT.connect(signer).batchSetTokenURI(
        tokenIds.slice(startI, endI),
        tokenURIs.slice(startI, endI)
      );
      await tx.wait();
    }
  }
};

async function main() {
  const provider = ethers.getDefaultProvider("http://127.0.0.1:8545/");
  const signer = new ethers.Wallet(OWNER_PRIVATE_KEY).connect(provider);
  await processing(provider, signer, contractInfos);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
