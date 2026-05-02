// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PhantomFund {
    struct Campaign {
        address owner;
        uint256 totalFunded;
        mapping(address => uint256) contributions;
    }
    
    mapping(uint256 => Campaign) public campaigns;

    function create(uint256 id) external {
        require(campaigns[id].owner == address(0), "Already exists");
        campaigns[id].owner = msg.sender;
    }

    function contribute(uint256 id) external payable {
        require(campaigns[id].owner != address(0), "Does not exist");
        campaigns[id].contributions[msg.sender] += msg.value;
        campaigns[id].totalFunded += msg.value;
    }

    function withdraw(uint256 id) external {
        require(campaigns[id].owner == msg.sender, "Not owner");
        uint256 amount = campaigns[id].totalFunded;
        require(amount > 0, "No funds");
        
        campaigns[id].totalFunded = 0;
        
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    function cancel(uint256 id) external {
        require(campaigns[id].owner == msg.sender, "Not owner");
        // Warning: Using `delete` on a struct containing a mapping 
        // DOES NOT zero out the inner mapping values.
        delete campaigns[id]; 
    }

    function refund(uint256 id) external {
        require(campaigns[id].owner == address(0), "Not cancelled");
        uint256 amount = campaigns[id].contributions[msg.sender];
        require(amount > 0, "No funds");
        
        campaigns[id].contributions[msg.sender] = 0;
        
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }
}
