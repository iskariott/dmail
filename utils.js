const { HDNodeWallet, Wallet } = require('ethers');
const { ec, CallData, hash, num } = require('starknet');
const { mnemonicToSeedSync } = require('@scure/bip39');
const { HDKey } = require('@scure/bip32');
const { sha256 } = require('ethers');
const readline = require('readline');
const XLSX = require('xlsx');

async function getETHPrice() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
  );
  return response.json().then((r) => r.ethereum.usd);
}

function getRandomString() {
  const length = Math.floor(Math.random() * 7 + 4);
  return Array(length)
    .fill('')
    .map(() => Math.random().toString(36).charAt(2))
    .join('');
}

function encoder(message) {
  if ('' === message) return '';
  let t = [];
  t.push('0x');
  for (let n = 0; n < message.length; n++) t.push(message.charCodeAt(n).toString(16));
  return t.join('');
}

function hashString(str) {
  return sha256(encoder(str)).slice(2);
}

function toHexString(value) {
  let hex = BigInt(value).toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  return '0x' + hex;
}

async function getVersion(provider, address) {
  const targetHash = '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003';
  const classHash = await provider.getClassHashAt(address);
  if (classHash !== targetHash) {
    return '0';
  } else {
    return '1';
  }
}

async function getPKeyFromMnemonicArgent(mnemonic) {
  try {
    const signer = Wallet.fromPhrase(mnemonic).privateKey;
    const masterNode = HDNodeWallet.fromSeed(toHexString(signer));
    const childNode = masterNode.derivePath("m/44'/9004'/0'/0/0");

    return '0x' + ec.starkCurve.grindKey(childNode.privateKey).toString();
  } catch (e) {
    console.log(e);
    throw new Error(e);
  }
}

async function getPKeyFromMnemonicBraavos(mnemonic) {
  const seed = mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const hdKeyDerived = hdKey.derive("m/44'/9004'/0'/0/0");

  return '0x' + ec.starkCurve.grindKey(hdKeyDerived.privateKey);
}

async function getBraavosAddress(privateKey) {
  const braavosProxyClassHash =
    '0x03131fa018d520a037686ce3efddeab8f28895662f019ca3ca18a626650f7d1e';
  const braavosInitialClassHash =
    '0x5aa23d5bb71ddaa783da7ea79d405315bafa7cf0387a74f4593578c3e9e6570';
  const calculateInitializer = (publicKey) => {
    return CallData.compile({ public_key: publicKey });
  };

  const buildProxyConstructorCallData = (initializer) => {
    return CallData.compile({
      implementation_address: braavosInitialClassHash,
      initializer_selector: hash.getSelectorFromName('initializer'),
      calldata: [...initializer],
    });
  };

  const publicKey = ec.starkCurve.getStarkKey(num.toHex(privateKey));
  const initializer = calculateInitializer(publicKey);
  const proxyConstructorCallData = buildProxyConstructorCallData(initializer);

  return hash.calculateContractAddressFromHash(
    publicKey,
    braavosProxyClassHash,
    proxyConstructorCallData,
    0,
  );
}

async function getArgentAddress(key) {
  const argentProxyClassHash = '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918';
  const argentAccountClassHash =
    '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2';

  const publicKey = ec.starkCurve.getStarkKey(key);
  const AXproxyConstructorCallData = CallData.compile({
    implementation: argentAccountClassHash,
    selector: hash.getSelectorFromName('initialize'),
    calldata: CallData.compile({ signer: publicKey, guardian: '0' }),
  });

  return hash.calculateContractAddressFromHash(
    publicKey,
    argentProxyClassHash,
    AXproxyConstructorCallData,
    0,
  );
}

function cliCountDown(time_s) {
  return new Promise((resolve) => {
    function updateLine(content, finished = false) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      !finished && process.stdout.write(`\x1b[32mDelay: ${content}s\x1b[0m`);
    }

    updateLine(time_s);
    let timer = setInterval(() => {
      time_s -= 1;

      if (time_s <= 0) {
        clearInterval(timer);
        updateLine(0, true);
        resolve();
      } else {
        updateLine(time_s);
      }
    }, 1000);
  });
}

function excelToArray() {
  try {
    const resp = XLSX.readFile('./wallet_data.config.xlsx', { type: 'buffer' });
    const data = resp.Sheets.list1;
    return Object.keys(data).flatMap((key) => {
      if (key.slice(0, 1) === 'A') {
        const rowId = key.slice(1);
        const type = data['B' + rowId].v === 'argent' ? 0 : 1;
        return { mnemonic: data[key].v, type };
      } else return [];
    });
  } catch (e) {
    throw e;
  }
}

module.exports = {
  getBraavosAddress,
  getArgentAddress,
  encoder,
  hashString,
  toHexString,
  getVersion,
  getPKeyFromMnemonicBraavos,
  getPKeyFromMnemonicArgent,
  getRandomString,
  cliCountDown,
  excelToArray,
  getETHPrice,
};
