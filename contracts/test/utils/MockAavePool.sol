// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libs/AaveV3.sol";

contract MockAavePool is IAaveV3Pool {
    address public executor;
    uint256 public premium;

    function setExecutor(address _executor) external {
        executor = _executor;
    }

    function setPremium(uint256 _premium) external {
        premium = _premium;
    }

    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external override {
        // Mock flashloan: call executeOperation on receiver
        IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
            asset,
            amount,
            premium,
            address(this),
            params
        );
    }
}
