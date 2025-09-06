// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/transactionhistory';

// MongoDB Schema
const transactionSchema = new mongoose.Schema({
  type: String,
  amount: Number,
  balance: Number,
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('âœ… MongoDB connected');
  })
  .catch(err => {
    console.error('âŒ Error connecting to MongoDB:', err);
  });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

// Credit route
app.post('/credit', async (req, res) => {
  const { amount } = req.body;
  if (amount < 0) return res.status(400).send('Please enter a valid amount');

  try {
    const newTransaction = new Transaction({ type: 'Credit', amount });
    await newTransaction.save();

    // Calculate balance
    const transactions = await Transaction.find();
    const totalCredit = transactions.filter(t => t.type === 'Credit').reduce((acc, t) => acc + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = totalCredit - totalDebit;

    newTransaction.balance = totalBalance;
    await newTransaction.save();

    res.send(`Credit successful. Amount: ${amount}`);
    console.log(`í²° Credit: ${amount}, Balance: ${newTransaction.balance}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Debit route
app.post('/debit', async (req, res) => {
  const { amount } = req.body;
  if (amount < 0) return res.status(400).send('Please enter a valid amount');

  try {
    const transactions = await Transaction.find();
    const totalCredit = transactions.filter(t => t.type === 'Credit').reduce((acc, t) => acc + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
    const totalBalance = totalCredit - totalDebit;

    if (amount > totalBalance) {
      return res.status(400).send('Insufficient balance');
    }

    const newTransaction = new Transaction({ type: 'Debit', amount });
    newTransaction.balance = totalBalance - amount;
    await newTransaction.save();

    res.send(`Debit successful. Amount: ${amount}`);
    console.log(`í²¸ Debit: ${amount}, Balance: ${newTransaction.balance}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Balance route
app.get('/balance', async (req, res) => {
  try {
    const latest = await Transaction.findOne().sort({ timestamp: -1 });
    const balance = latest ? latest.balance : 0;
    res.send(`Total Balance: ${balance}`);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// History route
app.get('/history', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`íº€ Server running on http://localhost:${PORT}`);
});

