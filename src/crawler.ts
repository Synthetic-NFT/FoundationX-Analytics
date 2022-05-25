// Example usage
// npx ts-node src/crawler.ts Otherdeed NFTs/Otherdeed.txt

import { BigNumber, ethers } from "ethers";

const fs = require("fs");

const PAGE_SIZE = 1000;
const N_RETRY = 2;
const SLEEP_TIME = 10; // s

const contractInfos = new Map<string, [string, string]>([
  [
    "BoredApeYachtClub",
    [
      require("./abi/BoredApeYachtClub.json"),
      "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    ],
  ],
  [
    "MutantApeYachtClub",
    [
      require("./abi/MutantApeYachtClub.json"),
      "0x60E4d786628Fea6478F785A6d7e704777c86a7c6",
    ],
  ],
  [
    "Otherdeed",
    [
      require("./abi/Otherdeed.json"),
      "0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258",
    ],
  ],
]);

type TokenInfo = {
  tokenId: BigNumber;
  tokenURI: string;
};

const sleep = (s: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
};

const tokenInfoToTxt = function (tokenInfo: TokenInfo): string {
  return tokenInfo.tokenId.toString() + ", " + tokenInfo.tokenURI;
};

const tokenInfoByIndex = async (
  contract: ethers.Contract,
  index: BigNumber
): Promise<TokenInfo> => {
  const tokenId = await contract.tokenByIndex(index);
  const tokenURI = await contract.tokenURI(tokenId);
  return { tokenId: tokenId, tokenURI: tokenURI };
};

const processing = async (
  contract: ethers.Contract,
  startPage: BigNumber,
  outputPath: string
) => {
  const totalSupply = await contract.totalSupply();
  console.log("Total supply", totalSupply.toString());

  if (startPage.eq(BigNumber.from(0))) {
    fs.writeFileSync(outputPath, "");
  }

  for (
    let page = startPage;
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
      if (i.gte(totalSupply)) break;
      requests.push(tokenInfoByIndex(contract, i));
    }

    let tokenInfos: Array<TokenInfo> = [];
    for (let retry = 0; retry < N_RETRY; retry++) {
      try {
        tokenInfos = await Promise.all(requests);
        break;
      } catch (err) {
        if (retry === N_RETRY - 1) {
          throw err;
        } else {
          await sleep(SLEEP_TIME);
          console.log("Retrying after sleeping ...");
        }
      }
    }

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
  // @ts-ignore
  const args = process.argv.slice(2);
  const token = args[0];
  const startPage = BigNumber.from(args[1]);
  const outputPath = args[2];
  // @ts-ignore
  const contractInfo: [string, string] = contractInfos.get(token);
  const contract = new ethers.Contract(
    contractInfo[1],
    contractInfo[0],
    provider
  );
  await processing(contract, startPage, outputPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
