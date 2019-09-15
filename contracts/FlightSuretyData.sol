pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct AirlineProfile {
        address airline;
        string name;
        bool isRegistered;
        bool isFunded;
    }

    struct InsuranceData {
        bool isActive;
        uint256 premium;
    }

    struct FlightInsurance {
        bool isActive;
        address[] insureds;
        mapping(address => InsuranceData) insuranceDatas;
    }

    struct Balance {
        bool isValue;
        uint256 value;
    }

    mapping(address => AirlineProfile) private airlines;                // Mapping of airline profiles
    uint256 public airlinesCount = 0;

    mapping(address => uint256) private authorizedCallers;              // Mapping of contracts authorized to do calls to this contract

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(bytes32 => FlightInsurance) private insurances;             // Mapping of insurance information per flight

    mapping(address => Balance) private balances;                       // Mapping of insured balances

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
    (
    )
    public
    {
        contractOwner = msg.sender;
        authorizedCallers[contractOwner] = 1;
    }

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
        require(operational, "Contract is currently not operational");
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
    * @dev Modifier that requires caller to be authorized
    */
    modifier requireIsCallerAuthorized()
    {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    /**
    * @dev Modifier that requires caller to be authorized
    */
    modifier requireIsNotAlreadyInsured
    (
        bytes32 flightKey,
        address insured
    )
    {
        require(!insurances[flightKey].insuranceDatas[insured].isActive, "Flight is already insured for this passenger");
        _;
    }

    /**
     * @dev Modifier that requires caller to be authorized
     */
    modifier requireInsuranceExists
    (
        bytes32 flightKey
    )
    {
        require(insurances[flightKey].isActive, "No insurance registered for the flight");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
    (
        bool mode
    )
    external
    requireIsCallerAuthorized
    {
        operational = mode;
    }

    /**
    * @dev Authorize caller contract address
    */
    function authorizeCaller
    (
        address contractAddress
    )
    external
    requireIsOperational
    requireContractOwner
    {
        authorizedCallers[contractAddress] = 1;
    }

    /**
    * @dev Deauthorize caller contract address
    */
    function deauthorizeCaller
    (
        address contractAddress
    )
    external
    requireIsOperational
    requireContractOwner
    {
        delete authorizedCallers[contractAddress];
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerAirline
    (
        address airline,
        string name
    )
    external
    requireIsOperational
    requireIsCallerAuthorized
    {
        require(!airlines[airline].isRegistered, "Airline is already registered.");

        airlines[airline] = AirlineProfile({
            airline : airline,
            name : name,
            isRegistered : true,
            isFunded : false
            });
        airlinesCount = airlinesCount.add(1);
    }

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function registerInsurance
    (
        bytes32 flightKey,
        address insured,
        uint256 premium
    )
    external
    requireIsOperational
    requireIsCallerAuthorized
    requireIsNotAlreadyInsured(flightKey, insured)
    {
        if(!insurances[flightKey].isActive) {
            insurances[flightKey] = FlightInsurance({
                isActive: true,
                insureds: new address[](0)
            });
        }
        insurances[flightKey].insuranceDatas[insured] = InsuranceData({
            isActive: true,
            premium: premium
        });
        insurances[flightKey].insureds.push(insured);

    }

    /**
     * @dev Checks if given address corresponds to a registered airline
     */
    function isAirline
    (
        address airline
    )
    external
    view
    requireIsOperational
    requireIsCallerAuthorized
    returns (bool)
    {
        return airlines[airline].isRegistered;
    }

    /**
     * @dev Checks if given address corresponds to a registered and funded airline
     */
    function isFundedAirline
    (
        address airline
    )
    external
    view
    requireIsOperational
    requireIsCallerAuthorized
    returns (bool)
    {
        AirlineProfile storage airlineProfile = airlines[airline];
        return airlineProfile.isRegistered && airlineProfile.isFunded;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
    (
        bytes32 flightKey
    )
    external
    requireIsOperational
    requireIsCallerAuthorized
    requireInsuranceExists(flightKey)
    {
        for(uint c=0; c<insurances[flightKey].insureds.length; c++) {
            address insured = insurances[flightKey].insureds[c];
            uint256 premium = insurances[flightKey].insuranceDatas[insured].premium;
            if(balances[insured].isValue) {
                balances[insured].value = balances[insured].value.add(premium.mul(3).div(2));
            } else {
                balances[insured] = Balance({
                    isValue: true,
                    value:  premium.mul(3).div(2)
                });
            }
        }
    }

    /**
     * @dev Returns claimant's balance
     */
    function getBalance
    (
        address claimant
    )
    external
    view
    requireIsOperational
    requireIsCallerAuthorized
    returns (uint256)
    {
        if (balances[claimant].isValue) {
            return balances[claimant].value;
        }
        return 0;
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
    (
        address claimant
    )
    external
    requireIsOperational
    requireIsCallerAuthorized
    {
        if (balances[claimant].isValue) {
            uint256 amount = balances[claimant].value;
            balances[claimant].value = balances[claimant].value.sub(amount);
        }
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund
    (
        address airline
    )
    public
    requireIsOperational
    requireIsCallerAuthorized
    {
        airlines[airline].isFunded = true;
    }

    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    internal
    pure
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

}

