const { RpcProvider } = require('starknet');
const { ACC_NUMBERS, READ_DATA_TYPE, DELAY_ACC } = require('./module.config.js');
const {
  getETHPrice,
  cliCountDown,
  excelToArray,
  c,
  shuffle,
  getRandomBtwInterval,
} = require('./utils.js');
const { send } = require('./dmail.js');

(async () => {
  const provider = new RpcProvider({ nodeUrl: 'https://starknet-mainnet.public.blastapi.io' });
  const ethPrice = await getETHPrice();
  let wallet_data;

  if (READ_DATA_TYPE) {
    wallet_data = excelToArray();
  } else {
    wallet_data = require('./wallet_data.config.js');
  }

  const acc = shuffle(ACC_NUMBERS);
  for (let i = 0; i < acc.length; i++) {
    try {
      if (acc[i] > wallet_data.length) {
        console.log('You dont have account with number ', acc[i], ' . Skipped...');
        continue;
      }
      await send(wallet_data[acc[i]], provider, ethPrice, acc[i]);

      await cliCountDown(getRandomBtwInterval(DELAY_ACC[0], DELAY_ACC[1]));
    } catch (error) {
      console.log(error);
    }
  }
})();
