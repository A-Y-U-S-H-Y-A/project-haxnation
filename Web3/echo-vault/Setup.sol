// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./EchoVault.sol";

contract Setup {
    mapping(address => EchoVault) public instances;
    mapping(address => bool) public hasInstance;
    mapping(address => bool) public isWinner;

    event InstanceCreated(address indexed player, address instanceAddress);
    event FlagCaptured(address indexed player);

    // Players must send exactly 0.01 ETH to fund their isolated vault
    function createInstance() external payable {
        require(!hasInstance[msg.sender], "Instance already created");
        require(msg.value == 0.01 ether, "Must send exactly 0.01 ETH to fund the vault");
        
        EchoVault vault = new EchoVault();
        
        // Deposit the player's 0.01 ETH into their specific vault
        vault.deposit{value: msg.value}();
        
        instances[msg.sender] = vault;
        hasInstance[msg.sender] = true;
        
        emit InstanceCreated(msg.sender, address(vault));
    }

    // Serverless validation
    function captureTheFlag() external {
        require(hasInstance[msg.sender], "You must create an instance first");
        require(!isWinner[msg.sender], "You have already captured the flag!");

        EchoVault vault = instances[msg.sender];
        
        // The win condition: the vault's native ETH balance must be drained to 0
        require(address(vault).balance == 0, "Vault is not empty yet. Keep trying!");

        isWinner[msg.sender] = true;
        emit FlagCaptured(msg.sender);
    }
}