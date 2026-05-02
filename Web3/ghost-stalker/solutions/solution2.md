## Procedure
* **Vulnerability:** Logic Flaw in Anti-Double-Voting Measure
* **Concept:** The `transfer` function reset the `hasVoted` state to false for the sender, but failed to restrict self-transfers of 0 tokens.
* **Exploit Steps:**
  1. Triggered the `airdrop()` function to receive 1 $GHOST token.
  2. Cast the first vote using `vote()` (`proposalVotes` became 1).
  3. Executed a `transfer()` to my own address with an amount of `0`. 
  4. This bypassed the balance deduction but successfully triggered the `hasVoted[msg.sender] = false` line, resetting my voting status.
  5. Voted again (`proposalVotes` = 2), repeated the 0-token self-transfer exploit, and voted a third time to reach the required 3 `proposalVotes`.

## Solution by
- Aryan Ubale
