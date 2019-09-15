"use strict";

import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import 'babel-polyfill';
import fs from 'fs';
import cors from 'cors';

const NUMBER_OF_ORACLES = 50;
const RESERVED_ACCOUNTS = 11;
const ORACLES_FILE_PATH = './oracles.json';
const FLIGHT_STATUS_CODES = [
    10,
    20,
    30,
    40,
    50,
];

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const fee = web3.utils.toWei("1", "ether");

let oracles = [];
let accounts = [];
const airlines = [];
const flights = [];
const passengers = [];

async function initialize() {
    accounts = await web3.eth.getAccounts();
    web3.eth.defaultAccount = accounts[0];

    let oraclesJson;
    try {
        const oraclesJsonFile = fs.readFileSync(ORACLES_FILE_PATH, 'utf8');
        oraclesJson = oraclesJsonFile && JSON.parse(oraclesJsonFile);
    } catch (err) {
    }

    if(oraclesJson && oraclesJson.oracles && oraclesJson.oracles.length === NUMBER_OF_ORACLES) {
        console.log('Using already registered oracles...');
        oracles = oraclesJson.oracles;
    } else {
        console.log('Registering new oracles...');
        for(let i = RESERVED_ACCOUNTS; i < RESERVED_ACCOUNTS + NUMBER_OF_ORACLES; i++) {
            const oracleAddress = accounts[i];
            try {
                await flightSuretyApp.methods
                    .registerOracle()
                    .send({from: accounts[i], value: fee, gas:3000000 });
            } catch(err) {
                continue;
            }
            let indexes;
            try {
                indexes = await flightSuretyApp.methods
                    .getMyIndexes()
                    .call({from: accounts[i]});
            } catch (err) {
                continue;
            }

            oracles.push({
                address: oracleAddress,
                indexes
            });
        }

        fs.writeFile(ORACLES_FILE_PATH, JSON.stringify({oracles}), function(err) {
            if (err) {
                console.log(err);
            }
        });
    }
    console.log("Oracles data:");
    oracles.forEach(oracle => {
        const {address, indexes} = oracle;
        console.log(`${address}: ${indexes}`);
    })
}
initialize();

function generateOracleResponse() {
    return FLIGHT_STATUS_CODES[Math.floor((Math.random() * FLIGHT_STATUS_CODES.length))];
}

function processRequest(index, airline, flight, timestamp) {
    console.log(`Processing requrest by oracles with index ${index}...`);
    oracles.forEach(async oracle => {
        if(oracle.indexes.includes(index)) {
            const status = generateOracleResponse();
            try {
                await flightSuretyApp.methods
                    .submitOracleResponse(index, airline, flight, timestamp, status)
                    .send({from: oracle.address, gasLimit: 300000});
            } catch(err) {
                console.log(err);
            }
        }
    })
}

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, async function (error, event) {
    if (error) console.log(error);
    if(event && event.returnValues) {
        const {index, airline, flight, timestamp} = event.returnValues;
        processRequest(index, airline, flight, timestamp);
    }
});

flightSuretyApp.events.ReceivedAirlineVote({
    fromBlock: 0
}, async function (error, event) {
    if (error) console.log(error);
    if(event && event.returnValues) {
        const {airline, name, vote, votesNedded} = event.returnValues;
        console.log(`Airline vote for ${name} (${airline}): ${vote} of needed ${votesNedded}`);
    }
});

flightSuretyApp.events.RegisteredAirline({
    fromBlock: 0
}, async function (error, event) {
    if (error) console.log(error);
    if(event && event.returnValues) {
        const {airline: address, name} = event.returnValues;
        const data = {address, name};
        console.log(`Airline registered: ${name} (${address})`);
        if(airlines.findIndex(a => a.address === address) === -1) {
            airlines.push(data);
        }
    }
});


flightSuretyApp.events.OracleReport({
    fromBlock: 0
}, async function (error, event) {
    if (error) console.log(error);
    if(event && event.returnValues) {
        const {airline, flight, timestamp, status} = event.returnValues;
        console.log(`Oracle report received for [${airline}, ${flight}, ${timestamp}]: ${status}`)
    }
});

flightSuretyApp.events.FlightStatusInfo({
    fromBlock: 0
}, async function (error, event) {
    if (error) console.log(error);
    if(event && event.returnValues) {
        const {airline, flight, timestamp, status} = event.returnValues;
        console.log(`Flight status confirmed [${airline}, ${flight}, ${timestamp}]: ${status}`)
    }
});

var whitelist = ['http://localhost:3000', 'http://localhost:8000']
var corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
};

const app = express();
app.use(express.json({
    type: ['application/json', 'text/plain']
}));
app.use(cors());
app.get('/api', cors(corsOptions), (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
});

// Register airlines list
app.post('/api/airlines', cors(corsOptions), async (req,res) =>{
    const {address} = req.body.airline;
    if(airlines.findIndex(a => a.address === address) === -1) {
        airlines.push(req.body.airline);
        try {
            const timestamp = Date.now() + 1234567;
            const flight = {
                airline: req.body.airline.address,
                flight: `${req.body.airline.name} FL0${req.body.airline.address[4]} ${timestamp}`,
                timestamp: timestamp
            };
            await flightSuretyApp.methods
                .registerFlight(flight.airline, flight.flight, flight.timestamp)
                .send({from: accounts[1], gas:3000000 });
            flights.push(flight);
        } catch(err) {
            console.log(err);
        }
        console.log(`Received airline data ${req.body.airline.address} ${req.body.airline.name}`);
    }
    res.status(200).end();
});

app.get('/api/airlines', cors(corsOptions), (req, res) => {
    res.status(200).json({airlines});
});

app.get('/api/flights', cors(corsOptions), (req, res) => {
    res.status(200).json({flights});
});

// Register airlines list
app.post('/api/passengers', cors(corsOptions), (req,res) =>{
    const {address} = req.body.passenger;
    if(airlines.findIndex(a => a === passenger) === -1) {
        passengers.push(req.body.passenger);
        console.log(`Received passenger data ${req.body.passenger}`);
    }
    res.status(200).end();
});

export default app;


