const {  network, ethers } = require("hardhat");
const { devlopmentChain, networkConfig } = require("../helper-hardhat-config");

async function deployVRFCordiantorMock({deployments, getNamedAccounts}) {
    const {deploy,log}=deployments;
    const {deployer}=await getNamedAccounts()
    const baseFee="250000000000000000"
    console.log(baseFee);
    const gasPriceLink=1e9; //(this is the limit give any)
    //chainLink node pas the gas price to give the random number and do external work
    //so this price based on the price of gas of this blackchain
    
    if(devlopmentChain.includes(network.name)){
        console.log("Deploying VRFCordiantor Mock.......");
        await deploy("VRFCoordinatorV2Mock",{
            from:deployer,
            log:true,
            args:[baseFee,gasPriceLink],

        })
        console.log("Mock eployed");
        console.log("---------------------------------------------");
        
        
    }
}
module.exports=deployVRFCordiantorMock
module.exports.tags=["all","mocks"]