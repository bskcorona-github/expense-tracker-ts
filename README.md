# Expense Tracker TypeScript

A comprehensive expense tracking system written in TypeScript with budget management, categorization, and detailed reporting features.

## Features

- **Expense Management**: Add, update, delete, and track expenses with detailed information
- **Category Organization**: Organize expenses by custom categories
- **Budget Control**: Set monthly budgets with customizable alert thresholds
- **Payment Method Tracking**: Track different payment methods (cash, credit card, etc.)
- **Tagging System**: Add tags to expenses for better organization
- **Recurring Expenses**: Support for recurring expenses (daily, weekly, monthly, yearly)
- **Advanced Filtering**: Filter expenses by date range, category, amount, payment method, and tags
- **Comprehensive Reporting**: Generate detailed summaries and analytics
- **Data Import/Export**: CSV import and export functionality
- **Command-line Interface**: Easy-to-use CLI for all operations
- **Data Persistence**: JSON file storage with automatic backup

## Installation

```bash
npm install
```

## Usage

### Command Line Interface

```bash
# Add a new expense
npm run track add "Groceries" 45.50 "Food" credit_card shopping

# List all expenses
npm run track list

# List expenses by category
npm run track list Food

# View expense summary
npm run track summary

# View monthly summary
npm run track summary -- --month

# Set a budget
npm run track budget Food 300 80

# Delete an expense
npm run track delete <expense-id>

# Export to CSV
npm run track export expenses.csv

# Import from CSV
npm run track import expenses.csv

# Process recurring expenses
npm run track recurring
```

### Programmatic Usage

```typescript
import { ExpenseTracker, PaymentMethod } from "./src/index";

const tracker = new ExpenseTracker("my-expenses.json");

// Add an expense
const expense = tracker.addExpense({
  description: "Coffee",
  amount: 4.5,
  category: "Food & Dining",
  date: new Date(),
  paymentMethod: PaymentMethod.CreditCard,
  tags: ["coffee", "morning"],
});

// Get summary
const summary = tracker.getSummary();
console.log(`Total spent: ${summary.totalExpenses}`);

// Set budget
tracker.setBudget("Food & Dining", 200, 75);

// Filter expenses
const recentExpenses = tracker.getFilteredExpenses({
  dateFrom: new Date("2024-01-01"),
  category: "Food & Dining",
});
```

## API Reference

### ExpenseTracker Class

#### Constructor

```typescript
new ExpenseTracker(dataFile?: string)
```

#### Methods

**Expense Management**

- `addExpense(expense: Omit<Expense, 'id'>): Expense`
- `updateExpense(id: string, updates: Partial<Omit<Expense, 'id'>>): Expense | null`
- `deleteExpense(id: string): boolean`
- `getExpense(id: string): Expense | null`
- `getAllExpenses(): Expense[]`

**Filtering and Search**

- `getFilteredExpenses(filters: FilterOptions): Expense[]`
- `getExpensesByCategory(category: string): Expense[]`
- `getExpensesByDateRange(startDate: Date, endDate: Date): Expense[]`

**Analytics and Reporting**

- `getSummary(filters?: FilterOptions): ExpenseSummary`
- `getCategories(): string[]`
- `getAllTags(): string[]`

**Budget Management**

- `setBudget(category: string, monthlyLimit: number, alertThreshold?: number): Budget`
- `getBudget(category: string): Budget | null`
- `getAllBudgets(): Budget[]`

**Import/Export**

- `exportToCSV(): string`
- `importFromCSV(csvData: string): number`

**Recurring Expenses**

- `getRecurringExpenses(): Expense[]`
- `processRecurringExpenses(): Expense[]`

### Interfaces

#### Expense

```typescript
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  paymentMethod: PaymentMethod;
  tags: string[];
  recurring?: RecurringExpense;
}
```

#### Budget

```typescript
interface Budget {
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  alertThreshold: number;
}
```

#### FilterOptions

```typescript
interface FilterOptions {
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  tags?: string[];
}
```

#### PaymentMethod Enum

```typescript
enum PaymentMethod {
  Cash = "cash",
  CreditCard = "credit_card",
  DebitCard = "debit_card",
  BankTransfer = "bank_transfer",
  DigitalWallet = "digital_wallet",
  Other = "other",
}
```

## Examples

### Basic Usage

