const { RpcProvider } = require('starknet');
const { DELAY, ACC_NUMBERS, READ_DATA_TYPE } = require('./module.config.js');
const { getETHPrice, cliCountDown, excelToArray, c } = require('./utils.js');
const { send } = require('./dmail.js');

(async () => {
  const provider = new RpcProvider({ nodeUrl: 'https://starknet-mainnet.public.blastapi.io' });
  const ethPrice = await getETHPrice();
  let wallet_data;
  try {
    if (READ_DATA_TYPE) {
      wallet_data = excelToArray();
    } else {
      wallet_data = require('./wallet_data.config.js');
    }
    for (let i = 0; i < ACC_NUMBERS.length; i++) {
      if (ACC_NUMBERS[i] > wallet_data.length) {
        console.log('You dont have account with number ', ACC_NUMBERS[i], ' . Skipped...');
        continue;
      }
      const {
        transaction_hash: hash,
        execution_status: status,
        actual_fee: fee,
      } = await send(wallet_data[ACC_NUMBERS[i]], provider, ethPrice);

      const strHash = `hash: ${c.blu(hash)}`;
      const strFee = `fee: ${c.yel(((parseInt(fee) / Math.pow(10, 18)) * ethPrice).toFixed(2))}$`;
      const strStatus = status === 'SUCCEEDED' ? `${c.grn(status)}` : `${c.red(status)}`;
      console.log(`${c.yel(ACC_NUMBERS[i])}. ${strHash} / ${strFee} / status: ${strStatus}`);

      await cliCountDown(Math.floor(Math.random() * (DELAY[1] - DELAY[0] + 1) + DELAY[0]));
    }
  } catch (error) {
    console.log(error);
  }
})();
