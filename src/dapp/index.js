
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import 'babel-polyfill';

(async() => {

    let contract = new Contract('localhost', async () => {

        // Read transaction
        let isOperationalResult;
        let isOperationalError;
        let flightsData = [];
        try {
            isOperationalResult = await contract.flightSuretyApp.methods.isOperational().call();
        } catch (err) {
            isOperationalError = err;
        }
        let displayDiv = DOM.elid("display-wrapper");

        display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: isOperationalError, value: isOperationalResult} ]);

        try {
            let airlinesSection = DOM.section();
            airlinesSection.appendChild(DOM.h2({className: 'section-header'}, 'Airlines'));
            airlinesSection.appendChild(DOM.h4('Registered airlines'));
            airlinesSection.appendChild(DOM.h5('Airlines 1-4 have been pre-registered and funded. Airline #5 is not funded.'));
            const airlinesResponse = await getData('http://localhost:3000/api/airlines');
            const result = await airlinesResponse.json();
            const airlinesValues = result && result.airlines && result.airlines.map((val, i) => {
                return {
                    value: val.address,
                    text: val.name
                }
            });
            let airIdx = 0;
            result.airlines.forEach(airline => {
                const airlineDiv = DOM.div(`#${airIdx + 1}: ${airline.name} (${airline.address})`);
                airlinesSection.appendChild(airlineDiv);
                airIdx++;
            });

            const registerAirlineH4 = DOM.h4({className: 'action-header top-20'}, 'Register a new airline');
            airlinesSection.appendChild(registerAirlineH4);
            airlinesSection.appendChild(DOM.label({className: 'form', for: 'registering-airline-address'}, 'Registering Airline address'));
            DOM.makeSelect('registering-airline-address', airlinesSection, airlinesValues);
            airlinesSection.appendChild(DOM.newLine());
            airlinesSection.appendChild(DOM.label({className: 'form', for: 'register-airline-address'}, 'Airline address'));
            airlinesSection.appendChild(DOM.input({id: 'register-airline-address', type: 'text', className: 'input-lg'}));
            airlinesSection.appendChild(DOM.label({className: 'form', for: 'register-airline-name'}, 'Airline name'));
            airlinesSection.appendChild(DOM.input({id: 'register-airline-name', type: 'text', className: 'input-lg'}));
            airlinesSection.appendChild(DOM.button({id: 'register-airline-button', className:'btn btn-primary'}, 'Register'));

            airlinesSection.appendChild(DOM.h4({className: 'action-header top-20'}, 'Fund airline'));
            airlinesSection.appendChild(DOM.label({className: 'form', for: 'fund-airline-address'}, 'Airline address'));
            airlinesSection.appendChild(DOM.input({id: 'fund-airline-address', type: 'text', className: 'input-lg'}));
            airlinesSection.appendChild(DOM.label({className: 'form', for: 'fund-airline-amount'}, 'Funding amount (in Ether)'));
            airlinesSection.appendChild(DOM.input({id: 'fund-airline-amount', type: 'text', className: 'input-lg'}));
            airlinesSection.appendChild(DOM.button({id: 'fund-airline-button', className:'btn btn-primary'}, 'Fund'));

            displayDiv.append(airlinesSection);
        } catch (err) {
            console.log(err);
            DOM.appendText(displayDiv, 'Error. Could not get airline information.');
        }

        try {
            let passengerSection = DOM.section();

            const flightsResponse = await getData('http://localhost:3000/api/flights');
            const result = await flightsResponse.json();
            console.log(result);
            flightsData = result.flights;
            const flightsValues = result && result.flights && result.flights.map((val, i) => {
                return {
                    value: i,
                    text: val.flight
                }
            });

            passengerSection.appendChild(DOM.h2({className: 'section-header'}, 'Passengers'));
            passengerSection.appendChild(DOM.h5('Logic for passenger capabilities'));

            passengerSection.appendChild(DOM.h4({className: 'action-header top-20'}, 'Buy insurance'));
            passengerSection.appendChild(DOM.label({className: 'form', for: 'passenger-select'}, 'Passenger'));
            DOM.makeSelect('passenger-select', passengerSection, contract.passengers.map((val, i) => {
                return {
                    value: i,
                    text: val
                }
            }));
            passengerSection.appendChild(DOM.newLine(('')));
            passengerSection.appendChild(DOM.label({className: 'form', for: 'flights-for-insurance-select'}, 'Select flight'));
            DOM.makeSelect('flights-for-insurance-select', passengerSection, flightsValues);
            passengerSection.appendChild(DOM.newLine(('')));
            passengerSection.appendChild(DOM.label({className: 'form', for: 'insurance-premium'}, 'Insurance premium (ether)'));
            passengerSection.appendChild(DOM.input({id: 'insurance-premium', type: 'text', className: 'input-lg'}));
            passengerSection.appendChild(DOM.newLine(('')));
            passengerSection.appendChild(DOM.button({id: 'buy-insurance-button', className:'btn btn-primary'}, 'Buy'));

            passengerSection.appendChild(DOM.h4({className: 'action-header top-20'}, 'Claim payment'));
            passengerSection.appendChild(DOM.label({className: 'form', for: 'claim-passenger-select'}, 'Passenger'));
            DOM.makeSelect('claim-passenger-select', passengerSection, contract.passengers.map((val, i) => {
                return {
                    value: i,
                    text: val
                }
            }));
            passengerSection.appendChild(DOM.newLine(('')));
            passengerSection.appendChild(DOM.button({id: 'claim-button', className:'btn btn-primary'}, 'Claim'));

            displayDiv.append(passengerSection);

            let oraclesSection = DOM.section();
            oraclesSection.appendChild(DOM.h2({className: 'section-header'}, 'Oracles'));
            oraclesSection.appendChild(DOM.h5('Check flight status with oracles'));
            oraclesSection.appendChild(DOM.label({className: 'form', for: 'status-flight-select'}, 'Flight'));
            DOM.makeSelect('status-flight-select', oraclesSection, flightsValues);
            oraclesSection.appendChild(DOM.newLine(('')));
            oraclesSection.appendChild(DOM.button({id: 'submit-oracle', className:'btn btn-primary'}, 'Check Flight Status'));
            displayDiv.append(oraclesSection);
        } catch (err) {
            console.log(err);
            DOM.appendText(displayDiv, 'Error. Could not get flights information.');
        }

        // Us-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = flightsData[DOM.elid('status-flight-select').value];
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight} ]);
            });
        });

        // Registering airline
        DOM.elid('register-airline-button').addEventListener('click', () => {
            let registeringAddress = DOM.elid('registering-airline-address').value;
            let address = DOM.elid('register-airline-address').value;
            let name = DOM.elid('register-airline-name').value;

            if (registeringAddress && address && name) {
                console.log(`${registeringAddress} registering airline ${name} with address ${address}...`);
                // Write transaction
                contract.registerAirline(registeringAddress, address, name, (error, result) => {
                    display('Airlines', 'Airline registration', [{
                        label: 'Registering airline',
                        error: error,
                        value: `${name}`
                    }]);
                });
            } else {
                display('Airlines', 'Airline registration', [{
                    label: 'Registering airline',
                    error: `Cannot call function with parameters ${registeringAddress}, ${address}, ${name}`,
                    value: undefined
                }]);
            }
        });

        // Funding airline
        DOM.elid('fund-airline-button').addEventListener('click', () => {
            let airline = DOM.elid('fund-airline-address').value;
            let amount = DOM.elid('fund-airline-amount').value;

            if (airline && amount) {
                console.log(`Funding airline ${airline} with ${amount} ether...`);
                // Write transaction
                contract.fundAirline(airline, amount, (error, result) => {
                    display('Airlines', 'Airline interaction', [{
                        label: 'Funding airline',
                        error: error,
                        value: result.airline + ' ' + result.amount + ' ether'
                    }]);
                });
            } else {
                display('Airlines', 'Airline interaction', [{
                    label: 'Funding airline',
                    error: `Cannot call function with parameters ${airline}, ${amount}`,
                    value: undefined
                }]);
            }
        });

        // Handle buy insurance
        DOM.elid('buy-insurance-button').addEventListener('click', () => {
            let passengerId = DOM.elid('passenger-select').value;
            let flightId = DOM.elid('flights-for-insurance-select').value;
            let premium = DOM.elid('insurance-premium').value;

            if (passengerId && flightId && premium) {
                console.log(`Buying insurance for passenger ${contract.passengers[passengerId]}, flight ${flightsData[flightId].flight}, ${premium} ether...`);
                // Write transaction
                contract.buyInsurance(contract.passengers[passengerId], flightsData[flightId], premium, (error, result) => {
                    display('Flight Insurance', 'Isurance purchase', [{
                        label: 'Insurance purchase',
                        error: error,
                        value: 'Passenger: ' + result.passengerAddress + ', flight: ' + result.flightData.flight + '. Insurance for ' + result.premium + ' ether'
                    }]);
                });
            } else {
                display('Insurance', 'Insurance  purchase', [{
                    label: 'Buy insurance',
                    error: `Cannot call function with parameters ${passengerId}, ${flightId}, ${premium}`,
                    value: undefined
                }]);
            }
        });

        DOM.elid('claim-button').addEventListener('click', () => {
            let passenger = contract.passengers[DOM.elid('claim-passenger-select').value];
            console.log(passenger);
            // Write transaction
            contract.withdrawClaims(passenger, (error, result) => {
                display('Passengers', 'Withdraw claims', [ { label: 'Funds withdrawal status', error: error, value: 'Funds withdrawns'} ]);
            });
        });
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);

}


async function getData(url) {
    return await fetch(url, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        //mode: 'no-cors',
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    })
}







