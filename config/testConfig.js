
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0xf2Eb8C60f21F7A2533BE36b712FF401B92A78Ee7",
        "0x7Bc41c7cAD8dA14EBF98b3331584E5cE7099b6B3",
        "0x380e85b9F26b62f307756CadFCb85896F6105989",
        "0x0410C8C5f75E0E1D1d8120370ac7865f710B11F3",
        "0x37261e329C6D94Ad64C4368C1B6067439b627089",
        "0x5d08E010ea07e0dc6500aDF7f221F454b8f123EF",
        "0x10f4F5fdd22C4F6602688e4bCf04e72966164362",
        "0xF7314AAEB9573f9725be7dDc6F40B05CD5e11816",
        "0xE2239BB13C1A7a9Fa17B82210DE37c9eC7787F2a"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.deployed();
    let flightSuretyApp = await FlightSuretyApp.deployed();

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
};

module.exports = {
    Config: Config
};