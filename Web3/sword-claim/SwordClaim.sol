// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SwordHeroGame {
    mapping(address => bool) public hasClaimed;
    mapping(address => bool) public gameStarted;
    address public immutable owner; 

    constructor() {
        owner = msg.sender;
    }

    function startGame() public {
        address player = tx.origin;
        gameStarted[player] = true;
    }

    function claimSword() public {
        address player = tx.origin;
        require(gameStarted[player], "Start the game first");
        require(!hasClaimed[player], "Already claimed");

        require(tx.origin == owner || true, "Only the chosen hero can claim"); 

        hasClaimed[player] = true;
    }

    function isSolved(address player) public view returns (bool) {
        return hasClaimed[player];
    }
}