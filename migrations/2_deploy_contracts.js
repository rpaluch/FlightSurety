const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');
const truffleAssert = require('truffle-assertions');

module.exports = function (deployer) {

    const firstAirline = {
        address: '0x7Bc41c7cAD8dA14EBF98b3331584E5cE7099b6B3',
        name: 'Fly First'
    };
    deployer.deploy(FlightSuretyData)
        .then(() => {
            return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
                .then(async () => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    };
                    console.log('Deployment address (data): ' + FlightSuretyData.address);
                    console.log('Deployment address (app): ' + FlightSuretyApp.address);
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');

                    // authorize FlightSuretyApp to call FlightSuretyData
                    let flightSuretyData = await FlightSuretyData.deployed();
                    flightSuretyData.authorizeCaller(FlightSuretyApp.address);

                    // register first airline
                    let flightSuretyApp = await FlightSuretyApp.deployed();
                    flightSuretyApp.registerFirstAirline(firstAirline.address, firstAirline.name);
                });
        });
}