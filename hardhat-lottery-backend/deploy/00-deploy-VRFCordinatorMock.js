const {  network, ethers } = require("hardhat");
const { devlopmentChain, networkConfig } = require("../helper-hardhat-config");

async function deployVRFCordiantorMock({deployments, getNamedAccounts}) {
    const {deploy,log}=deployments;
    const {deployer}=await getNamedAccounts()
    const baseFee=ethers.parseEther("0.1")
    console.log(baseFee);
    const gasPriceLink=1e8; //(this is the limit give any)
    const WEI_PER_UNIT_LINK=ethers.parseEther("0.001");
    //chainLink node pas the gas price to give the random number and do external work
    //so this price based on the price of gas of this blackchain
    
    if(devlopmentChain.includes(network.name)){
        console.log("Deploying VRFCordiantor Mock.......");
        await deploy("VRFCoordinatorV2_5Mock",{
            from:deployer,
            log:true,
            args:[baseFee,gasPriceLink,WEI_PER_UNIT_LINK],

        })
        console.log("Mock eployed");
        console.log("---------------------------------------------");
        
        
    }
}
module.exports=deployVRFCordiantorMock
module.exports.tags=["all","mocks"]