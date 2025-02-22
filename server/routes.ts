const transactionId = parseInt(req.params.id);
const existingTransaction = await db.query.transactions.findFirst({
  where: eq(transactions.id, transactionId)
});

if (!existingTransaction) {
  return res.status(404).json({ message: 'Transaction not found' });
}

// Update all transactions with the same description and category to maintain consistency
const oldDescription = existingTransaction.description.toLowerCase();
const newDescription = req.body.description.toLowerCase();

// Start a transaction to ensure all updates happen together
let updatedTransaction;
try {
  await db.transaction(async (tx) => {
    // First update the specific transaction
    [updatedTransaction] = await tx.update(transactions)
      .set({
        description: req.body.description,
        amount: req.body.amount,
        date: new Date(req.body.date),
        type: req.body.type,
        category_id: req.body.category_id
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    // Then update all related transactions to maintain consistency
    if (oldDescription !== newDescription || existingTransaction.category_id !== req.body.category_id) {
      await tx.update(transactions)
        .set({
          description: req.body.description,
          category_id: req.body.category_id
        })
        .where(
          and(
            eq(transactions.type, existingTransaction.type),
            ilike(transactions.description, oldDescription),
            eq(transactions.category_id, existingTransaction.category_id)
          )
        );
    }
  });
} catch (error) {
  console.error('[Transactions API] Transaction update failed:', error);
  throw error;
}

console.log('[Transactions API] Successfully updated transaction:', updatedTransaction);

// Add aggressive cache control headers
res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');

res.json(updatedTransaction);
} catch (error) {
console.error('[Transactions API] Error updating transaction:', error);
res.status(400).json({
  message: error instanceof Error ? error.message : 'Invalid request data'
});
}
});

app.delete('/api/transactions/:id', async (req, res) => {
try {
const transactionId = parseInt(req.params.id, 10);
if (isNaN(transactionId)) {
  return res.status(400).json({
    message: 'Invalid transaction ID',
    error: 'Transaction ID must be a number'
  });
}

console.log('[Transactions API] Attempting to delete transaction:', { id: transactionId });

const transaction = await db.query.transactions.findFirst({
  where: eq(transactions.id, transactionId)
});

if (!transaction) {
  console.log('[Transactions API] Transaction not found:', { id: transactionId });
  return res.status(404).json({
    message: 'Transaction not found',
    error: `No transaction found with ID ${transactionId}`
  });
}

const deleted = await db.delete(transactions)
  .where(eq(transactions.id, transactionId))
  .returning();

if (!deleted.length) {
  throw new Error(`Failed to delete transaction ${transactionId}`);
}

console.log('[Transactions API] Successfully deleted transaction:', {
  id: transactionId,
  deletedCount: deleted.length
});

return res.status(200).json({
  message: 'Transaction deleted successfully',
  deletedId: transactionId
});
} catch (error) {
console.error('[Transactions API] Error in delete transaction handler:', {
  id: req.params.id,
  error: error instanceof Error ? error.message : 'Unknown error'
});

return res.status(500).json({
  message: 'Failed to delete transaction',
  error: process.env.NODE_ENV === 'development'
    ? (error instanceof Error ? error.message : 'Unknown error')
    : 'Internal server error'
});
}
});

app.patch('/api/bills/:id', async (req, res) => {
try {
console.log('[Bills API] Updating bill:', {
  id: req.params.id,
  data: req.body
});

const billId = parseInt(req.params.id);
const existingBill = await db.query.bills.findFirst({
  where: eq(bills.id, billId)
});

if (!existingBill) {
  return res.status(404).json({ message: 'Bill not found' });
}

// Update the bill
const [updatedBill] = await db.update(bills)
  .set({
    name: req.body.name,
    amount: req.body.amount,
    day: req.body.day,
    category_id: req.body.category_id
  })
  .where(eq(bills.id, billId))
  .returning();

// Also update any existing transactions that were generated from this bill
// to maintain consistency in descriptions and amounts
if (existingBill.name !== req.body.name) {
  await db.update(transactions)
    .set({
      description: req.body.name,
      category_id: req.body.category_id
    })
    .where(
      and(
        eq(transactions.category_id, existingBill.category_id),
        ilike(transactions.description, `%${existingBill.name}%`)
      )
    );
}

console.log('[Bills API] Successfully updated bill:', updatedBill);

// Add cache control headers
res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');

res.json(updatedBill);
} catch (error) {
console.error('[Bills API] Error updating bill:', error);
res.status(400).json({
  message: error instanceof Error ? error.message : 'Invalid request data'
});
}
});

