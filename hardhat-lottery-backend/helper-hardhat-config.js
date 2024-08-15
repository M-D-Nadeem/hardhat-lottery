const { ethers } = require("hardhat")

//Get this all from chain link ->vrf->support network
const networkConfig={
    11155111:{
        name:"sepolia",
        vrfCordinator:"0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        entrenceFee:ethers.parseEther("0.01"),
        keyHash:"0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit:"500000",
        subscriptionId:"6926",
        interval:"30"
    },
    137:{
        name:"polygon",
        vrfCordinator:"0x7E10652Cb79Ba97bC1D0F38a1e8FaD8464a8a908",
        entrenceFee:ethers.parseEther("0.05"),
        keyHash:"0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899",
        callbackGasLimit:"500000",
        subscriptionId:"0",
        interval:"30",
    },
    31337:{
        name:"hardhat",
        entrenceFee:ethers.parseEther("0.01"),
        keyHash:"0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",//give any
        callbackGasLimit:"500000",
        subscriptionId:"0",
        interval:"30",

        
    }
}
const devlopmentChain=["hardhat","localhost"]

module.exports={networkConfig,devlopmentChain}