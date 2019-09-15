# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder

## Used test mnemonic
`embody february bronze ecology renew impulse female pool picnic mean accuse flush`

## How to run DApp
In my implementation DApp has dependency on the tests to initialize the data (e.g. create initial group of airlines and register flights). In order to use DApp run in following order:
1. `truffle migrate`
2. `npm run test`
3. `npm run server`
4. `npm run dapp`

When interacting with DApp, "log" are of the page will display key events. When oracles interaction is involved, server's console will provide more details about what is happening in the background.

**Known issues**: DApp registers flights with server API on start up. This however may cause issues with flight dropdowns not being populated on the first page load. If that happens, reload the page.

## Software versions
* **Truffle**: v5.0.24 (core: 5.0.24)
* **Solidity**: ^0.4.24 (solc-js)
* **Node**: v10.14.1
* **Web3.js**: v1.0.0-beta.37

## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)