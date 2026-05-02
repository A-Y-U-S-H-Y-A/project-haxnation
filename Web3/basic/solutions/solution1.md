## Procedure

* **Vulnerability:** Publicly Readable State Variable  
* **Concept:** Everything on the blockchain is visible. State variables marked as public automatically generate getter functions, allowing anyone to read "secret" data directly from the contract state.  
* **Exploit Steps:**
  1. Connected to the TargetPractice contract instance via a block explorer or UI.  
  2. Executed a "Read" call on the public secretAim variable to reveal the pseudo-randomly generated number.
  3. Initiated a "Write" transaction to call the shoot(uint256 _aim) function.  
  4. Passed the exact number retrieved from secretAim as the _aim argument to bypass the require(_aim == secretAim) check.  
  5. The transaction successfully executed, setting isTargetHit = true and capturing the flag.

## Solution by
- Ayushya Shah
