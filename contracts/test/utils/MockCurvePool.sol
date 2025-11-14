// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/libs/CurveLike.sol";
import "./MockERC20.sol";

contract MockCurvePool is ICurvePlainPool {
    bool public exchangeCalled = false;

    // Cho phép set cặp token vào/ra nhằm mint tokenOut cho caller trong test
    address public tokenIn;
    address public tokenOut;

    function setTokens(address _tokenIn, address _tokenOut) external {
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
    }

    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external override returns (uint256) {
        exchangeCalled = true;
        uint256 outAmt = dx * 105 / 100;
        if (tokenOut != address(0)) {
            MockERC20(tokenOut).mint(msg.sender, outAmt);
        }
        return outAmt;
    }

    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view override returns (uint256) {
        // Mock quote: return 1.05x input amount
        return dx * 105 / 100;
    }
}
