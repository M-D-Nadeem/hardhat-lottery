const { run } = require("hardhat");

async function verify(address,args) {
    console.log("Verification start for Lottery.....");
    try{
        await run("verify:verify",{
            address:address,
            constructorArguments:args,
        })
    }
    catch(err){
        console.log(err);
        
    }
}
module.exports=verify