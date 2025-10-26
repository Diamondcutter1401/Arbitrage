// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAllowanceTransfer {
    function transferFrom(
        address from,
        address to,
        uint160 amount,
        address token
    ) external;

    function approve(
        address spender,
        uint160 amount,
        address token,
        uint48 expiration
    ) external;
}
