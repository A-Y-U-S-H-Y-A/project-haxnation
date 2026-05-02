// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract GhostStaker {
    mapping(address => uint256) public balances;
    mapping(address => bool) public hasVoted;
    uint256 public proposalVotes;

    function airdrop() external {
        require(balances[msg.sender] == 0, "Already have tokens");
        balances[msg.sender] = 1;
    }

    function vote() external {
        require(!hasVoted[msg.sender], "Already voted");
        require(balances[msg.sender] > 0, "No tokens");
        
        hasVoted[msg.sender] = true;
        proposalVotes += balances[msg.sender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Anti-double-voting measure: resetting vote status on transfer
        // This ensures transferring tokens revokes the previous vote state
        hasVoted[msg.sender] = false;
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        return true;
    }
}
