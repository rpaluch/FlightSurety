var Test = require('../config/testConfig.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
    });
    const fundingFee = web3.utils.toWei("10", "ether");

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, {from: config.testAddresses[2]});
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        } catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
        let newAirline = accounts[2];
        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSuretyData.isAirline.call(newAirline);
        } catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it(`(multiparty) first airline is registered when contract is deployed`, async function () {
        let isAirline = await config.flightSuretyData.isAirline.call(config.firstAirline);
        assert.equal(isAirline, true, "First airline is not registered");

        let isFunded = await config.flightSuretyData.isFundedAirline.call(config.firstAirline);
        assert.equal(isFunded, false, "First airline is expected not to be funded");
    });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

        // ARRANGE
        let newAirline = accounts[2];

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "Duo Airlines", {from: config.firstAirline});
        } catch (e) {
        }
        let result = await config.flightSuretyData.isAirline.call(newAirline);


        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

    });

    it('(airline) is funded after sending 10 ETH as funding fee', async () => {
        const airline = config.firstAirline;
        let isFunded = await config.flightSuretyData.isFundedAirline.call(airline);
        assert.equal(isFunded, false, "Airline should not be funded initially");
        try {
            await config.flightSuretyApp.fund({value: fundingFee, from: airline});
        } catch (e) {
        }

        isFunded = await config.flightSuretyData.isFundedAirline.call(airline);
        assert.equal(isFunded, true, "Airline should be funded");

    });

    it('(airline) can register another airline using registerAirline() if it is funded', async () => {
        // ARRANGE
        const fundedAirline = config.firstAirline;
        const newAirline = accounts[2];
        const newAirline2 = accounts[3];
        const newAirline3 = accounts[4];

        // PREREQUISITES
        const isFunded = await config.flightSuretyData.isFundedAirline.call(fundedAirline);
        assert.equal(isFunded, true, "Airline should be funded");

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "Up In The Air", {from: fundedAirline});
            await config.flightSuretyApp.registerAirline(newAirline2, "Sky Is The Limit", {from: fundedAirline});
            await config.flightSuretyApp.registerAirline(newAirline3, "Flyer", {from: fundedAirline});
        } catch (e) {
        }
        const registered1 = await config.flightSuretyData.isAirline.call(newAirline);
        const registered2 = await config.flightSuretyData.isAirline.call(newAirline2);
        const registered3 = await config.flightSuretyData.isAirline.call(newAirline3);
        const result = registered1 && registered2 && registered3;
        // ASSERT
        assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");

        // FUND CREATED AIRLINES
        await config.flightSuretyApp.fund({value: fundingFee, from: newAirline});
        const isFunded2 = await config.flightSuretyData.isFundedAirline.call(newAirline);
        assert.equal(isFunded2, true, "Airline 2 should be funded");

        await config.flightSuretyApp.fund({value: fundingFee, from: newAirline2});
        const isFunded3 = await config.flightSuretyData.isFundedAirline.call(newAirline2);
        assert.equal(isFunded3, true, "Airline 3 should be funded");

        await config.flightSuretyApp.fund({value: fundingFee, from: newAirline3});
        const isFunded4 = await config.flightSuretyData.isFundedAirline.call(newAirline3);
        assert.equal(isFunded4, true, "Airline 4 should be funded");
    });

    it('(airline) 5th airline can only be registered when more than 50% of funded arilines vote for it', async () => {
        // ARRANGE
        const airline1 = accounts[1];
        const airline2 = accounts[2];
        const airline3 = accounts[3];
        const newAirline = accounts[5];

        // PREREQUISITES
        const airlinesCount = await config.flightSuretyData.airlinesCount.call();
        assert.equal(airlinesCount, 4, "4 airlines should be registered");

        // 1st vote
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "My Airline", {from: airline1});
        } catch (e) {
        }
        let registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(registered, false, "New airline should not be registered until >50% of other airlines vote for it");

        // 2nd vote
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "My Airline", {from: airline2});
        } catch (e) {
        }
        registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(registered, false, "New airline should not be registered until >50% of other airlines vote for it");

        // 3rd vote
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "My Airline", {from: airline3});
        } catch (e) {
        }
        registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(registered, true, "New airline should be registered after >50% of other airlines vote for it");
    });

    it('(airline) airline that is not funded does not participate in the contract', async () => {
        // ARRANGE
        const airline1 = accounts[1];
        const airline2 = accounts[2];
        const airline3 = accounts[3];
        const notFundedAirline = accounts[5];
        const newAirline = accounts[6];

        // PREREQUISITES
        const airlinesCount = await config.flightSuretyData.airlinesCount.call();
        assert.equal(airlinesCount, 5, "5 airlines should be registered");

        // 1st vote
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "Other Airline", {from: airline1});
        } catch (e) {
        }
        let registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(registered, false, "New airline should not be registered until >50% of other airlines vote for it");

        // 2nd vote
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "Other Airline", {from: airline2});
        } catch (e) {
        }
        registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(registered, false, "New airline should not be registered until >50% of other airlines vote for it");

        // 3rd vote - not funded airline
        let exceptionCaught = false;
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "Other Airline", {from: notFundedAirline});
        } catch (e) {
            exceptionCaught = true;
        }
        registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(exceptionCaught, true, "Should raise exception when not funded airline votes");
        assert.equal(registered, false, "Not funded airline should not effectively participate in voting");

        // 4th vote
        try {
            await config.flightSuretyApp.registerAirline(newAirline, "Other Airline", {from: airline3});
        } catch (e) {
        }
        registered = await config.flightSuretyData.isAirline.call(newAirline);
        assert.equal(registered, true, "New airline should be registered after >50% of other airlines vote for it");
    });


    it('(airline) can register a flight', async () => {
        const airline = config.firstAirline;
        let flightsCount = await config.flightSuretyApp.flightsCount.call();
        assert.equal(flightsCount, 0, "There should be no flights registered initially");
        try {
            await config.flightSuretyApp.registerFlight(airline, 'FL123', Date.now(), {from: airline});
        } catch (e) {
        }

        flightsCount = await config.flightSuretyApp.flightsCount.call();
        assert.equal(flightsCount, 1, "Registered flight should increase flights count");
    });

    it('(passenger) can buy insurance for existing flight', async () => {
        const airline = accounts[2];
        const passenger = accounts[7];
        const flight = 'FL900';
        const flightTimestamp = Date.now();

        try {
            await config.flightSuretyApp.registerFlight(airline, flight, flightTimestamp, {from: airline});
        } catch (e) {
        }
        const premium = web3.utils.toWei("1", "ether");

        let purchased = true;
        try {
            await config.flightSuretyApp.buy(airline, flight, flightTimestamp, {value: premium, from: passenger});
        } catch (e) {
            purchased = false;
        }
        assert.equal(purchased, true, "An error occured when buying insurance");
        try {
            await config.flightSuretyApp.buy(airline, flight, flightTimestamp, {value: premium, from: passenger});
        } catch (e) {
            purchased = false;
        }
        assert.equal(purchased, false, "Buying double insurance for the same flight should not be allowed");
    });

    it('(passenger) cannot buy insurance with premium > 1 ETH', async () => {
        const airline = accounts[3];
        const passenger = accounts[7];
        const flight = 'FL901';
        const flightTimestamp = Date.now();

        try {
            await config.flightSuretyApp.registerFlight(airline, flight, flightTimestamp, {from: airline});
        } catch (e) {
        }
        const premium = web3.utils.toWei("1.01", "ether");

        let purchased = true;
        try {
            await config.flightSuretyApp.buy(airline, flight, flightTimestamp, {value: premium, from: passenger});
        } catch (e) {
            purchased = false;
        }
        assert.equal(purchased, false, "Insurance should not be purchased");
    });

    it('(passenger) cannot buy insurance for unregistered flight', async () => {
        const airline = accounts[4];
        const passenger = accounts[7];
        const flight = 'FL902';
        const flightTimestamp = Date.now() + 1000;
        const premium = web3.utils.toWei("1", "ether");

        let purchased = true;
        try {
            await config.flightSuretyApp.buy(airline, flight, flightTimestamp, {value: premium, from: passenger});
        } catch (e) {
            purchased = false;
        }
        assert.equal(purchased, false, "Insurance should not be purchased");
    });
});
