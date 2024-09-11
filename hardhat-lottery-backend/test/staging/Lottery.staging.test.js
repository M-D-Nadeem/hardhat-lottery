const { assert } = require("chai")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { devlopmentChain, networkConfig } = require("../../helper-hardhat-config")


devlopmentChain.includes(network.name)
    ? describe.skip
    :describe("Raffle Staging Tests",()=>{
    let deployer
    let lottery
    let entrenceFee
    let accounts
    let winnerStartBal
    beforeEach(async ()=>{
        deployer=(await getNamedAccounts()).deployer
        const lotteryDeployResponse=await deployments.get("Lottery",deployer);
        lottery=await ethers.getContractAt(lotteryDeployResponse.abi,lotteryDeployResponse.address)
        accounts = await ethers.getSigners()
        winnerStartBal = await ethers.provider.getBalance(accounts[0].address);

        // entrenceFee=networkConfig[network.config.chainId]["entrenceFee"]
        //This entrenceFee should be greater than or equal to what you provided in hadhat-helper
        entrenceFee=await lottery.getEnterenceFee()
        // console.log(entrenceFee);
        
    })
    describe("fulfillRandomWords",()=>{
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => { 
            console.log("Setting up test...");
            
            const startingTimeStamp = await lottery.getLastTimeStamp();
            console.log("Starting TimeStamp: ", startingTimeStamp.toString());
        
            console.log("Setting up Listener...");
            
            await new Promise(async (resolve, reject) => {
                console.log("Setting up Listener...");
        
                lottery.once("RequestFulfilled", async () => {
                    console.log("Found the winner");
                    try {
                        const recentWinner = await lottery.getResentWinner();
                        const numOfPlayers = await lottery.getNumberOfPlayers();
                        const lastTimeStamp = await lottery.getLastTimeStamp();
                        const lotteryState = await lottery.getLotteryState();
                        const winnerEndBal = await ethers.provider.getBalance(recentWinner);
                        assert.equal(recentWinner.toString(), accounts[0].address)
                        console.log("Recent Winner: ", recentWinner);
                        console.log("Number of Players: ", numOfPlayers.toString());
                        console.log("Last TimeStamp: ", lastTimeStamp.toString());
                        console.log("Lottery State: ", lotteryState.toString());
                        console.log("Winner End Balance: ", winnerEndBal.toString());
                        
                        assert.equal(numOfPlayers.toString(), "0");
                        assert.equal(lotteryState.toString(), "0");
                        assert(lastTimeStamp > startingTimeStamp);
                        assert.equal(winnerEndBal.toString(), (winnerStartBal+entrenceFee).toString());
                        
                        resolve();
                    } catch (err) {
                        console.log(err);
                        reject(err);
                    }
                });
        
                try {
                    console.log("Entering Raffle...");
                    
                    // const minEntranceFee = await lottery.getEnterenceFee();
                    console.log("Entrance Fee: ", entrenceFee.toString());
        
                    const accountBalance = await ethers.provider.getBalance(accounts[0].address);
                    console.log("Account Balance: ", accountBalance.toString());
                    
                    const tx = await lottery.enterLottery({ value: entrenceFee });
                    await tx.wait(1);
                    console.log("Entered Raffle!");
        
                    console.log("Winner Start Balance: ", winnerStartBal.toString());
                    
                } catch (e) {
                    console.log("Error entering raffle: ", e);
                    reject(e);
                }
            });
        });
        
    })
})