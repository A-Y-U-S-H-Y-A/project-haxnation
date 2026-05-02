// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./PhantomFund.sol";

contract Setup {
    mapping(address => PhantomFund) public instances;
    mapping(address => bool) public hasInstance;
    mapping(address => bool) public isWinner;

    event InstanceCreated(address indexed player, address instanceAddress);
    event FlagCaptured(address indexed player);

    // Player sends 0.01 ETH to fund the "Whale Campaign"
    function createInstance() external payable {
        require(!hasInstance[msg.sender], "Instance already created");
        require(msg.value == 0.01 ether, "Must send exactly 0.01 ETH to fund the whale campaign");
        
        PhantomFund fund = new PhantomFund();
        
        // The Setup contract acts as the dummy whale and funds Campaign 999
        fund.create(999);
        fund.contribute{value: msg.value}(999);
        
        instances[msg.sender] = fund;
        hasInstance[msg.sender] = true;
        
        emit InstanceCreated(msg.sender, address(fund));
    }

    function captureTheFlag() external {
        require(hasInstance[msg.sender], "You must create an instance first");
        require(!isWinner[msg.sender], "You have already captured the flag!");

        PhantomFund fund = instances[msg.sender];
        
        // Win Condition: The contract balance must be completely drained
        require(address(fund).balance == 0, "Fund is not empty yet. Keep trying!");

        isWinner[msg.sender] = true;
        emit FlagCaptured(msg.sender);
    }
}