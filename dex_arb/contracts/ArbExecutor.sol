// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ArbExecutor
 * @dev Executes arbitrage trades across multiple DEXes
 * @notice This contract handles the execution of arbitrage strategies
 */
contract ArbExecutor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // DEX identifiers
    uint8 public constant UNI_V3 = 1;
    uint8 public constant CURVE = 2;

    // Hop structure for routing
    struct Hop {
        uint8 dex;           // DEX identifier
        address routerOrPool; // Router or pool address
        bytes data;          // Calldata for the swap
        address tokenIn;     // Input token
        address tokenOut;    // Output token
    }

    // Route structure
    struct Route {
        Hop[] hops;         // Array of hops
        address inputToken; // Starting token
        address outputToken; // Ending token
    }

    // Events
    event ArbitrageExecuted(
        address indexed executor,
        Route route,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit
    );

    event FlashloanExecuted(
        address indexed executor,
        Route route,
        uint256 flashloanAmount,
        uint256 amountOut,
        uint256 profit
    );

    // Flashloan provider (Aave v3)
    address public immutable aavePool;
    
    // Permit2 for token approvals
    address public immutable permit2;

    constructor(address _aavePool, address _permit2) {
        aavePool = _aavePool;
        permit2 = _permit2;
    }

    /**
     * @dev Execute arbitrage with own funds
     * @param route The arbitrage route
     * @param amountIn Amount of input token to swap
     * @param minReturn Minimum amount expected back
     * @param deadline Transaction deadline
     */
    function execute(
        Route calldata route,
        uint256 amountIn,
        uint256 minReturn,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "ArbExecutor: deadline exceeded");
        require(route.hops.length > 0, "ArbExecutor: empty route");
        require(amountIn > 0, "ArbExecutor: zero amount");

        // Transfer input tokens from sender
        IERC20(route.inputToken).safeTransferFrom(
            msg.sender,
            address(this),
            amountIn
        );

        uint256 amountOut = _executeRoute(route, amountIn);

        require(amountOut >= minReturn, "ArbExecutor: insufficient output");

        // Transfer output tokens to sender
        IERC20(route.outputToken).safeTransfer(msg.sender, amountOut);

        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        emit ArbitrageExecuted(msg.sender, route, amountIn, amountOut, profit);
    }

    /**
     * @dev Execute arbitrage with flashloan
     * @param route The arbitrage route
     * @param amountIn Amount of input token to swap
     * @param minReturn Minimum amount expected back
     * @param deadline Transaction deadline
     * @param flashloanAmount Amount to flashloan
     */
    function executeWithFlashloan(
        Route calldata route,
        uint256 amountIn,
        uint256 minReturn,
        uint256 deadline,
        uint256 flashloanAmount
    ) external nonReentrant {
        require(block.timestamp <= deadline, "ArbExecutor: deadline exceeded");
        require(route.hops.length > 0, "ArbExecutor: empty route");
        require(amountIn > 0, "ArbExecutor: zero amount");
        require(flashloanAmount > 0, "ArbExecutor: zero flashloan");

        // Flashloan from Aave
        bytes memory params = abi.encode(route, amountIn, minReturn, msg.sender);
        
        // Call Aave flashloan
        (bool success,) = aavePool.call(
            abi.encodeWithSignature(
                "flashLoan(address,address[],uint256[],uint16[],address,bytes,uint16)",
                address(this),                    // receiver
                _getFlashloanAssets(route),       // assets
                _getFlashloanAmounts(flashloanAmount), // amounts
                new uint16[](0),                  // interestRateModes
                address(this),                    // onBehalfOf
                params,                           // params
                0                                 // referralCode
            )
        );
        
        require(success, "ArbExecutor: flashloan failed");
    }

    /**
     * @dev Aave flashloan callback
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == aavePool, "ArbExecutor: unauthorized");
        require(initiator == address(this), "ArbExecutor: unauthorized initiator");

        // Decode parameters
        (Route memory route, uint256 amountIn, uint256 minReturn, address executor) = 
            abi.decode(params, (Route, uint256, uint256, address));

        // Execute the arbitrage route
        uint256 amountOut = _executeRoute(route, amountIn);

        require(amountOut >= minReturn, "ArbExecutor: insufficient output");

        // Calculate flashloan fee
        uint256 flashloanFee = amounts[0] * premiums[0] / 10000;

        // Repay flashloan + fee
        IERC20(assets[0]).safeTransfer(aavePool, amounts[0] + flashloanFee);

        // Transfer profit to executor
        uint256 profit = amountOut > amounts[0] + flashloanFee ? 
            amountOut - amounts[0] - flashloanFee : 0;
        
        if (profit > 0) {
            IERC20(route.outputToken).safeTransfer(executor, profit);
        }

        emit FlashloanExecuted(executor, route, amounts[0], amountOut, profit);
        
        return true;
    }

    /**
     * @dev Execute a route through multiple hops
     */
    function _executeRoute(Route memory route, uint256 amountIn) 
        internal 
        returns (uint256) 
    {
        uint256 currentAmount = amountIn;
        address currentToken = route.inputToken;

        for (uint256 i = 0; i < route.hops.length; i++) {
            Hop memory hop = route.hops[i];
            
            require(hop.tokenIn == currentToken, "ArbExecutor: token mismatch");
            
            // Approve tokens for the DEX
            IERC20(currentToken).safeApprove(hop.routerOrPool, currentAmount);
            
            // Execute the swap
            if (hop.dex == UNI_V3) {
                currentAmount = _executeUniV3Swap(hop, currentAmount);
            } else if (hop.dex == CURVE) {
                currentAmount = _executeCurveSwap(hop, currentAmount);
            } else {
                revert("ArbExecutor: unsupported DEX");
            }
            
            currentToken = hop.tokenOut;
        }

        require(currentToken == route.outputToken, "ArbExecutor: output token mismatch");
        return currentAmount;
    }

    /**
     * @dev Execute Uniswap v3 swap
     */
    function _executeUniV3Swap(Hop memory hop, uint256 amountIn) 
        internal 
        returns (uint256) 
    {
        (bool success, bytes memory data) = hop.routerOrPool.call(hop.data);
        require(success, "ArbExecutor: UniV3 swap failed");
        
        // Decode the return value (amountOut)
        return abi.decode(data, (uint256));
    }

    /**
     * @dev Execute Curve swap
     */
    function _executeCurveSwap(Hop memory hop, uint256 amountIn) 
        internal 
        returns (uint256) 
    {
        (bool success, bytes memory data) = hop.routerOrPool.call(hop.data);
        require(success, "ArbExecutor: Curve swap failed");
        
        // Decode the return value (amountOut)
        return abi.decode(data, (uint256));
    }

    /**
     * @dev Get flashloan assets array
     */
    function _getFlashloanAssets(Route memory route) 
        internal 
        pure 
        returns (address[] memory) 
    {
        address[] memory assets = new address[](1);
        assets[0] = route.inputToken;
        return assets;
    }

    /**
     * @dev Get flashloan amounts array
     */
    function _getFlashloanAmounts(uint256 amount) 
        internal 
        pure 
        returns (uint256[] memory) 
    {
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        return amounts;
    }

    /**
     * @dev Emergency function to recover stuck tokens
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
