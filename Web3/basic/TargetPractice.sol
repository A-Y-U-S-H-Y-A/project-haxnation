// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TargetPractice {
    // 1. A public variable. Block explorers automatically create a "Read" button for this.
    uint256 public secretAim;
    
    // 2. The win condition variable.
    bool public isTargetHit;

    constructor() {
        // Generates a unique, pseudo-random number between 0 and 9999 for each player
        secretAim = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 10000;
        isTargetHit = false;
    }

    // 3. A state-changing function. Players must use a "Write" transaction to call this.
    function shoot(uint256 _aim) external {
        require(!isTargetHit, "Target already hit!");
        require(_aim == secretAim, "Missed! Try reading the 'secretAim' variable first.");
        
        // If they pass the exact right number, they win!
        isTargetHit = true;
    }
}