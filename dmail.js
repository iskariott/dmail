const { Account, CallData } = require('starknet');
const {
  encoder,
  hashString,
  getVersion,
  getArgentAddress,
  getPKeyFromMnemonicArgent,
  getPKeyFromMnemonicBraavos,
  getBraavosAddress,
  getRandomString,
} = require('./utils.js');
const { ALLOWED_FEE } = require('./module.config.js');
const readline = require('readline');

function waitForGas(account, txPayload, ethPrice) {
  console.log('\x1b[90mWaiting for gas...\x1b[0m');
  const updateLine = (content, finish = false) => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    !finish && process.stdout.write(content);
  };
  return new Promise((r) => {
    let fee;
    let timer = setInterval(async () => {
      const { overall_fee } = await account.estimateInvokeFee(txPayload);
      fee = (parseInt(overall_fee) / Math.pow(10, 18)) * ethPrice;
      updateLine(`\x1b[90mFee ${fee.toFixed(4)}$\x1b[0m`);
      if (fee && fee <= ALLOWED_FEE) {
        clearInterval(timer);
        updateLine('', true);
        r();
      }
    }, 60000);
  });
}

async function send(walletData, provider, ethPrice) {
  let pkey = '';
  let wallet = '';
  console.log('walletData = ', walletData);
  if (!walletData.type) {
    pkey = await getPKeyFromMnemonicArgent(walletData.mnemonic);
    wallet = await getArgentAddress(pkey);
  } else {
    pkey = await getPKeyFromMnemonicBraavos(walletData.mnemonic);
    wallet = await getBraavosAddress(pkey);
  }
  const cairoVersion = await getVersion(provider, wallet);
  const account = new Account(provider, wallet, pkey, cairoVersion);

  const to = encoder(hashString(`${getRandomString()}@${getRandomString()}.com`)).substring(0, 65);
  const theme = encoder(hashString(getRandomString())).substring(0, 65);

  const txPayload = {
    contractAddress: '0x0454f0bd015e730e5adbb4f080b075fdbf55654ff41ee336203aa2e1ac4d4309',
    entrypoint: 'transaction',
    calldata: CallData.compile({
      to,
      theme,
    }),
  };

  const { overall_fee } = await account.estimateInvokeFee(txPayload);

  let fee = (parseInt(overall_fee) / Math.pow(10, 18)) * ethPrice;
  if (fee > ALLOWED_FEE) {
    await waitForGas(account, txPayload, ethPrice);
  }
  const executeHash = await account.execute(txPayload);
  return await provider.getTransactionReceipt(executeHash.transaction_hash);
  // const testhash = '0x04b419c08722e0917bb6190f6f906fc2a4e12ca1ddbc8db40632d29ea4620f47';
  // return await provider.getTransactionReceipt(testhash);
}

module.exports = {
  send,
};
