import * as fs from "fs";
import * as path from "path";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  paymentMethod: PaymentMethod;
  tags: string[];
  recurring?: RecurringExpense;
}

export interface RecurringExpense {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  endDate?: Date;
  nextDue: Date;
}

export enum PaymentMethod {
  Cash = "cash",
  CreditCard = "credit_card",
  DebitCard = "debit_card",
  BankTransfer = "bank_transfer",
  DigitalWallet = "digital_wallet",
  Other = "other",
}

export interface Budget {
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  alertThreshold: number; // percentage (0-100)
}

export interface ExpenseSummary {
  totalExpenses: number;
  expenseCount: number;
  averageExpense: number;
  categoryBreakdown: Map<string, number>;
  monthlyTrend: Map<string, number>;
  paymentMethodBreakdown: Map<PaymentMethod, number>;
}

export interface FilterOptions {
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  tags?: string[];
}

export class ExpenseTracker {
  private expenses: Expense[] = [];
  private budgets: Budget[] = [];
  private dataFile: string;

  constructor(dataFile: string = "expenses.json") {
    this.dataFile = dataFile;
    this.loadData();
  }

  public addExpense(expense: Omit<Expense, "id">): Expense {
    const newExpense: Expense = {
      ...expense,
      id: this.generateId(),
      date: new Date(expense.date),
    };

    this.expenses.push(newExpense);
    this.saveData();

    // Check budget alerts
    this.checkBudgetAlerts(newExpense.category);

    return newExpense;
  }

  public updateExpense(
    id: string,
    updates: Partial<Omit<Expense, "id">>
  ): Expense | null {
    const index = this.expenses.findIndex((expense) => expense.id === id);

    if (index === -1) {
      return null;
    }

    const updatedExpense = {
      ...this.expenses[index],
      ...updates,
      date: updates.date ? new Date(updates.date) : this.expenses[index].date,
    };

    this.expenses[index] = updatedExpense;
    this.saveData();

    return updatedExpense;
  }

  public deleteExpense(id: string): boolean {
    const index = this.expenses.findIndex((expense) => expense.id === id);

    if (index === -1) {
      return false;
    }

    this.expenses.splice(index, 1);
    this.saveData();
    return true;
  }

  public getExpense(id: string): Expense | null {
    return this.expenses.find((expense) => expense.id === id) || null;
  }

  public getAllExpenses(): Expense[] {
    return [...this.expenses];
  }

  public getFilteredExpenses(filters: FilterOptions): Expense[] {
    return this.expenses.filter((expense) => {
      if (filters.dateFrom && expense.date < filters.dateFrom) return false;
      if (filters.dateTo && expense.date > filters.dateTo) return false;
      if (filters.category && expense.category !== filters.category)
        return false;
      if (filters.minAmount && expense.amount < filters.minAmount) return false;
      if (filters.maxAmount && expense.amount > filters.maxAmount) return false;
      if (
        filters.paymentMethod &&
        expense.paymentMethod !== filters.paymentMethod
      )
        return false;
      if (
        filters.tags &&
        !filters.tags.every((tag) => expense.tags.includes(tag))
      )
        return false;

      return true;
    });
  }

  public getExpensesByCategory(category: string): Expense[] {
    return this.expenses.filter((expense) => expense.category === category);
  }

  public getExpensesByDateRange(startDate: Date, endDate: Date): Expense[] {
    return this.expenses.filter(
      (expense) => expense.date >= startDate && expense.date <= endDate
    );
  }

  public getSummary(filters?: FilterOptions): ExpenseSummary {
    const filteredExpenses = filters
      ? this.getFilteredExpenses(filters)
      : this.expenses;

    const totalExpenses = filteredExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const expenseCount = filteredExpenses.length;
    const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

    const categoryBreakdown = new Map<string, number>();
    const monthlyTrend = new Map<string, number>();
    const paymentMethodBreakdown = new Map<PaymentMethod, number>();

    filteredExpenses.forEach((expense) => {
      // Category breakdown
      const categoryTotal = categoryBreakdown.get(expense.category) || 0;
      categoryBreakdown.set(expense.category, categoryTotal + expense.amount);

      // Monthly trend
      const monthKey = `${expense.date.getFullYear()}-${(expense.date.getMonth() + 1).toString().padStart(2, "0")}`;
      const monthTotal = monthlyTrend.get(monthKey) || 0;
      monthlyTrend.set(monthKey, monthTotal + expense.amount);

      // Payment method breakdown
      const methodTotal =
        paymentMethodBreakdown.get(expense.paymentMethod) || 0;
      paymentMethodBreakdown.set(
        expense.paymentMethod,
        methodTotal + expense.amount
      );
    });

    return {
      totalExpenses,
      expenseCount,
      averageExpense,
      categoryBreakdown,
      monthlyTrend,
      paymentMethodBreakdown,
    };
  }

