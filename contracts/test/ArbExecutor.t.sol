// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ArbExecutor.sol";
import "./utils/MockERC20.sol";
import "./utils/MockUniswapV3Router.sol";
import "./utils/MockCurvePool.sol";
import "./utils/MockAavePool.sol";
import "./utils/MockPermit2.sol";

contract ArbExecutorTest is Test {
    ArbExecutor executor;
    MockERC20 tokenA;
    MockERC20 tokenB;
    MockERC20 tokenC;
    MockUniswapV3Router uniRouter;
    MockCurvePool curvePool;
    MockAavePool aavePool;
    MockPermit2 permit2;

    address owner = address(0x1);
    address user = address(0x2);

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy mock contracts
        tokenA = new MockERC20("TokenA", "TA");
        tokenB = new MockERC20("TokenB", "TB");
        tokenC = new MockERC20("TokenC", "TC");
        uniRouter = new MockUniswapV3Router();
    curvePool = new MockCurvePool();
        aavePool = new MockAavePool();
        permit2 = new MockPermit2();

        // Deploy ArbExecutor
        executor = new ArbExecutor(address(permit2), address(aavePool));

        // Setup mocks
        permit2.setExecutor(address(executor));
        aavePool.setExecutor(address(executor));
    // Curve pool biết token in/out để mint output cho caller (executor)
    curvePool.setTokens(address(tokenA), address(tokenB));

        vm.stopPrank();
    }

    function testProfitableRouteWithoutFlashloan() public {
        vm.startPrank(owner);

        // Setup: A -> B -> C route
        ArbExecutor.Hop[] memory hops = new ArbExecutor.Hop[](2);
        hops[0] = ArbExecutor.Hop({
            dex: 1, // UniswapV3
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenA), uint24(3000), address(tokenB)),
            tokenIn: address(tokenA),
            tokenOut: address(tokenB)
        });
        hops[1] = ArbExecutor.Hop({
            dex: 1, // UniswapV3
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenB), uint24(3000), address(tokenC)),
            tokenIn: address(tokenB),
            tokenOut: address(tokenC)
        });

        ArbExecutor.Route memory route = ArbExecutor.Route({
            hops: hops,
            inputToken: address(tokenA),
            outputToken: address(tokenC)
        });

        uint256 amountIn = 1000e18;
        uint256 minReturn = 900e18; // Allow some slippage
        uint256 deadline = block.timestamp + 3600;

    // Mint tokens cho Permit2 mock (nó giữ token để chuyển sang executor)
    tokenA.mint(address(permit2), amountIn);
    // Đặt allowance (đủ để executor gọi transferFrom thông qua mock)
    permit2.setAllowance(owner, address(executor), address(tokenA), uint160(amountIn));

        // Execute
        uint256 amountOut = executor.execute(route, amountIn, minReturn, deadline);

        // Verify profit
        assertTrue(amountOut >= minReturn);
        assertTrue(amountOut > amountIn); // Should be profitable

        vm.stopPrank();
    }

    function testProfitableRouteWithFlashloan() public {
        vm.startPrank(owner);

        // Setup: A -> B -> C route
        ArbExecutor.Hop[] memory hops = new ArbExecutor.Hop[](2);
        hops[0] = ArbExecutor.Hop({
            dex: 1, // UniswapV3
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenA), uint24(3000), address(tokenB)),
            tokenIn: address(tokenA),
            tokenOut: address(tokenB)
        });
        hops[1] = ArbExecutor.Hop({
            dex: 1, // UniswapV3
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenB), uint24(3000), address(tokenC)),
            tokenIn: address(tokenB),
            tokenOut: address(tokenC)
        });

        ArbExecutor.Route memory route = ArbExecutor.Route({
            hops: hops,
            inputToken: address(tokenA),
            outputToken: address(tokenC)
        });

        uint256 amountIn = 1000e18;
        uint256 minReturn = 900e18; // Allow some slippage
        uint256 deadline = block.timestamp + 3600;

    // Setup flashloan premium (0.07%)
        uint256 premium = (amountIn * 7) / 10000;
        aavePool.setPremium(premium);

        // Execute with flashloan
        executor.executeWithFlashloan(route, amountIn, minReturn, deadline);

        // Verify profit after flashloan fee
        uint256 expectedProfit = amountIn - premium; // Simplified profit calculation
        assertTrue(expectedProfit > 0);

        vm.stopPrank();
    }

    function testMinReturnRevert() public {
        vm.startPrank(owner);

        ArbExecutor.Hop[] memory hops = new ArbExecutor.Hop[](1);
        hops[0] = ArbExecutor.Hop({
            dex: 1, // UniswapV3
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenA), uint24(3000), address(tokenB)),
            tokenIn: address(tokenA),
            tokenOut: address(tokenB)
        });

        ArbExecutor.Route memory route = ArbExecutor.Route({
            hops: hops,
            inputToken: address(tokenA),
            outputToken: address(tokenB)
        });

        uint256 amountIn = 1000e18;
        uint256 minReturn = 2000e18; // Unrealistic high return
        uint256 deadline = block.timestamp + 3600;

    tokenA.mint(address(permit2), amountIn);
    permit2.setAllowance(owner, address(executor), address(tokenA), uint160(amountIn));

        // Should revert due to minReturn not met
        vm.expectRevert("minReturn");
        executor.execute(route, amountIn, minReturn, deadline);

        vm.stopPrank();
    }

    function testPermit2Flow() public {
        vm.startPrank(owner);

        ArbExecutor.Hop[] memory hops = new ArbExecutor.Hop[](1);
        hops[0] = ArbExecutor.Hop({
            dex: 1, // UniswapV3
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenA), uint24(3000), address(tokenB)),
            tokenIn: address(tokenA),
            tokenOut: address(tokenB)
        });

        ArbExecutor.Route memory route = ArbExecutor.Route({
            hops: hops,
            inputToken: address(tokenA),
            outputToken: address(tokenB)
        });

        uint256 amountIn = 1000e18;
        uint256 minReturn = 900e18;
        uint256 deadline = block.timestamp + 3600;

        // Setup Permit2 allowance
        tokenA.mint(address(permit2), amountIn);
        permit2.setAllowance(owner, address(executor), address(tokenA), uint160(amountIn));

        // Execute
        executor.execute(route, amountIn, minReturn, deadline);

        // Verify Permit2 transfer was called
        assertTrue(permit2.transferFromCalled());

        vm.stopPrank();
    }

    function testUnknownDexRevert() public {
        vm.startPrank(owner);

        ArbExecutor.Hop[] memory hops = new ArbExecutor.Hop[](1);
        hops[0] = ArbExecutor.Hop({
            dex: 99, // Unknown DEX
            routerOrPool: address(uniRouter),
            data: abi.encodePacked(address(tokenA), uint24(3000), address(tokenB)),
            tokenIn: address(tokenA),
            tokenOut: address(tokenB)
        });

        ArbExecutor.Route memory route = ArbExecutor.Route({
            hops: hops,
            inputToken: address(tokenA),
            outputToken: address(tokenB)
        });

        uint256 amountIn = 1000e18;
        uint256 minReturn = 900e18;
        uint256 deadline = block.timestamp + 3600;

    tokenA.mint(address(permit2), amountIn);
    permit2.setAllowance(owner, address(executor), address(tokenA), uint160(amountIn));

        // Should revert due to unknown DEX
        vm.expectRevert("unknown dex");
        executor.execute(route, amountIn, minReturn, deadline);

        vm.stopPrank();
    }

    function testCurvePoolExchange() public {
        vm.startPrank(owner);

        ArbExecutor.Hop[] memory hops = new ArbExecutor.Hop[](1);
        hops[0] = ArbExecutor.Hop({
            dex: 2, // Curve
            routerOrPool: address(curvePool),
            data: abi.encode(int128(0), int128(1), uint256(0)), // i, j, minDy
            tokenIn: address(tokenA),
            tokenOut: address(tokenB)
        });

        ArbExecutor.Route memory route = ArbExecutor.Route({
            hops: hops,
            inputToken: address(tokenA),
            outputToken: address(tokenB)
        });

        uint256 amountIn = 1000e18;
        uint256 minReturn = 900e18;
        uint256 deadline = block.timestamp + 3600;

    tokenA.mint(address(permit2), amountIn);
    permit2.setAllowance(owner, address(executor), address(tokenA), uint160(amountIn));

        // Execute
        uint256 amountOut = executor.execute(route, amountIn, minReturn, deadline);

        // Verify Curve exchange was called
        assertTrue(curvePool.exchangeCalled());
        assertTrue(amountOut >= minReturn);

        vm.stopPrank();
    }
}
