// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArbExecutor.sol";

contract DeployScript is Script {
    // Chain-specific addresses
    // Base mainnet
    address constant BASE_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address constant BASE_AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    
    // Arbitrum mainnet
    address constant ARB_PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address constant ARB_AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;

    function run() external {
        address permit2;
        address aavePool;

        // Determine chain from environment variable CHAIN (defaults to "base")
        // Users can set CHAIN=base or CHAIN=arbitrum before running the script
        string memory chain = vm.envOr("CHAIN", string("base"));
        
        if (keccak256(bytes(chain)) == keccak256(bytes("base"))) {
            permit2 = BASE_PERMIT2;
            aavePool = BASE_AAVE_POOL;
            console.log("Deploying to Base network");
        } else if (keccak256(bytes(chain)) == keccak256(bytes("arbitrum"))) {
            permit2 = ARB_PERMIT2;
            aavePool = ARB_AAVE_POOL;
            console.log("Deploying to Arbitrum network");
        } else {
            revert("Unsupported chain. Set CHAIN=base or CHAIN=arbitrum");
        }

        console.log("Permit2 address:", permit2);
        console.log("Aave Pool address:", aavePool);

        // When using --private-key flag, vm.startBroadcast() will use it automatically
        // No need to pass private key as parameter
        vm.startBroadcast();

        ArbExecutor executor = new ArbExecutor(permit2, aavePool);

        console.log("ArbExecutor deployed at:", address(executor));
        console.log("Owner:", executor.OWNER());
        console.log("Permit2:", executor.PERMIT2());
        console.log("Aave Pool:", address(executor.AAVE()));

        vm.stopBroadcast();
    }
}

