## Procedure
* **Vulnerability:** Incomplete Struct Deletion (Stale Mapping Flaw)
* **Concept:** Using the `delete` keyword on a struct that contains a mapping does not clear the inner mapping's data. 
* **Exploit Steps:**
  1. Deployed an attacker contract and funded it with 0.01 ETH.
  2. Created a new campaign using `create(123)` and sent 0.01 ETH via `contribute(123)`.
  3. Withdrew the funds normally using `withdraw(123)`. This reset `totalFunded` to 0, but my contribution record remained in the mapping.
  4. Called `cancel(123)` to delete the campaign. This bypassed the active state and reset the owner address to `address(0)`.
  5. Called `refund(123)`. Since the owner was `address(0)`, the require check passed. The contract used my stale balance in the `contributions` mapping to send me another 0.01 ETH, successfully draining the target's existing whale funds.

## Solution by
- Aryan Ubale
