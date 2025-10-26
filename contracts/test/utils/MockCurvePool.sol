// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libs/CurveLike.sol";

contract MockCurvePool is ICurvePlainPool {
    bool public exchangeCalled = false;

    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external override returns (uint256) {
        exchangeCalled = true;
        // Mock profitable exchange: return 1.05x input amount
        return dx * 105 / 100;
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
