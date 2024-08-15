// SPDX-License-Identifier: MIT
/*What we want too do->
->Pay some amount
->Pic a random winner(Varified random winner) and transfer the money
->Winner to be selected every x min/days/months (automatically) 
->Will use Chainlink oracle (for selecting random winner)
->Will use Chainlink keeper (for Automatically execution every x min/days/months)
*/ 
 
pragma solidity ^0.8.7;
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Lottery_UpdateKeepNotNeeded(uint256 currentBalance,uint256 numPlayers, uint256 lotteryState) ;
error Raffle__RaffleNotOpen();
contract Lottery is VRFConsumerBaseV2,AutomationCompatibleInterface{     
  
    enum LotteryState{ 
        OPEN,  
        CALCULATING
    } //0->OPEN state(Can add players) 1->CALCULATING STATE(Generating random winner)
    
    uint256 private immutable i_enternceFee;  
    address payable[] private s_players;
    address private s_resentWinner; //Will return the winner
    LotteryState private s_lotteryState;
    
    
    uint256 private s_requestId;
    uint64 private immutable i_subscriptionId;//id of the subscription that we request to
    //will get from vrf chain link subscribtion
    bytes32 private immutable i_keyHash;//its is the gasLimit, if the gas price is very
    //high to get the random number then setting a limit insure you don't send excess money
    //and u don't get the random number
    uint32 private immutable i_callbackGasLimit;//This is used to set limit, to how much 
    //gas we can spent in wrinting a code of fulfillRandomWords() ,if the gas exides the
    //random words will stop responding
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;//this is the vrfCoordinator
    //Contract that does the random number
    uint16 private constant REQUEST_CONFIRMATION = 3;//How much block confirmation to wait
    uint32 private constant NUM_WORDS=1;//How many random number we want

    uint256 private s_counter;
    uint256 private immutable i_interval;
    uint256 private s_lastTimeStamp;

//Events are the custom data structure used to log info to user,in less gas 
//Events serve as a convenient way to emit data that can be easily observed and
//monitored by external entities without reading the entire contract state.
    event enterPlayer(address indexed playerAddress); 
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(address newWinner);

//address vrfCoordinatorV2: is the address of the contract that does the random number varification
    constructor(address vrfCoordinatorV2,uint256 enterenceFee,uint64 subscriptionId,bytes32 keyHash,
    uint32 callbackGasLimit,uint256 updateInterval) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_enternceFee=enterenceFee; 
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId=subscriptionId;
        i_keyHash=keyHash;
        i_callbackGasLimit=callbackGasLimit;
        i_interval=updateInterval;
        s_lastTimeStamp = block.timestamp; 
        s_lotteryState=LotteryState.OPEN; //Opening the contract to accept players
    } 

    function enterLottery() public payable{
        require(msg.value >= i_enternceFee ,"Not Enough eth send");

        if (s_lotteryState != LotteryState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        s_players.push(payable(msg.sender));
        emit enterPlayer(msg.sender);
    } 

/* 
checkUpkeep checks is the time interval mentioned is passes, how to check->
id current time(block.timestamp)-lastTimeStamp > interval
what should be true to chechUpKeep to be true->
1. The time interval has passed between Lottery runs. 
2. The lottery is open means at that time no new player can inter ,it is thr time to get
random winner.
3. The contract has at least 1 player ETH.
4. Implicity, your subscription is funded with LINK.
 */

//changed bytes calldata to bytes memory because when we are call in checkUpkeep we are passing
//a sting as argument ->checkUpkeep("")
//for string use memory
     function checkUpkeep( bytes memory /* checkData */)public view override returns (bool upkeepNeeded, bytes memory /* performData */)
    {   
        // require(s_lotteryState!=LotteryState.OPEN,"Lottery is not open");
        bool isOpen=s_lotteryState==LotteryState.OPEN ;
        bool timeToFindWinner = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers= (s_players.length>0);
        bool hasBalace=address(this).balance>0;
        upkeepNeeded= (isOpen && timeToFindWinner && hasBalace && hasPlayers);
         return (upkeepNeeded,"") ;
    }   

//When we got true from upkeepNeeded we need to execute requestRandomWords as performUpkeep(change name of function to performUpkeep) 
    function performUpkeep(bytes calldata /* performData */)external override
    {   
        (bool upkeepNeeded,)=checkUpkeep("");  
        if(!upkeepNeeded){
        revert Lottery_UpdateKeepNotNeeded(address(this).balance,s_players.length,uint256(s_lotteryState));  
        }
        s_lotteryState=LotteryState.CALCULATING; //Changing the state so that no new player
        //can enter during reuest of random winner
       uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,  
            i_subscriptionId,
            REQUEST_CONFIRMATION,
            i_callbackGasLimit,
            NUM_WORDS
        );  
      
        s_requestId = requestId;
        emit RequestSent(requestId, NUM_WORDS);
    }

//As we are overiding so that VRFConsumerBaseV2 can know that
//we are uing fulfillRandomWords function from uts contract

//_randomWords will contain the random number generated as we set NUM_WORDS=1 so it 
//will be of size 1
     function fulfillRandomWords (uint256 /*_requestId*/,uint256[] memory _randomWords) internal override {
//Now to to select a random winner from players array
//if players size=10 , random number=202
//randomWinnerIndex=randomNumber%playerSize (202%10=2nd index from player array is winner)
        uint256 randomWinnerIndex= _randomWords[0] % s_players.length;
        address randomWinner=s_players[randomWinnerIndex];
        s_resentWinner=randomWinner; 
        //Sending all the money to the winner 
        s_players=new address payable[](0); //Once winner is found empty the player array
        s_lastTimeStamp=block.timestamp;  
        (bool sucess,)=payable(s_resentWinner).call{value:address(this).balance}("");
        require(sucess,"Transfer failed");
        s_lotteryState=LotteryState.OPEN; //Once the request is fillfiled change to OPEN
        emit RequestFulfilled(s_resentWinner); 
    } 

    function getEnterenceFee() public view returns (uint256){
          return i_enternceFee;
    }
    function getPlayer(uint256 index) public view returns (address){
           return s_players[index];
    }
    function getSubscribtionId() public view returns (uint64){
            return i_subscriptionId;
    }
    function getKeyHash() public view returns (bytes32){
            return i_keyHash;
    }
    function getCallbackGasLimit() public view returns (uint32){
            return i_callbackGasLimit;
    }
    function getVrfCoordinator() public view returns (VRFCoordinatorV2Interface){
            return i_vrfCoordinator;
    }
    function getRequestConfirmation() public pure returns (uint16){
            return REQUEST_CONFIRMATION;
    }
    //As NUM_WORDS is a constant variable
    function getNumWords() public pure returns (uint32){
            return 1;
    }
    function getResentWinner() public view returns(address){
        return s_resentWinner;
    }
    //Not Used
    // function getConter() public view returns(uint256){
    //     return s_counter;
    // }
    function getInterval()public view returns(uint256) {
        return i_interval;
        
    }
    function getLastTimeStamp()public view returns(uint256) {
        return s_lastTimeStamp;  
    }
    function getLotteryState() public view returns(LotteryState) {
        return s_lotteryState;
    } 
    function getNumberOfPlayers()public view returns(uint256) {
        return s_players.length;
        
    }
    //Not Used
    // function getRequestId() public view returns(uint256){
    //     return s_requestId; 
    // }
}  