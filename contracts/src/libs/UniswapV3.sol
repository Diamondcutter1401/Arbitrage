// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV3Router {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

interface IQuoterV2 {
    function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut);
}
