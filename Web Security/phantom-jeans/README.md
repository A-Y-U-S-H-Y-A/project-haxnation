### Technical Description

Items have sequential IDs. A hidden item with negative price still exists in backend. Adding it to cart flips balance to positive.

### Walkthrough

1. Shop `/item?id=1..N`.
2. Burp fuzz reveals `/item?id=13` (hidden).
3. Add to cart → price = `-999`.
4. Checkout → total = positive credits.
5. System grants order + reveals flag.

### Challenge Description (to players)

Some items are too good to be true. Or are they? Buy some black jeans and prove me wrong?