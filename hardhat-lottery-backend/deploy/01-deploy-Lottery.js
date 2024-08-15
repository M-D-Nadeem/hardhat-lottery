const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { devlopmentChain, networkConfig } = require("../helper-hardhat-config")
const verify = require("../utils/verify")

async function deployLottery() {
    const {deploy,log}=deployments
    const {deployer}=await getNamedAccounts()
    const chainId=network.config.chainId
    let vrfCordinatorAddress;
    let subscriptionId; //We can either create subscriptionId by code or get from ui
    //at https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number
    //here for devlopmentChain we will create and for sepolia we will get from ui
    let keyHash=networkConfig[chainId]["keyHash"]
    let entrenceFee=networkConfig[chainId]["entrenceFee"]
    let interval=networkConfig[chainId]["interval"]
    let callbackGasLimit=networkConfig[chainId]["callbackGasLimit"]

    if(devlopmentChain.includes(network.name)){
        const vrfCordinatorMockResponse=await deployments.get("VRFCoordinatorV2Mock")
        const vrfCordinatorMock=await ethers.getContractAt(vrfCordinatorMockResponse.abi,
            vrfCordinatorMockResponse.address
        )
        // console.log(vrfCordinatorMock);
        vrfCordinatorAddress=vrfCordinatorMockResponse.address        
        console.log(vrfCordinatorAddress);
        
        //Createing subscription promatically(see VRFCoordinatorV2Mock.sol from node_module or github)
        //step1->get subcription id
        const transactionResponse = await vrfCordinatorMock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)  
        //How to get the emitted value 
        //Recipt.logs[0/1(two event is emitded for same function)].args.varName
        subscriptionId=(transactionReceipt.logs[0].args.subId).toString()//IMP   
        console.log(subscriptionId);
        
             
        //step2->Funding subscription
        //Note ethers.parseEther("")  not ethers.util.parseEther("")
     await vrfCordinatorMock.fundSubscription(subscriptionId,ethers.parseEther("30"))
          
    }
    else{
        vrfCordinatorAddress=networkConfig[chainId]["vrfCordinator"]
        subscriptionId=networkConfig[chainId]["subscriptionId"]
    }
    console.log("Deploying Lottery......................");
    const Lottery=await deploy("Lottery",{
        contract:"Lottery",
        from:deployer,
        log:true,
        args:[vrfCordinatorAddress,entrenceFee,subscriptionId,keyHash,callbackGasLimit,interval],
        waitConfirmations:network.config.blockConfirmation || 1
    })
    if(!devlopmentChain.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        const args=[vrfCordinatorAddress,entrenceFee,subscriptionId,keyHash,callbackGasLimit,interval]
        await verify(Lottery.address,args)
    }
}

module.exports=deployLottery
module.exports.tags=["all","lottery"]