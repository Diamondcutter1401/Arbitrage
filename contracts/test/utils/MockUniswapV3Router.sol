// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libs/UniswapV3.sol";

contract MockUniswapV3Router is IUniswapV3Router {
    function exactInput(ExactInputParams calldata params) external payable override returns (uint256 amountOut) {
        // Mock profitable swap: return 1.1x input amount
        amountOut = params.amountIn * 110 / 100;
    }
}
