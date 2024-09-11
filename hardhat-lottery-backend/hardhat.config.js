const { version } = require('chai');

/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("@nomicfoundation/hardhat-chai-matchers");//if chai revertedWith not working i this
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()
module.exports = {
  // solidity: "0.8.24",
  solidity:{
    compilers:[
      {version:"0.8.24"},
      {version:"0.4.11"}
    ]
  },
  defaultNetwork:"hardhat",
    networks:{
    sepolia:{
      url:process.env.SEPOLIA_RPC_URL,
      accounts:[process.env.SEPOLIA_PRIVATE_KEY],
      chainId:11155111,
      // blockConfirmation:1
    }
  },
  etherscan:{
    apiKey:process.env.ETHERSCAN_API_KEY
  },
  gasReporter:{
    enabled:true,
    outputFile:"gas-reporter.txt",
    noColors:true,
    currency:"USD",
    coinmarketcap:"9af45011-aef4-408e-8e2d-0def31ec3bd4",
    offline:true,
    token: "ETH",
  },
  namedAccounts:{
    deployer:{
      default:0
    },
    users:{
      default:1
    }
  },
  mocha:{
    timeout: 500000, //200sec
  }
};
