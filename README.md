## What this script can
1. Send dmail transaction in specified wallets
2. Check transaction cost and wait for acceptable gas fee
3. Delay between transactions 

## Previous preparation
1. Install [node.js](https://nodejs.org/en/download) if it is not already installed.
2. Clone or download this repo.

## Usage
1. Add wallet data in wallet_data.config.js

For every wallet paste object bellow comma-separated.

Field type it's wallet name: ArgentX 0, Braavos 1
```
 {
    mnemonic: 'phrase phrase phrase phrase phrase',
    type: 0, 
  },
```

2. Edit script configuration in file module.config.js

3. In root folder run
```
npm start
```
