import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import abiDecoder from 'abi-decoder';

const API_BASE_URL = 'http://localhost:3000/api/';
const AIRLINE_NAMES = [
    'Fly First',
    'Up In The Air',
    'Sky Is The Limit',
    'Flyer',
    'My Airline'
];

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            let self = this;
            self.owner = accts[0];

            let counter = 1;

            while(self.airlines.length < 5) {
                const address = accts[counter];
                const name = AIRLINE_NAMES[counter - 1];
                this.airlines.push(accts[counter++]);

                try {
                    self.flightSuretyApp.methods
                        .registerAirline(address, name)
                        .call()
                } catch (err) {
                }

                Contract.postData(API_BASE_URL + 'airlines', {
                    airline: {
                        address,
                        name
                    }
                }).then(data => {})
                  .catch(error => console.error(error));
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }
            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flightData, callback) {
        let self = this;
        let payload = flightData;
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner, gasLimit: 300000}, (error, result) => {
                callback(error, payload);
            });
    }

    registerAirline(sourceAirline, address, name, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(address, name)
            .send({ from: sourceAirline, gasLimit: 300000}, (error, result) => {
                callback(error, result);
            });
    }

    fundAirline(airline, amount, callback) {
        let self = this;
        let amountWei = self.web3.utils.toWei(amount, "ether");
        self.flightSuretyApp.methods
            .fund()
            .send({ from: airline, value: amountWei}, (error, result) => {
                callback(error, {airline, amount});
            });
    }

    buyInsurance(passengerAddress, flightData, premium, callback) {
        let self = this;
        let amountWei = self.web3.utils.toWei(premium, "ether");
        self.flightSuretyApp.methods
            .buy(flightData.airline, flightData.flight, flightData.timestamp)
            .send({ from: passengerAddress, value: amountWei, gasLimit: 300000}, (error, result) => {
                callback(error, {passengerAddress, flightData, premium});
            });
    }

    withdrawClaims(passenger, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .withdrawClaims()
            .send({ from: passenger}, (error, result) => {
                callback(error, {});
            });
    }

    static postData(url, data) {
        return fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            //mode: 'no-cors',
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data),
        })
    }
}