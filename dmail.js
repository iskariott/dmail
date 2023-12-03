const { Account, CallData } = require('starknet');
const {
  encoder,
  hashString,
  getVersion,
  getPKeyFromMnemonicArgent,
  getPKeyFromMnemonicBraavos,
  getRandomString,
  c,
  cliCountDown,
  getRandomBtwInterval,
} = require('./utils.js');
const { ALLOWED_FEE, TX_AMNT, DELAY_TX } = require('./module.config.js');
const readline = require('readline');

function waitForGas(account, txPayload, ethPrice) {
  console.log(`${c.dim('Waiting for gas...')}`);
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
      updateLine(` Fee ${c.yel(fee.toFixed(4))}$`);
      if (fee && fee <= ALLOWED_FEE) {
        clearInterval(timer);
        updateLine('', true);
        r();
      }
    }, 60000);
  });
}

async function send(walletData, provider, ethPrice, idx) {
  let pkey = '';
  if (!walletData.type) {
    pkey = await getPKeyFromMnemonicArgent(walletData.mnemonic);
  } else {
    pkey = await getPKeyFromMnemonicBraavos(walletData.mnemonic);
  }
  const cairoVersion = await getVersion(provider, walletData.address);
  const account = new Account(provider, walletData.address, pkey, cairoVersion);
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

  let rndTxCount = getRandomBtwInterval(1, TX_AMNT);
  while (rndTxCount) {
    const { overall_fee } = await account.estimateInvokeFee(txPayload);

    let fee = (parseInt(overall_fee) / Math.pow(10, 18)) * ethPrice;
    if (fee > ALLOWED_FEE) {
      await waitForGas(account, txPayload, ethPrice);
    }
    const executeHash = await account.execute(txPayload);
    // const executeHash = {
    //   transaction_hash: '0x3742bece310bea74019a94767dcb92263cac679e7419113adc055b563addefc',
    // };
    console.log(`${idx}. Transaction sent. Hash: ${c.blu(executeHash.transaction_hash)}`);
    console.log(c.dim('Waiting for finishing...'));

    while (executeHash.transaction_hash) {
      try {
        const { execution_status: status, actual_fee: fee } = await provider.getTransactionReceipt(
          executeHash.transaction_hash,
        );
        const strFee = `fee: ${c.yel(
          ((parseInt(fee) / Math.pow(10, 18)) * ethPrice).toFixed(2) + '$',
        )}`;
        const strStatus = status === 'SUCCEEDED' ? `${c.grn(status)}` : `${c.red(status)}`;
        console.log(`${strFee} # status: ${strStatus}`);
        break;
      } catch (error) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    rndTxCount--;
    if (rndTxCount) await cliCountDown(getRandomBtwInterval(DELAY_TX[0], DELAY_TX[1]));
  }
}

module.exports = {
  send,
};
