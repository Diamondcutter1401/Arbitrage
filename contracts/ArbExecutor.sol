// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libs/Permit2.sol";
import "./libs/UniswapV3.sol";
import "./libs/CurveLike.sol";
import "./libs/AaveV3.sol";
import "./libs/SafeTransferLib.sol";

contract ArbExecutor is IFlashLoanSimpleReceiver {
    using SafeTransferLib for address;

    address public immutable OWNER;
    address public immutable PERMIT2;  // 0x000000000022D473030F116dDEE9F6B43aC78BA3 (verify per chain)
    IAaveV3Pool public immutable AAVE;

    struct Hop {
        uint8 dex;           // 1=Univ3, 2=Curve
        address routerOrPool;
        bytes   data;        // encoded params (for v3 path or curve i/j/minOut)
        address tokenIn;
        address tokenOut;
    }

    struct Route {
        Hop[] hops;          // length 2 or 3
        address inputToken;
        address outputToken;
    }

    modifier onlyOwner() { require(msg.sender == OWNER, "not owner"); _; }

    constructor(address _permit2, address _aavePool) {
        OWNER = msg.sender;
        PERMIT2 = _permit2;
        AAVE = IAaveV3Pool(_aavePool);
    }

    function execute(Route calldata route, uint256 amountIn, uint256 minReturn, uint256 deadline)
        external
        onlyOwner
        returns (uint256 amountOut)
    {
        require(block.timestamp <= deadline, "expired");

        // Pull tokens via Permit2 (owner pre-signed permit off-chain)
        IAllowanceTransfer(PERMIT2).transferFrom(
            msg.sender,
            address(this),
            uint160(amountIn),
            route.inputToken
        );

        amountOut = _run(route, amountIn);
        require(amountOut >= minReturn, "minReturn");

        // Send proceeds back to owner
        route.outputToken.safeTransfer(msg.sender, amountOut);
    }

    // ---- Flashloan path ----
    function executeWithFlashloan(Route calldata route, uint256 amountIn, uint256 minReturn, uint256 deadline)
        external
        onlyOwner
    {
        require(block.timestamp <= deadline, "expired");
        // borrow inputToken amountIn; we repay inside executeOperation
        AAVE.flashLoanSimple(address(this), route.inputToken, amountIn, abi.encode(route, minReturn), 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address, /*initiator*/
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(AAVE), "only AAVE");

        (Route memory route, uint256 minReturn) = abi.decode(params, (Route, uint256));
        uint256 outAmt = _run(route, amount);

        // repay
        uint256 repayAmt = amount + premium;
        require(outAmt >= repayAmt && outAmt >= minReturn, "unprofitable");

        route.outputToken.safeTransfer(address(AAVE), repayAmt);

        // send profit to owner
        uint256 profit = outAmt - repayAmt;
        if (profit > 0) route.outputToken.safeTransfer(OWNER, profit);
        return true;
    }

    // ---- Internal swap runner ----
    function _run(Route memory route, uint256 amtIn) internal returns (uint256 amtOut) {
        address token = route.inputToken;
        uint256 amount = amtIn;

        for (uint i = 0; i < route.hops.length; i++) {
            Hop memory h = route.hops[i];
            require(h.tokenIn == token, "path mismatch");

            if (h.dex == 1) {
                // Uniswap v3: data = encoded bytes path for exactInput
                // Requires allowance to router via Permit2
                IAllowanceTransfer(PERMIT2).approve(h.routerOrPool, uint160(amount), token, uint48(block.timestamp + 3600));
                IUniswapV3Router.ExactInputParams memory p = IUniswapV3Router.ExactInputParams({
                    path: h.data,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amount,
                    amountOutMinimum: 0
                });
                amount = IUniswapV3Router(h.routerOrPool).exactInput(p);
            } else if (h.dex == 2) {
                // Curve-like pool: data = abi.encode(int128 i, int128 j, uint256 minDy)
                (int128 i, int128 j, uint256 minDy) = abi.decode(h.data, (int128, int128, uint256));
                token.safeApprove(h.routerOrPool, amount);
                amount = ICurvePlainPool(h.routerOrPool).exchange(i, j, amount, minDy);
            } else {
                revert("unknown dex");
            }

            token = h.tokenOut;
        }

        amtOut = amount;
    }

    // --- admin utilities ---
    function rescue(address token, uint256 amt) external onlyOwner {
        token.safeTransfer(OWNER, amt);
    }
}
