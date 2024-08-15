const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { devlopmentChain, networkConfig } = require("../../helper-hardhat-config");
const { N } = require("ethers");
!devlopmentChain.includes(network.name)?describe.skip :
describe("Lottery contract tests",()=>{
    let lottery;
    let vrfCordinatorV2Mock;
    let deployer;
    let entrenceFee=networkConfig[network.config.chainId]["entrenceFee"]
    let chainId
    let interval
    let subcriptionId
    let keyHash
    let requestConfirmation
    let callbackGasLimit
    let numWords
    let tx
    let txReceipt
    beforeEach(async ()=>{
        chainId=network.config.chainId
        interval=networkConfig[chainId]["interval"]
        console.log(interval);
        
        deployer=(await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        const lotteryDeployResponse=await deployments.get("Lottery");
        lottery=await ethers.getContractAt(lotteryDeployResponse.abi,lotteryDeployResponse.address)
        const vrfCordinatorV2MockDeployResponse=await deployments.get("VRFCoordinatorV2Mock")
        vrfCordinatorV2Mock=await ethers.getContractAt(vrfCordinatorV2MockDeployResponse.abi,vrfCordinatorV2MockDeployResponse.address)
        
        
        
        subcriptionId=await lottery.getSubscribtionId()
        keyHash=await lottery.getKeyHash()
        requestConfirmation=await lottery.getRequestConfirmation()
        callbackGasLimit=await lottery.getCallbackGasLimit()
        numWords=await lottery.getNumWords()

        //Note to use evm_increaseTime we ahve to addConsumer first
        await vrfCordinatorV2Mock.addConsumer(subcriptionId, lottery.target);
    })
    describe("constructor",()=>{
        it("Initialize the lottery entry state correctly",async ()=>{
            const currLotteryState=await lottery.getLotteryState()            
            assert.equal(currLotteryState.toString(),"0")
            const getCurrInterval=(await lottery.getInterval()).toString()
            assert.equal(getCurrInterval,networkConfig[network.config.chainId]["interval"])
            assert.equal(await lottery.getVrfCoordinator(),vrfCordinatorV2Mock.target)

            assert.equal((await lottery.getEnterenceFee()).toString(),networkConfig[network.config.chainId]["entrenceFee"])

            
        })
        
        
    })
    describe("Enter lottery",()=>{
        it("Not enough eth send to enter the lottery",async ()=>{
            await expect(lottery.enterLottery()).to.be.revertedWith("Not Enough eth send")
        })
        it("New Player is been added",async ()=>{
            await lottery.enterLottery({value:entrenceFee})
            assert.equal(await lottery.getPlayer(0),deployer)
        })
        //This is how to write test for events
        //Syntax=> await expect().to.emit(yourContractWithHas that event,"name of event")
        it("Should emait enterPlayer event",async ()=>{
            
            await expect(lottery.enterLottery({value:entrenceFee}))
            .to.emit(lottery,"enterPlayer")
        })
        it("Does not allow other player to enter the lottery while it is calculating",async ()=>{
            //So to cheak this we have to make sure  checkUpkeep return true
            //->As we inter the lottery so loterry is open , palyer is also there
            //Just we have to cheak for timeToFindWinner
            await lottery.enterLottery({value:entrenceFee})
           
            //Testing for timeInterval see docs https://hardhat.org/hardhat-network/docs/reference#evm_mine
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            //Once time is greater than interval which means noe is the time to claculate 
            //winner using performUpkeep() function 
            await network.provider.send("evm_mine",[]) //Mine a empty block once time 
            const aa=await lottery.performUpkeep("0x") //IMP Send 0x as argument
             console.log(aa);
             
            //This is how to revert a custom error
            //await expect().to.be.revertedWithCustomError(CONTRACT_NAme,ERROR_NAME)
            await expect(lottery.enterLottery({value:entrenceFee}))
            .to.be.revertedWithCustomError(lottery,"Raffle__RaffleNotOpen")
        })
    })
    describe("Test for checkUpkeep",()=>{
        it("Should return false if lottery is in calculating state",async ()=>{
            //We should perform evey operation and call performUpkeep() to show it is in
            //Calculating state
            await ethers.provider.send("evm_increaseTime",[Number(interval)+1])
            await ethers.provider.send("evm_mine")  
            // const {upkeepNeeded}= await lottery.checkUpkeep("0x")
            const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x")
            console.log("geere",upkeepNeeded);
            //lottery is in calculatibng state
            assert(!upkeepNeeded)
        })
        it("Should return false if player has not entered",async ()=>{
            await network.provider.send("evm_increaseTime",[Number(interval+1)])
            await network.provider.send("evm_mine",[])
            const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x")
            assert.equal(upkeepNeeded,false)
        })
        it("Should return false if time is not greater than interval",async ()=>{
            await lottery.enterLottery({value:entrenceFee})
            await network.provider.send("evm_increaseTime",[Number(interval)-20])
            await network.provider.send("evm_mine",[])
            const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x")
            assert.equal(upkeepNeeded,false)
        })
        it("Should returnb true if player has entered with balance, and time has passed,and lottery is in open state",async ()=>{
            await lottery.enterLottery({value:entrenceFee})
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.send("evm_mine",[])
            assert.equal((await lottery.getLotteryState()).toString(),"0")
            const { upkeepNeeded } = await lottery.checkUpkeep.staticCall("0x")
            assert.equal(upkeepNeeded,true)
        })
    })
    describe("Test for performUpkeep",()=>{
        it("It should revert if cheekUpKeep is false",async ()=>{
          await expect(lottery.performUpkeep("0x"))
          .to.be.revertedWithCustomError(lottery,"Lottery_UpdateKeepNotNeeded")
        })
        it("It should change the lottery state to calculating",async ()=>{
            await lottery.enterLottery({value:entrenceFee})
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.send("evm_mine",[])
            await lottery.performUpkeep("0x")
           
            assert.equal((await lottery.getLotteryState()).toString(),"1")
        })
        it("It should return requestId and check the state is calculating",async ()=>{
            await lottery.enterLottery({value:entrenceFee})
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const response= await lottery.performUpkeep("0x")
            console.log(response);
            
           assert.equal((await lottery.getLotteryState()).toString(),"1")

            const reciept=await response.wait(1)
            //logs[1] not 0 because 1th event is emited when we call requestRandomWords from 
            //vrfCoordinatorV2Mock contract and then after that we are emitng an event 
            //inside same function so logs[1]            
            const requestId=reciept.logs[1].args[0]
            assert.equal(requestId.toString(),"1")
            
        })
    })
    describe("Test for fulfillRandomWords",()=>{
        beforeEach(async ()=>{
            await lottery.enterLottery({value:entrenceFee})
            await network.provider.send("evm_increaseTime",[Number(interval)+1])
            await network.provider.send("evm_mine",[])
        })
        it("Can only be called after performUpkeep that is if we have a correct requestId",async ()=>{
            //To ceack we have correct request id we can use fulfillRandomWords() of 
            //vrfCoordionatorV2Mock which take 2 parameter requestId,_consumer and 
            //revert an error if requestId is wrong

            //Never use await inside except
            await expect(
                vrfCordinatorV2Mock.fulfillRandomWords(0, lottery.target),
            ).to.be.revertedWith("nonexistent request")
            // await expect(vrfCordinatorV2Mock.fulfillRandomWordsWithOverride(1,lottery.target,[]))
            // .to.be.revertedWith("nonexistent request")
        })
        it.only("should pic a winner, reset the lottery, and send the money",async ()=>{
            const numberOfFackAcc=5;
            const accounts=await ethers.getSigners()
            for(let i=1;i<=numberOfFackAcc;i++){
                const accountConnect=lottery.connect(accounts[i])              
                await accountConnect.enterLottery({value:entrenceFee})
            }
            const winnerStartBal = await ethers.provider.getBalance(
                accounts[5].address,
            )
            const startingTimeStamp = await lottery.getLastTimeStamp()
            console.log(winnerStartBal);
            
            //We will create a promise, if Winner is picked then we will asser
            await new Promise(async (resolve,reject)=> {
              lottery.once("RequestFulfilled",async ()=>{
                console.log("Found the winner");
                
                try{
                 
                    const recentWinner=await lottery.getResentWinner()
                    const lastTimeStamp=await lottery.getLastTimeStamp()
                    const lotteryState=await lottery.getLotteryState()
                    const numOfPlayer=await lottery.getNumberOfPlayers()
                    const winnerEndBal=await ethers.provider.getBalance(recentWinner)
                    assert.equal(numOfPlayer.toString(),"0")
                    assert.equal(lotteryState.toString(),"0")
                    assert(lastTimeStamp>startingTimeStamp)
                    // console.log(recentWinner);
                    // console.log(accounts[0].address);
                    // console.log(accounts[1].address);
                    // console.log(accounts[2].address);
                    // console.log(accounts[3].address);
                    // console.log(accounts[4].address);
                    // console.log(accounts[5].address);

                    //Now as we know acc5 is the winner now we will cheak if the 
                    //winnerEndBal=winnerStartBal+(entrenceFee*numberOfFackAcc+entrenceFee)
                    //The lase +entrenceFee is the entrenceFee that the winnerplayer gave while
                    //entering the loterry
                    console.log(winnerEndBal);
                    console.log(winnerStartBal+(entrenceFee*BigInt(numberOfFackAcc)+entrenceFee));
                    assert.equal(winnerEndBal,
                        winnerStartBal+(entrenceFee*BigInt(numberOfFackAcc)+entrenceFee)
                    )
                    
                    resolve()

                }catch(e){
                    reject(e)
                }
              })
              //As we will send the requestId emited by event in performUpkeep() and the
              //lottery address to fulfillRandomWords() of vrfCoordinatorV2Mock
              try {
              const response=await lottery.performUpkeep("0x")
              const reciept=await response.wait(1)
              
              
              //Now as we know acc5 is winner so we will test with acc5

              await vrfCordinatorV2Mock.fulfillRandomWords(
                reciept.logs[1].args.requestId,
                lottery.target,
            )
        } catch (e) {
            reject(e)
        }
            })
        })
    
    })
})