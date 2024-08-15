const { assert } = require("chai")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { devlopmentChain, networkConfig } = require("../../helper-hardhat-config")


devlopmentChain.includes(network.name)
    ? describe.skip
    :describe("Raffle Staging Tests",()=>{
    let deployer
    let lottery
    let entrenceFee
    beforeEach(async ()=>{
        deployer=(await getNamedAccounts()).deployer
        const lotteryDeployResponse=await deployments.get("Lottery");
        lottery=await ethers.getContractAt(lotteryDeployResponse.abi,lotteryDeployResponse.address)
        
        entrenceFee=networkConfig[network.config.chainId]["entrenceFee"]
        console.log(entrenceFee);
        
    })
    describe("fulfillRandomWords",()=>{
        // this.setTimeout(120000)
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner",async()=>{ 
            
            console.log("Setting up test...")
            const startingTimeStamp=await lottery.getLastTimeStamp()
            const accounts = await ethers.getSigners()
            console.log("Setting up Listener...")
            await new Promise(async (resolve,reject)=>{
                 
                lottery.once("RequestFulfilled",async ()=>{
                    console.log("Found the winner");
                    try{
                         const recentWinner=await lottery.getResentWinner()
                         const numOfPlayer=await lottery.getNumberOfPlayers()
                         const lastTimeStamp=-await lottery.getLastTimeStamp()
                         const lotteryState=await lottery.getLotteryState()
                         const winnerEndBal=await ethers.provider.getBalance(recentWinner)
                         assert.equal(numOfPlayer.toString(),"0")
                         assert.equal(lotteryState.toString(),"0")
                         assert(lastTimeStamp>startingTimeStamp)
                         assert.equal(winnerEndBal,winnerStartBal+entrenceFee)
                         setTimeout(resolve, 5000)
                    }catch(err){
                        console.log(err);
                        reject(err)
                        
                    }
                
                })
                console.log("Entering Raffle...")
                const tx = await lottery.enterLottery({ value: entrenceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartBal = await ethers.provider.getBalance(accounts[0])
                
            })
        })
    })
})