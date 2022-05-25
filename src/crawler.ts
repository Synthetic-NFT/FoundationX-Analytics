import { BigNumber, ethers } from "ethers";

const fs = require("fs");

const contractAbi = require("./abi/BoredApeYachtClub.json");
const contractAddress = "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D";
const outputPath = "NFTs/BoredApeYachtClub.txt";
const PAGE_SIZE = 100;

type TokenInfo = {
  tokenId: BigNumber;
  tokenURI: string;
  owner: string;
};

const tokenInfoToTxt = function (tokenInfo: TokenInfo): string {
  return (
    tokenInfo.tokenId.toString() +
    ", " +
    tokenInfo.tokenURI +
    ", " +
    tokenInfo.owner
  );
};

const tokenInfoByIndex = async (
  contract: ethers.Contract,
  index: BigNumber
): Promise<TokenInfo> => {
  const tokenId = await contract.tokenByIndex(index);
  const tokenURI = await contract.tokenURI(tokenId);
  const owner = await contract.ownerOf(tokenId);
  return { tokenId: tokenId, tokenURI: tokenURI, owner: owner };
};

const processing = async (contract: ethers.Contract) => {
  const totalSupply = await contract.totalSupply();
  console.log("Total supply", totalSupply.toString());

  try {
    fs.writeFileSync(outputPath, "");
  } catch (err) {
    console.error(err);
  }

  for (
    let page = BigNumber.from(0);
    page.lt(totalSupply);
    page = page.add(BigNumber.from(PAGE_SIZE))
  ) {
    console.log("Page", page.toString());
    const requests: Array<Promise<TokenInfo>> = [];
    for (
      let i = page;
      i.lt(page.add(PAGE_SIZE));
      i = i.add(BigNumber.from(1))
    ) {
      requests.push(tokenInfoByIndex(contract, i));
    }

    const tokenInfos = await Promise.all(requests);
    try {
      fs.appendFileSync(
        outputPath,
        tokenInfos.map(tokenInfoToTxt).join("\n") + "\n"
      );
    } catch (err) {
      console.error(err);
    }
  }
};

async function main() {
  const provider = ethers.getDefaultProvider(
    "https://eth-mainnet.alchemyapi.io/v2/OcrpQKK0SZ1ym_zDwg1kHUo6Nm3aFKax"
  );
  const contract = new ethers.Contract(contractAddress, contractAbi, provider);
  await processing(contract);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
