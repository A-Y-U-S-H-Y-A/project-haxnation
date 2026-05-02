// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SwordClaim.sol";

contract Setup {
    mapping(address => SwordHeroGame) public instances;
    mapping(address => bool) public hasInstance;
    mapping(address => bool) public isWinner;

    event InstanceCreated(address indexed player, address instanceAddress);
    event FlagCaptured(address indexed player);

    // Creates an isolated game instance for the player
    function createInstance() external {
        require(!hasInstance[msg.sender], "Instance already created");
        
        SwordHeroGame game = new SwordHeroGame();
        
        instances[msg.sender] = game;
        hasInstance[msg.sender] = true;
        
        emit InstanceCreated(msg.sender, address(game));
    }

    // Checks if the player successfully claimed the sword
    function captureTheFlag() external {
        require(hasInstance[msg.sender], "You must create an instance first");
        require(!isWinner[msg.sender], "You have already captured the flag!");

        SwordHeroGame game = instances[msg.sender];
        
        // We pass msg.sender to check if the specific player claimed it
        require(game.isSolved(msg.sender), "The sword is still in the stone! Keep trying.");

        isWinner[msg.sender] = true;
        emit FlagCaptured(msg.sender);
    }
}