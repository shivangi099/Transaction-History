// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/transactionhistory';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  // Once connected, you can start querying and displaying data from MongoDB
  Transaction.find({})
    .then(transactions => {
      console.log('Transactions:', transactions);
    })
    .catch(err => {
      console.error('Error fetching transactions:', err);
    });
})
.catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

// MongoDB Schema
const transactionSchema = new mongoose.Schema({
  type: String,
  amount: Number,
  balance: Number,
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add this line
app.use(express.static(path.join(__dirname, 'public')));

// Function to play sound

// HTML routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'styles.css'));
});

// API routes
app.post('/credit', async (req, res) => {
  const { amount } = req.body;
  if (amount < 0) {
    return res.status(400).send('Please enter a valid amount');
  }
  try {
    const newTransaction = new Transaction({ type: 'Credit', amount });
    await newTransaction.save();
    
    // Update balance
    const transactions = await Transaction.find();
    const totalCredit = transactions.reduce((acc, curr) => curr.type === 'Credit' ? acc + curr.amount : acc, 0);
    const totalDebit = transactions.reduce((acc, curr) => curr.type === 'Debit' ? acc + curr.amount : acc, 0);
    const totalBalance = totalCredit - totalDebit;
    
    newTransaction.balance = totalBalance;
    await newTransaction.save();

    // Play sound for credit successful

    res.send(`Credit successful. Amount: ${amount}`);
    console.log(`Credit Transaction: Amount = ${amount}, New Balance = ${newTransaction.balance}`); // Log the transaction details
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});


app.post('/debit', async (req, res) => {
  const { amount } = req.body;
  if (amount < 0) {
    return res.status(400).send('Please enter a valid amount');
  }
  try {
    const transactions = await Transaction.find();
    const totalCredit = transactions.reduce((acc, curr) => curr.type === 'Credit' ? acc + curr.amount : acc, 0);
    const totalDebit = transactions.reduce((acc, curr) => curr.type === 'Debit' ? acc + curr.amount : acc, 0);
    const totalBalance = totalCredit - totalDebit;

    if (amount > totalBalance) {
      res.status(400).send('Insufficient balance');
    } else {
      const newTransaction = new Transaction({ type: 'Debit', amount });
      await newTransaction.save();
      
      // Update balance
      newTransaction.balance = totalBalance - amount;
      await newTransaction.save();


      res.send(`Debit successful. Amount: ${amount}`);
      console.log(`Debit Transaction: Amount = ${amount}, New Balance = ${newTransaction.balance}`); // Log the transaction details
    }
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.get('/balance', async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const latestTransaction = transactions[transactions.length - 1];
    const balance = latestTransaction ? latestTransaction.balance : 0;
    res.send(`Total Balance: ${balance}`);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.get('/history', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: 'desc' });
    res.json(transactions);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});