const httpServer = createServer(app);
return httpServer;
}
const transactionId = parseInt(req.params.id);
const existingTransaction = await db.query.transactions.findFirst({
  where: eq(transactions.id, transactionId)
});

if (!existingTransaction) {
  return res.status(404).json({ message: 'Transaction not found' });
}

// Update all transactions with the same description and category to maintain consistency
const oldDescription = existingTransaction.description.toLowerCase();
const newDescription = req.body.description.toLowerCase();

// Start a transaction to ensure all updates happen together
let updatedTransaction;
try {
  await db.transaction(async (tx) => {
    // First update the specific transaction
    [updatedTransaction] = await tx.update(transactions)
      .set({
        description: req.body.description,
        amount: req.body.amount,
        date: new Date(req.body.date),
        type: req.body.type,
        category_id: req.body.category_id
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    // Then update all related transactions to maintain consistency
    if (oldDescription !== newDescription || existingTransaction.category_id !== req.body.category_id) {
      await tx.update(transactions)
        .set({
          description: req.body.description,
          category_id: req.body.category_id
        })
        .where(
          and(
            eq(transactions.type, existingTransaction.type),
            ilike(transactions.description, oldDescription),
            eq(transactions.category_id, existingTransaction.category_id)
          )
        );
    }
  });
} catch (error) {
  console.error('[Transactions API] Transaction update failed:', error);
  throw error;
}

console.log('[Transactions API] Successfully updated transaction:', updatedTransaction);

// Add aggressive cache control headers
res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');

res.json(updatedTransaction);
} catch (error) {
console.error('[Transactions API] Error updating transaction:', error);
res.status(400).json({
  message: error instanceof Error ? error.message : 'Invalid request data'
});
}
});

app.delete('/api/transactions/:id', async (req, res) => {
try {
const transactionId = parseInt(req.params.id, 10);
if (isNaN(transactionId)) {
  return res.status(400).json({
    message: 'Invalid transaction ID',
    error: 'Transaction ID must be a number'
  });
}

console.log('[Transactions API] Attempting to delete transaction:', { id: transactionId });

const transaction = await db.query.transactions.findFirst({
  where: eq(transactions.id, transactionId)
});

if (!transaction) {
  console.log('[Transactions API] Transaction not found:', { id: transactionId });
  return res.status(404).json({
    message: 'Transaction not found',
    error: `No transaction found with ID ${transactionId}`
  });
}

const deleted = await db.delete(transactions)
  .where(eq(transactions.id, transactionId))
  .returning();

if (!deleted.length) {
  throw new Error(`Failed to delete transaction ${transactionId}`);
}

console.log('[Transactions API] Successfully deleted transaction:', {
  id: transactionId,
  deletedCount: deleted.length
});

return res.status(200).json({
  message: 'Transaction deleted successfully',
  deletedId: transactionId
});
} catch (error) {
console.error('[Transactions API] Error in delete transaction handler:', {
  id: req.params.id,
  error: error instanceof Error ? error.message : 'Unknown error'
});

return res.status(500).json({
  message: 'Failed to delete transaction',
  error: process.env.NODE_ENV === 'development'
    ? (error instanceof Error ? error.message : 'Unknown error')
    : 'Internal server error'
});
}
});

app.patch('/api/bills/:id', async (req, res) => {
try {
console.log('[Bills API] Updating bill:', {
  id: req.params.id,
  data: req.body
});

const billId = parseInt(req.params.id);
const existingBill = await db.query.bills.findFirst({
  where: eq(bills.id, billId)
});

if (!existingBill) {
  return res.status(404).json({ message: 'Bill not found' });
}

// Update the bill
const [updatedBill] = await db.update(bills)
  .set({
    name: req.body.name,
    amount: req.body.amount,
    day: req.body.day,
    category_id: req.body.category_id
  })
  .where(eq(bills.id, billId))
  .returning();

// Also update any existing transactions that were generated from this bill
// to maintain consistency in descriptions and amounts
if (existingBill.name !== req.body.name) {
  await db.update(transactions)
    .set({
      description: req.body.name,
      category_id: req.body.category_id
    })
    .where(
      and(
        eq(transactions.category_id, existingBill.category_id),
        ilike(transactions.description, `%${existingBill.name}%`)
      )
    );
}

console.log('[Bills API] Successfully updated bill:', updatedBill);

// Add cache control headers
res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');

res.json(updatedBill);
} catch (error) {
console.error('[Bills API] Error updating bill:', error);
res.status(400).json({
  message: error instanceof Error ? error.message : 'Invalid request data'
});
}
});

const httpServer = createServer(app);
return httpServer;
}