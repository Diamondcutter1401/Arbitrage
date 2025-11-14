// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/libs/UniswapV3.sol";
import "./MockERC20.sol";

contract MockUniswapV3Router is IUniswapV3Router {
    function exactInput(ExactInputParams calldata params) external payable override returns (uint256 amountOut) {
        // Decode path: tokenIn (20) + fee (3) + tokenOut (20)
        require(params.path.length >= 43, "invalid path");
        // Copy to memory to safely slice
        bytes memory pathMem = params.path;
        uint256 start = pathMem.length - 20; // start of tokenOut
        address tokenOut;
        assembly {
            tokenOut := shr(96, mload(add(add(pathMem, 0x20), start)))
        }

        // Mock profitable swap: mint 1.1x output to caller
        amountOut = params.amountIn * 110 / 100;
        MockERC20(tokenOut).mint(msg.sender, amountOut);
    }
}
