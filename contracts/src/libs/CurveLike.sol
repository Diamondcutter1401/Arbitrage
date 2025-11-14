// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICurvePlainPool {
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);

    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
}

interface ICurveRegistry {
    function get_pool_from_lp_token(address lp_token) external view returns (address);
    function get_coins(address pool) external view returns (address[8] memory);
}
