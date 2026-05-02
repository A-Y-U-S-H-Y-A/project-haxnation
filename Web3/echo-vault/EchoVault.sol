// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EchoVault {
    mapping(address => uint256) public balances;
    uint256 public poolBalance;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        poolBalance += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        poolBalance -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function flashLoan(uint256 amount) external {
        require(poolBalance >= amount, "Not enough liquidity");
        
        uint256 balanceBefore = address(this).balance;
        
        // Optimistic transfer to the caller
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        // Ensure the vault didn't lose any ETH during the transaction
        require(address(this).balance >= balanceBefore, "Flashloan not repaid");
    }
}