```typescript
import { ExpenseTracker, PaymentMethod } from "./src/index";

const tracker = new ExpenseTracker();

// Add expenses
tracker.addExpense({
  description: "Lunch at restaurant",
  amount: 25.50,
  category: "Food & Dining",
  date: new Date(),
  paymentMethod: PaymentMethod.CreditCard,
  tags: ["lunch", "restaurant"],
});

tracker.addExpense({
  description: "Gas station",
  amount: 60.00,
  category: "Transportation",
  date: new Date(),
  paymentMethod: PaymentMethod.DebitCard,
  tags: ["gas", "car"],
});

// Get summary
const summary = tracker.getSummary();
console.log(`Total expenses: $${summary.totalExpenses.toFixed(2)}`);
console.log(`Average expense: $${summary.averageExpense.toFixed(2)}`);
```

### Budget Management

```typescript
// Set budgets
tracker.setBudget("Food & Dining", 300, 80); // $300/month, 80% alert
tracker.setBudget("Transportation", 200, 75); // $200/month, 75% alert

// Add expense (will trigger budget alert if over threshold)
tracker.addExpense({
  description: "Expensive dinner",
  amount: 250,
  category: "Food & Dining",
  date: new Date(),
  paymentMethod: PaymentMethod.CreditCard,
  tags: ["dinner", "special"],
});

// Check all budgets
const budgets = tracker.getAllBudgets();
budgets.forEach(budget => {
  const percentage = (budget.currentSpent / budget.monthlyLimit) * 100;
  console.log(`${budget.category}: ${percentage.toFixed(1)}% used`);
});
```

### Advanced Filtering

```typescript
// Filter by date range and category
const recentFoodExpenses = tracker.getFilteredExpenses({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-01-31'),
  category: 'Food & Dining',
  minAmount: 10,
});

// Filter by payment method and tags
const creditCardExpenses = tracker.getFilteredExpenses({
  paymentMethod: PaymentMethod.CreditCard,
  tags: ['restaurant'],
});

// Get category breakdown
const summary = tracker.getSummary({
  dateFrom: new Date('2024-01-01'),
});

console.log('Category breakdown:');
for (const [category, amount] of summary.categoryBreakdown) {
  console.log(`${category}: $${amount.toFixed(2)}`);
}
```

### Recurring Expenses

```typescript
// Add recurring expense
tracker.addExpense({
  description: "Netflix Subscription",
  amount: 15.99,
  category: "Entertainment",
  date: new Date(),
  paymentMethod: PaymentMethod.CreditCard,
  tags: ["subscription", "streaming"],
  recurring: {
    frequency: "monthly",
    nextDue: new Date('2024-02-01'),
    endDate: new Date('2024-12-31'), // Optional end date
  },
});

// Process recurring expenses (call this regularly)
const newRecurring = tracker.processRecurringExpenses();
console.log(`Created ${newRecurring.length} new recurring expenses`);
```

### CSV Import/Export

```typescript
// Export all expenses to CSV
const csvData = tracker.exportToCSV();
fs.writeFileSync('expenses-backup.csv', csvData);

// Import expenses from CSV
const importData = fs.readFileSync('expenses-import.csv', 'utf-8');
const importedCount = tracker.importFromCSV(importData);
console.log(`Imported ${importedCount} expenses`);
```

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Data Storage

Expenses are stored in a JSON file (default: `expenses.json`) with the following structure:

```json
{
  "expenses": [
    {
      "id": "unique-id",
      "description": "Coffee",
      "amount": 4.5,
      "category": "Food & Dining",
      "date": "2024-01-15T10:30:00.000Z",
      "paymentMethod": "credit_card",
      "tags": ["coffee", "morning"]
    }
  ],
  "budgets": [
    {
      "category": "Food & Dining",
      "monthlyLimit": 300,
      "currentSpent": 125.50,
      "alertThreshold": 80
    }
  ],
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## Command Line Examples

```bash
# Add various expenses
npm run track add "Morning coffee" 4.50 "Food" credit_card coffee morning
npm run track add "Gas" 45.00 "Transportation" debit_card gas car
npm run track add "Groceries" 120.00 "Food" cash groceries weekly

# List and filter
npm run track list
npm run track list Food

# Set budgets
npm run track budget Food 200 75
npm run track budget Transportation 300 80

# View summaries
npm run track summary
npm run track summary --month

# Export/Import
npm run track export my-expenses.csv
npm run track import expenses-jan.csv
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request