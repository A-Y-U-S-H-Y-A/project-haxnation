## Procedure
* **Vulnerability:** Accounting Logic Flaw / Flash Loan Exploit
* **Concept:** The smart contract failed to safely synchronize its physical ETH balance with its internal ledger during a flash loan execution.
* **Exploit Steps:**
  1. Analyzed the contract and found that the flash loan function did not protect against re-depositing the loaned amount within the same transaction.
  2. Deployed a custom `SuperAttacker` smart contract.
  3. Initiated a `flashLoan()` for the vault's entire balance.
  4. Inside my contract's `receive()` fallback function, I immediately called the `deposit()` function with the loaned ETH.
  5. The vault marked the loan as repaid (since its total physical balance didn't decrease) but simultaneously credited my account's internal balance ledger.
  6. Finally, called `withdraw()` to legally drain the entire vault balance to 0.

## Solution by
- Aryan Ubale
