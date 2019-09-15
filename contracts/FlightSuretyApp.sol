pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint constant private MIN_AIRLINES_FOR_VOTING = 4;

    address private contractOwner;          // Account used to deploy contract

    uint256 public flightsCount = 0;        // Counter to track registered flights

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    struct AirlineVote {
        address airline;
        address[] voters;
        bool isInitiated;
    }

    mapping(bytes32 => Flight) private flights;

    mapping(address => AirlineVote) private airlineVoting;

    FlightSuretyData flightSuretyData;      // Data contract reference

    event ReceivedAirlineVote(address airline, string name, uint256 vote, uint256 votesNedded);
    event RegisteredAirline(address airline, string name);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        // Modify to call data contract's status
        require(true, "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires a registered airline to be the function caller
    */
    modifier requireCallerIsRegisteredAirline()
    {
        require(flightSuretyData.isAirline(msg.sender), "Caller is not a registered airline");
        _;
    }

    /**
    * @dev Modifier that requires a registered and funded airline to be the function caller
    */
    modifier requireCallerIsFundedAirline()
    {
        require(flightSuretyData.isFundedAirline(msg.sender), "Caller is not a funded airline");
        _;
    }

    /**
    * @dev Modifier that requires a registered and funded airline to be the function caller
    */
    modifier requireIsMinimumFundingAmount()
    {
        require(msg.value == 10 ether, "Airline must submit 10 ETH as initial funding");
        _;
    }

    /**
     * @dev Modifier that requires maximum 1 ETH of insurance premium
     */
    modifier requireValueIsWithinLimits()
    {
        require(msg.value > 0 ether, "Insurance premium must be a positive amount");
        require(msg.value <= 1 ether, "Maximum premium is 1 ETH ");
        _;
    }

    /**
     * @dev Modifier that requires caller not to be a contract
     */
    modifier requireNotAContractAddress
    ()
    {
        require(msg.sender == tx.origin, "Contracts not allowed");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
    (
        address dataContract
    )
    public
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
    public
    view
    returns (bool)
    {
        return flightSuretyData.isOperational();
        // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerFirstAirline
    (
        address airline,
        string name
    )
    external
    requireContractOwner
    {
        flightSuretyData.registerAirline(airline, name);
    }

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline
    (
        address airline,
        string name
    )
    external
    requireCallerIsFundedAirline
    returns (bool success, uint256 votes)
    {
        uint256 airlinesCount = flightSuretyData.airlinesCount();
        if(airlinesCount < MIN_AIRLINES_FOR_VOTING) {
            flightSuretyData.registerAirline(airline, name);
            return (true, 1);
        }
        if(!airlineVoting[airline].isInitiated) {
            airlineVoting[airline] = AirlineVote({
                airline : airline,
                voters : new address[](0),
                isInitiated : true
            });
        }
        bool isDuplicate = false;
        for(uint c=0; c<airlineVoting[airline].voters.length; c++) {
            if (airlineVoting[airline].voters[c] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }

        require(!isDuplicate, "Caller has already voted for this airline.");

        airlineVoting[airline].voters.push(msg.sender);
        success = false;
        votes = airlineVoting[airline].voters.length;
        uint votingThreshold = airlinesCount.div(2).add(1);
        emit ReceivedAirlineVote(airline, name, airlineVoting[airline].voters.length, votingThreshold);
        if (airlineVoting[airline].voters.length >= votingThreshold) {
            flightSuretyData.registerAirline(airline, name);
            delete airlineVoting[airline];
            success = true;
            emit RegisteredAirline(airline, name);
        }

        return (success, votes);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund
    (
    )
    public
    payable
    requireIsOperational
    requireCallerIsRegisteredAirline
    requireIsMinimumFundingAmount
    {
        require(!flightSuretyData.isFundedAirline(msg.sender), "Airline has already been funded");
        flightSuretyData.fund(msg.sender);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    external
    requireIsOperational
    requireCallerIsRegisteredAirline
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        if(!flights[flightKey].isRegistered) {
            flights[flightKey] = Flight({
                isRegistered: true,
                statusCode: STATUS_CODE_UNKNOWN,
                updatedTimestamp: timestamp,
                airline: airline
            });
        }
        flightsCount = flightsCount.add(1);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus
    (
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    )
    internal
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        if(statusCode == STATUS_CODE_LATE_AIRLINE) {
            flightSuretyData.creditInsurees(flightKey);
        }

        flights[flightKey].statusCode = statusCode;
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester : msg.sender,
            isOpen : true,
            isResolved : false
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    requireIsOperational
    requireValueIsWithinLimits
    requireNotAContractAddress
    external
    payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        // Require flight is registered
        require(flights[flightKey].isRegistered, "Flight has not been registered");

        flightSuretyData.registerInsurance(flightKey, msg.sender, msg.value);
    }

    /**
     * @dev Withdraw funds credited for delayed flights
     *
     */
    function withdrawClaims
    (
    )
    requireIsOperational
    requireNotAContractAddress
    external
    payable
    {
        // Checks
        uint256 amount = flightSuretyData.getBalance(msg.sender);
        require(amount > 0, "No funds");

        // Effects
        flightSuretyData.pay(msg.sender);

        // Interaction
        msg.sender.transfer(amount);
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function()
    external
    payable
    {
        fund();
    }


    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        bool isResolved;                                // If resolved, no longer processes responses
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
    (
    )
    external
    payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
            isRegistered : true,
            indexes : indexes
            });
    }

    function getMyIndexes
    (
    )
    view
    external
    returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    )
    external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (!oracleResponses[key].isResolved && oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);

            // Set request as resolve to ignore following responses
            oracleResponses[key].isResolved = true;
        }
    }


    function getFlightKey
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    internal
    pure
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
    (
        address account
    )
    internal
    returns (uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
    (
        address account
    )
    internal
    returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
            // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion

}   
