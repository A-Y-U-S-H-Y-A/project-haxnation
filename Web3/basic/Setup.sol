// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TargetPractice.sol";

contract Setup {
    mapping(address => TargetPractice) public instances;
    mapping(address => bool) public hasInstance;
    mapping(address => bool) public isWinner;

    event InstanceCreated(address indexed player, address instanceAddress);
    event FlagCaptured(address indexed player);

    function createInstance() external {
        require(!hasInstance[msg.sender], "Instance already created");
        
        TargetPractice target = new TargetPractice();
        instances[msg.sender] = target;
        hasInstance[msg.sender] = true;
        
        emit InstanceCreated(msg.sender, address(target));
    }

    function captureTheFlag() external {
        require(hasInstance[msg.sender], "You must create an instance first");
        require(!isWinner[msg.sender], "You have already captured the flag!");

        TargetPractice target = instances[msg.sender];
        require(target.isTargetHit(), "Target not hit yet! Keep trying.");

        isWinner[msg.sender] = true;
        emit FlagCaptured(msg.sender);
    }
}