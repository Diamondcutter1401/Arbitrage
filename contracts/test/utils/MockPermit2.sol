// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/libs/Permit2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPermit2 is IAllowanceTransfer {
    mapping(address => mapping(address => mapping(address => uint160))) public allowances;
    address public executor;
    bool public transferFromCalled = false;

    function setExecutor(address _executor) external {
        executor = _executor;
    }

    function setAllowance(address from, address spender, address token, uint160 amount) external {
        allowances[from][spender][token] = amount;
    }

    function transferFrom(
        address from,
        address to,
        uint160 amount,
        address token
    ) external override {
        require(msg.sender == executor, "only executor");
        require(allowances[from][msg.sender][token] >= amount, "insufficient allowance");
        
    allowances[from][msg.sender][token] -= amount;
    // Chuyển trực tiếp từ balance của Permit2 mock sang 'to'.
    // Dùng transfer thay vì transferFrom để không cần allowance ERC20 từ address(this) -> msg.sender.
    IERC20(token).transfer(to, amount);
        transferFromCalled = true;
    }

    function approve(
        address spender,
        uint160 amount,
        address token,
        uint48 expiration
    ) external override {
        // Mock approval - in real implementation this would set allowance
    }
}
