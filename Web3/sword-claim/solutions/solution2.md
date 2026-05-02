## Procedure
* **Vulnerability:** Access Control Flaw / Constructor Typo
* **Concept:** A typo in the contract's initialization rules allowed any user to claim ownership of the sword instead of just the deployer.
* **Exploit Steps:**
  1. Connected MetaMask to the CTF Target Interface.
  2. Analyzed the contract ABI and found the unprotected state-changing function.
  3. Directly interacted with the contract to trigger the claim function.
  4. Successfully bypassed the intended deployer-only restriction and claimed the asset.

## Solution by
- Aryan Ubale
