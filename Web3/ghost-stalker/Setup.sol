// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./GhostStaker.sol";

contract Setup {
    mapping(address => GhostStaker) public instances;
    mapping(address => bool) public hasInstance;
    mapping(address => bool) public isWinner;

    event InstanceCreated(address indexed player, address instanceAddress);
    event FlagCaptured(address indexed player);

    function createInstance() external {
        require(!hasInstance[msg.sender], "Instance already created");
        
        GhostStaker staker = new GhostStaker();
        instances[msg.sender] = staker;
        hasInstance[msg.sender] = true;
        
        emit InstanceCreated(msg.sender, address(staker));
    }

    function captureTheFlag() external {
        require(hasInstance[msg.sender], "You must create an instance first");
        require(!isWinner[msg.sender], "You have already captured the flag!");

        GhostStaker staker = instances[msg.sender];
        require(staker.proposalVotes() >= 3, "Challenge not solved yet. Keep trying!");

        isWinner[msg.sender] = true;
        emit FlagCaptured(msg.sender);
    }
}