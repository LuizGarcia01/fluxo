import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Category,
  Transaction,
  TransactionType,
  MonthlySummary,
  CategorySpending,
  Investment,
  InvestmentContribution,
  InvestmentSummary,
  InvestmentType,
  BillTemplate,
  BillWithStatus,
} from "./budget.types";

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  expense_kind: z.enum(["fixed", "variable"]).nullable().optional(),
  color: z.string().optional(),
});

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  categoryId: z.string().uuid().nullable(),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const periodSchema = z.object({
  year: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
});

const investmentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["renda_fixa", "acoes", "fii", "cripto", "outros"]),
  current_value: z.coerce.number().min(0),
});

const contributionSchema = z.object({
  investment_id: z.string().uuid(),
  amount: z.coerce.number().refine((v) => v !== 0, "Valor não pode ser zero"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional().nullable(),
  linkToCashflow: z.boolean().default(false),
});

function getMonthDateRange(year: number, month: number) {
  const monthText = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${year}-${monthText}-01`,
    endDate: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  };
}

/* ============================ CATEGORIES ============================ */

export const getCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Category[]> => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categorySchema.parse(input))
  .handler(async ({ data, context }): Promise<Category> => {
    const expense_kind =
      data.type === "expense" ? (data.expense_kind ?? "variable") : null;
    const { data: category, error } = await context.supabase
      .from("categories")
      .insert({
        user_id: context.userId,
        name: data.name,
        type: data.type,
        expense_kind,
        color: data.color,
      })
      .select()
      .single();
    if (error) throw error;
    if (!category) throw new Error("Failed to create category");
    return category;
  });

export const updateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      type: z.enum(["income", "expense"]),
      expense_kind: z.enum(["fixed", "variable"]).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Category> => {
    const expense_kind =
      data.type === "expense" ? (data.expense_kind ?? "variable") : null;
    const { data: category, error } = await context.supabase
      .from("categories")
      .update({ name: data.name, type: data.type, expense_kind })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw error;
    if (!category) throw new Error("Failed to update category");
    return category;
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase
      .from("categories").delete()
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
  });

/* ============================ TRANSACTIONS ============================ */

export const getTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<Transaction[]> => {
    const { startDate, endDate } = getMonthDateRange(data.year, data.month);
    const { data: transactions, error } = await context.supabase
      .from("transactions")
      .select("*, category:categories(*)")
      .gte("date", startDate).lte("date", endDate)
      .order("date", { ascending: false });
    if (error) throw error;
    return (transactions ?? []) as unknown as Transaction[];
  });

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => transactionSchema.parse(input))
  .handler(async ({ data, context }): Promise<Transaction> => {
    const { data: transaction, error } = await context.supabase
      .from("transactions")
      .insert({
        user_id: context.userId,
        type: data.type,
        category_id: data.categoryId,
        amount: data.amount,
        description: data.description,
        date: data.date,
      })
      .select("*, category:categories(*)")
      .single();
    if (error) throw error;
    if (!transaction) throw new Error("Failed to create transaction");
    return transaction as unknown as Transaction;
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      type: z.enum(["income", "expense"]),
      categoryId: z.string().uuid().nullable(),
      amount: z.coerce.number().positive(),
      description: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Transaction> => {
    const { data: transaction, error } = await context.supabase
      .from("transactions")
      .update({
        type: data.type,
        category_id: data.categoryId,
        amount: data.amount,
        description: data.description,
        date: data.date,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("*, category:categories(*)")
      .single();
    if (error) throw error;
    if (!transaction) throw new Error("Transação não encontrada");
    return transaction as unknown as Transaction;
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase
      .from("transactions").delete()
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
  });

/* ============================ ANALYTICS ============================ */

export const getMonthlySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<MonthlySummary> => {
    const { startDate, endDate } = getMonthDateRange(data.year, data.month);
    const { data: transactions, error } = await context.supabase
      .from("transactions")
      .select("type, amount, category:categories(expense_kind)")
      .gte("date", startDate).lte("date", endDate);
    if (error) throw error;

    type Row = { type: TransactionType; amount: number; category: { expense_kind: "fixed" | "variable" | null } | null };
    const rows = (transactions ?? []) as unknown as Row[];
    const totalIncome = rows.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expenses = rows.filter((t) => t.type === "expense");
    const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
    const totalFixedExpense = expenses.filter((t) => t.category?.expense_kind === "fixed").reduce((s, t) => s + Number(t.amount), 0);
    const totalVariableExpense = totalExpense - totalFixedExpense;

    return {
      totalIncome,
      totalExpense,
      totalFixedExpense,
      totalVariableExpense,
      balance: totalIncome - totalExpense,
    };
  });

export const getCategorySpending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<CategorySpending[]> => {
    const { startDate, endDate } = getMonthDateRange(data.year, data.month);
    const { data: transactions, error } = await context.supabase
      .from("transactions")
      .select("amount, category:categories(*)")
      .eq("type", "expense")
      .gte("date", startDate).lte("date", endDate);
    if (error) throw error;

    const grouped = new Map<string, { category: Category; amount: number }>();
    let total = 0;
    for (const t of (transactions ?? []) as unknown as { amount: number; category: Category | null }[]) {
      if (!t.category) continue;
      const existing = grouped.get(t.category.id);
      if (existing) existing.amount += Number(t.amount);
      else grouped.set(t.category.id, { category: t.category, amount: Number(t.amount) });
      total += Number(t.amount);
    }
    return Array.from(grouped.values())
      .map((item) => ({
        category: item.category,
        amount: item.amount,
        percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  });

export const getMonthlyComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ month: string; income: number; expense: number }[]> => {
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(data.year, data.month - 1 - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(),
      });
    }
    const results = await Promise.all(
      months.map(async (m) => {
        const { startDate, endDate } = getMonthDateRange(m.year, m.month);
        const { data: transactions, error } = await context.supabase
          .from("transactions").select("type, amount")
          .gte("date", startDate).lte("date", endDate);
        if (error) throw error;
        const income = (transactions ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
        const expense = (transactions ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
        return { month: m.label, income, expense };
      }),
    );
    return results;
  });

/* ============================ INVESTMENTS ============================ */

export const getInvestments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Investment[]> => {
    const { data, error } = await context.supabase
      .from("investments").select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Investment[];
  });

export const createInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => investmentSchema.parse(input))
  .handler(async ({ data, context }): Promise<Investment> => {
    const { data: row, error } = await context.supabase
      .from("investments")
      .insert({
        user_id: context.userId,
        name: data.name,
        type: data.type,
        current_value: data.current_value,
      })
      .select().single();
    if (error) throw error;
    return row as unknown as Investment;
  });

export const updateInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      type: z.enum(["renda_fixa", "acoes", "fii", "cripto", "outros"]),
      current_value: z.coerce.number().min(0),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Investment> => {
    const { data: row, error } = await context.supabase
      .from("investments")
      .update({ name: data.name, type: data.type, current_value: data.current_value })
      .eq("id", data.id).eq("user_id", context.userId)
      .select().single();
    if (error) throw error;
    return row as unknown as Investment;
  });

export const deleteInvestment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase
      .from("investments").delete()
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
  });

export const getContributions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<InvestmentContribution[]> => {
    const { startDate, endDate } = getMonthDateRange(data.year, data.month);
    const { data: rows, error } = await context.supabase
      .from("investment_contributions")
      .select("*, investment:investments(*)")
      .gte("date", startDate).lte("date", endDate)
      .order("date", { ascending: false });
    if (error) throw error;
    return (rows ?? []) as unknown as InvestmentContribution[];
  });

export const createContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => contributionSchema.parse(input))
  .handler(async ({ data, context }): Promise<InvestmentContribution> => {
    // Load investment (name + validate ownership)
    const { data: investment, error: invErr } = await context.supabase
      .from("investments").select("*")
      .eq("id", data.investment_id).eq("user_id", context.userId).single();
    if (invErr) throw invErr;
    if (!investment) throw new Error("Investimento não encontrado");

    // Optional: create linked transaction
    let transaction_id: string | null = null;
    if (data.linkToCashflow) {
      const isAporte = data.amount > 0;
      const { data: tx, error: txErr } = await context.supabase
        .from("transactions")
        .insert({
          user_id: context.userId,
          type: isAporte ? "expense" : "income",
          category_id: null,
          amount: Math.abs(data.amount),
          description: `${isAporte ? "Aporte" : "Retirada"}: ${investment.name}`,
          date: data.date,
        })
        .select("id").single();
      if (txErr) throw txErr;
      transaction_id = tx?.id ?? null;
    }

    // Insert contribution
    const { data: row, error } = await context.supabase
      .from("investment_contributions")
      .insert({
        user_id: context.userId,
        investment_id: data.investment_id,
        amount: data.amount,
        date: data.date,
        notes: data.notes ?? null,
        transaction_id,
      })
      .select("*, investment:investments(*)").single();
    if (error) throw error;

    // Update investment current_value by contribution delta
    const newValue = Number(investment.current_value) + Number(data.amount);
    await context.supabase
      .from("investments")
      .update({ current_value: newValue < 0 ? 0 : newValue })
      .eq("id", investment.id).eq("user_id", context.userId);

    return row as unknown as InvestmentContribution;
  });

export const deleteContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { data: row } = await context.supabase
      .from("investment_contributions").select("transaction_id")
      .eq("id", data.id).eq("user_id", context.userId).single();
    if (row?.transaction_id) {
      await context.supabase.from("transactions").delete()
        .eq("id", row.transaction_id).eq("user_id", context.userId);
    }
    const { error } = await context.supabase
      .from("investment_contributions").delete()
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
  });

/* ============================ BILL TEMPLATES ============================ */

const billSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
  category_id: z.string().uuid().nullable(),
  due_day: z.coerce.number().min(1).max(31),
});

export const getBills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<BillWithStatus[]> => {
    const { startDate, endDate } = getMonthDateRange(data.year, data.month);
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === data.year && today.getMonth() + 1 === data.month;
    const todayDay = today.getDate();

    const [billsRes, paidRes] = await Promise.all([
      context.supabase
        .from("bill_templates")
        .select("*, category:categories(*)")
        .eq("user_id", context.userId)
        .eq("is_active", true)
        .order("due_day", { ascending: true }),
      context.supabase
        .from("transactions")
        .select("id, bill_id")
        .not("bill_id", "is", null)
        .gte("date", startDate)
        .lte("date", endDate),
    ]);
    if (billsRes.error) throw billsRes.error;
    if (paidRes.error) throw paidRes.error;

    const paidMap = new Map<string, string>();
    for (const tx of paidRes.data ?? []) {
      if (tx.bill_id) paidMap.set(tx.bill_id, tx.id);
    }

    return (billsRes.data ?? []).map((bill) => {
      const paid_transaction_id = paidMap.get(bill.id) ?? null;
      const is_overdue =
        isCurrentMonth && !paid_transaction_id && bill.due_day < todayDay;
      return { ...bill, paid_transaction_id, is_overdue };
    }) as unknown as BillWithStatus[];
  });

export const createBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => billSchema.parse(input))
  .handler(async ({ data, context }): Promise<BillTemplate> => {
    const { data: row, error } = await context.supabase
      .from("bill_templates")
      .insert({ user_id: context.userId, ...data })
      .select("*, category:categories(*)")
      .single();
    if (error) throw error;
    return row as unknown as BillTemplate;
  });

export const updateBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), ...billSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BillTemplate> => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("bill_templates")
      .update(rest)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*, category:categories(*)")
      .single();
    if (error) throw error;
    return row as unknown as BillTemplate;
  });

export const deleteBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase
      .from("bill_templates")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
  });

export const payBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      bill_id: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Transaction> => {
    const { data: bill, error: billErr } = await context.supabase
      .from("bill_templates")
      .select("*")
      .eq("id", data.bill_id)
      .eq("user_id", context.userId)
      .single();
    if (billErr) throw billErr;
    if (!bill) throw new Error("Conta não encontrada");

    const { data: tx, error } = await context.supabase
      .from("transactions")
      .insert({
        user_id: context.userId,
        type: "expense",
        category_id: bill.category_id,
        amount: bill.amount,
        description: bill.name,
        date: data.date,
        bill_id: data.bill_id,
      })
      .select("*, category:categories(*)")
      .single();
    if (error) throw error;
    return tx as unknown as Transaction;
  });

export const unpayBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ transaction_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase
      .from("transactions")
      .delete()
      .eq("id", data.transaction_id)
      .eq("user_id", context.userId);
    if (error) throw error;
  });

export const getInvestmentSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => periodSchema.parse(input))
  .handler(async ({ data, context }): Promise<InvestmentSummary> => {
    const { startDate, endDate } = getMonthDateRange(data.year, data.month);

    const [invRes, contribRes, incomeRes] = await Promise.all([
      context.supabase.from("investments").select("type, current_value"),
      context.supabase.from("investment_contributions").select("amount")
        .gte("date", startDate).lte("date", endDate),
      context.supabase.from("transactions").select("amount")
        .eq("type", "income").gte("date", startDate).lte("date", endDate),
    ]);
    if (invRes.error) throw invRes.error;
    if (contribRes.error) throw contribRes.error;
    if (incomeRes.error) throw incomeRes.error;

    type Inv = { type: InvestmentType; current_value: number };
    const invs = (invRes.data ?? []) as unknown as Inv[];
    const totalPatrimony = invs.reduce((s, i) => s + Number(i.current_value), 0);

    const byType = new Map<InvestmentType, number>();
    for (const i of invs) {
      byType.set(i.type, (byType.get(i.type) ?? 0) + Number(i.current_value));
    }
    const allocation = Array.from(byType.entries())
      .map(([type, amount]) => ({
        type,
        amount,
        percentage: totalPatrimony > 0 ? Math.round((amount / totalPatrimony) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthContributions = (contribRes.data ?? []).reduce((s, c) => s + Number(c.amount), 0);
    const totalIncome = (incomeRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0);
    const savingsRate = totalIncome > 0 ? Math.round((Math.max(0, monthContributions) / totalIncome) * 100) : 0;

    return { totalPatrimony, monthContributions, savingsRate, allocation };
  });