  public setBudget(
    category: string,
    monthlyLimit: number,
    alertThreshold: number = 80
  ): Budget {
    const existingBudgetIndex = this.budgets.findIndex(
      (budget) => budget.category === category
    );

    const currentSpent = this.getCurrentMonthSpending(category);

    const budget: Budget = {
      category,
      monthlyLimit,
      currentSpent,
      alertThreshold,
    };

    if (existingBudgetIndex !== -1) {
      this.budgets[existingBudgetIndex] = budget;
    } else {
      this.budgets.push(budget);
    }

    this.saveData();
    return budget;
  }

  public getBudget(category: string): Budget | null {
    return this.budgets.find((budget) => budget.category === category) || null;
  }

  public getAllBudgets(): Budget[] {
    // Update current spending for all budgets
    return this.budgets.map((budget) => ({
      ...budget,
      currentSpent: this.getCurrentMonthSpending(budget.category),
    }));
  }

  public getCategories(): string[] {
    const categories = new Set<string>();
    this.expenses.forEach((expense) => categories.add(expense.category));
    return Array.from(categories).sort();
  }

  public getAllTags(): string[] {
    const tags = new Set<string>();
    this.expenses.forEach((expense) => {
      expense.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  public exportToCSV(): string {
    const headers = [
      "ID",
      "Description",
      "Amount",
      "Category",
      "Date",
      "Payment Method",
      "Tags",
    ];

    const rows = this.expenses.map((expense) => [
      expense.id,
      expense.description,
      expense.amount.toString(),
      expense.category,
      expense.date.toISOString().split("T")[0],
      expense.paymentMethod,
      expense.tags.join(";"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return csvContent;
  }

  public importFromCSV(csvData: string): number {
    const lines = csvData.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV must contain header and at least one data row");
    }

    let importedCount = 0;
    const headers = this.parseCSVLine(lines[0]);

    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = this.parseCSVLine(lines[i]);
        if (fields.length !== headers.length) {
          console.warn(`Skipping row ${i + 1}: field count mismatch`);
          continue;
        }

        const expense: Omit<Expense, "id"> = {
          description: fields[1] || "Imported expense",
          amount: parseFloat(fields[2]) || 0,
          category: fields[3] || "Other",
          date: new Date(fields[4] || Date.now()),
          paymentMethod:
            (fields[5] as PaymentMethod) || PaymentMethod.Other,
          tags: fields[6] ? fields[6].split(";") : [],
        };

        this.addExpense(expense);
        importedCount++;
      } catch (error) {
        console.warn(`Error importing row ${i + 1}:`, error);
      }
    }

    return importedCount;
  }

  public getRecurringExpenses(): Expense[] {
    return this.expenses.filter((expense) => expense.recurring);
  }

  public processRecurringExpenses(): Expense[] {
    const recurringExpenses = this.getRecurringExpenses();
    const newExpenses: Expense[] = [];
    const today = new Date();

    recurringExpenses.forEach((expense) => {
      if (!expense.recurring) return;

      const { frequency, endDate, nextDue } = expense.recurring;

      // Check if it's time to create a new recurring expense
      if (nextDue <= today && (!endDate || today <= endDate)) {
        const newExpense: Omit<Expense, "id"> = {
          description: `${expense.description} (Recurring)`,
          amount: expense.amount,
          category: expense.category,
          date: new Date(nextDue),
          paymentMethod: expense.paymentMethod,
          tags: [...expense.tags, "recurring"],
          recurring: {
            frequency,
            endDate,
            nextDue: this.calculateNextDueDate(nextDue, frequency),
          },
        };

        const addedExpense = this.addExpense(newExpense);
        newExpenses.push(addedExpense);

        // Update the original expense's next due date
        this.updateExpense(expense.id, {
          recurring: {
            frequency,
            endDate,
            nextDue: this.calculateNextDueDate(nextDue, frequency),
          },
        });
      }
    });

    return newExpenses;
  }

  private getCurrentMonthSpending(category: string): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.expenses
      .filter(
        (expense) =>
          expense.category === category &&
          expense.date >= startOfMonth &&
          expense.date <= endOfMonth
      )
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  private checkBudgetAlerts(category: string): void {
    const budget = this.getBudget(category);
    if (!budget) return;

    const currentSpent = this.getCurrentMonthSpending(category);
    const percentage = (currentSpent / budget.monthlyLimit) * 100;

    if (percentage >= budget.alertThreshold) {
      console.warn(
        `\n⚠️  Budget Alert: ${category}\n` +
          `   Spent: $${currentSpent.toFixed(2)} / $${budget.monthlyLimit.toFixed(2)} (${percentage.toFixed(1)}%)\n` +
          `   You've reached ${percentage.toFixed(1)}% of your monthly budget!`
      );
    }
  }

  private calculateNextDueDate(
    currentDue: Date,
    frequency: RecurringExpense["frequency"]
  ): Date {
    const nextDue = new Date(currentDue);

    switch (frequency) {
      case "daily":
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      case "weekly":
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case "monthly":
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case "yearly":
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
    }

    return nextDue;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        result.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    result.push(current);
    return result;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, "utf-8"));

        // Parse expenses with date conversion
        this.expenses = (data.expenses || []).map((expense: any) => ({
          ...expense,
          date: new Date(expense.date),
          recurring: expense.recurring
            ? {
                ...expense.recurring,
                nextDue: new Date(expense.recurring.nextDue),
                endDate: expense.recurring.endDate
                  ? new Date(expense.recurring.endDate)
                  : undefined,
              }
            : undefined,
        }));

        this.budgets = data.budgets || [];
      }
    } catch (error) {
      console.error("Error loading data:", error);
      this.expenses = [];
      this.budgets = [];
    }
  }

  private saveData(): void {
    try {
      const data = {
        expenses: this.expenses,
        budgets: this.budgets,
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }
}

// Command line interface
function main(): void {
  const args = process.argv.slice(2);
  const tracker = new ExpenseTracker();

  if (args.length === 0) {
    console.log("Usage: npm run track <command> [options]");
    console.log("Commands:");
    console.log("  add <description> <amount> <category> [payment_method] [tags...]");
    console.log("  list [category]");
    console.log("  delete <id>");
    console.log("  summary [--month]");
    console.log("  budget <category> <limit> [threshold]");
    console.log("  export <filename>");
    console.log("  import <filename>");
    console.log("  recurring");
    return;
  }

  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case "add":
        if (args.length < 4) {
          console.log("Usage: add <description> <amount> <category> [payment_method] [tags...]");
          return;
        }
        const expense = tracker.addExpense({
          description: args[1],
          amount: parseFloat(args[2]),
          category: args[3],
          date: new Date(),
          paymentMethod: (args[4] as PaymentMethod) || PaymentMethod.Cash,
          tags: args.slice(5),
        });
        console.log(`Added expense: ${expense.description} - $${expense.amount}`);
        break;

      case "list":
        const expenses = args[1]
          ? tracker.getExpensesByCategory(args[1])
          : tracker.getAllExpenses();
        console.log(`\n📊 ${args[1] ? `${args[1]} ` : ""}Expenses (${expenses.length} items):");
        expenses.forEach((expense) => {
          console.log(
            `  ${expense.date.toDateString()} - ${expense.description}: $${expense.amount} (${expense.category})`
          );
        });
        break;

      case "delete":
        if (args.length < 2) {
          console.log("Usage: delete <id>");
          return;
        }
        const deleted = tracker.deleteExpense(args[1]);
        console.log(deleted ? "Expense deleted" : "Expense not found");
        break;

      case "summary":
        const isMonthly = args.includes("--month");
        const summary = tracker.getSummary();
        console.log("\n💰 Expense Summary:");
        console.log(`Total Expenses: $${summary.totalExpenses.toFixed(2)}`);
        console.log(`Number of Expenses: ${summary.expenseCount}`);
        console.log(`Average Expense: $${summary.averageExpense.toFixed(2)}`);

        console.log("\n📂 By Category:");
        for (const [category, amount] of summary.categoryBreakdown.entries()) {
          console.log(`  ${category}: $${amount.toFixed(2)}`);
        }

        if (isMonthly) {
          console.log("\n📅 Monthly Trend:");
          for (const [month, amount] of summary.monthlyTrend.entries()) {
            console.log(`  ${month}: $${amount.toFixed(2)}`);
          }
        }
        break;

      case "budget":
        if (args.length < 3) {
          console.log("Usage: budget <category> <limit> [threshold]");
          return;
        }
        const budget = tracker.setBudget(
          args[1],
          parseFloat(args[2]),
          args[3] ? parseInt(args[3]) : 80
        );
        console.log(`Budget set: ${budget.category} - $${budget.monthlyLimit}/month`);
        break;

      case "export":
        if (args.length < 2) {
          console.log("Usage: export <filename>");
          return;
        }
        const csv = tracker.exportToCSV();
        fs.writeFileSync(args[1], csv);
        console.log(`Expenses exported to ${args[1]}`);
        break;

      case "import":
        if (args.length < 2) {
          console.log("Usage: import <filename>");
          return;
        }
        const csvData = fs.readFileSync(args[1], "utf-8");
        const imported = tracker.importFromCSV(csvData);
        console.log(`Imported ${imported} expenses from ${args[1]}`);
        break;

      case "recurring":
        const newRecurring = tracker.processRecurringExpenses();
        console.log(`Processed ${newRecurring.length} recurring expenses`);
        break;

      default:
        console.log(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
  }
}

if (require.main === module) {
  main();
}

export default ExpenseTracker;