import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
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
  HouseholdInfo,
} from "./budget.types";

function adminSupabase() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function toInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function nameFromEmail(email: string) {
  return email.split("@")[0].replace(/[._\-+]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  expense_kind: z.enum(["fixed", "variable"]).nullable().optional(),
  color: z.string().optional(),
  icon: z.string().nullable().optional(),
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
        icon: data.icon ?? null,
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
      icon: z.string().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Category> => {
    const expense_kind =
      data.type === "expense" ? (data.expense_kind ?? "variable") : null;
    const { data: category, error } = await context.supabase
      .from("categories")
      .update({ name: data.name, type: data.type, expense_kind, icon: data.icon ?? null })
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
        created_by: context.actualUserId,
      })
      .select("*, category:categories(*)")
      .single();
    if (error) throw error;
    if (!transaction) throw new Error("Failed to create transaction");
    return transaction as unknown as Transaction;
  });

export const createInstallmentTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      ...transactionSchema.shape,
      total: z.coerce.number().int().min(2).max(60),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<void> => {
    const [year, month, day] = data.date.split("-").map(Number);
    const rows = Array.from({ length: data.total }, (_, i) => {
      const d = new Date(year, month - 1 + i, day);
      // cap to last day of month if day overflows (e.g. day 31 in Feb)
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const safeDay = Math.min(day, maxDay);
      const date = new Date(year, month - 1 + i, safeDay);
      return {
        user_id: context.userId,
        type: data.type,
        category_id: data.categoryId,
        amount: data.amount,
        description: `${data.description} (${i + 1}/${data.total})`,
        date: date.toISOString().slice(0, 10),
        created_by: context.actualUserId,
      };
    });
    const { error } = await context.supabase.from("transactions").insert(rows);
    if (error) throw error;
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

const installmentBillSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive(),
  category_id: z.string().uuid().nullable(),
  due_day: z.coerce.number().min(1).max(31),
  total: z.coerce.number().int().min(2).max(60),
  start_month: z.coerce.number().int().min(1).max(12),
  start_year: z.coerce.number().int(),
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

    const visibleBills = (billsRes.data ?? []).filter((bill) => {
      if (!bill.is_installment) return true;
      return bill.installment_month === data.month && bill.installment_year === data.year;
    });

    return visibleBills.map((bill) => {
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
      .insert({ user_id: context.userId, created_by: context.actualUserId, ...data })
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

export const createInstallmentBills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => installmentBillSchema.parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const group_id = crypto.randomUUID();
    const rows = Array.from({ length: data.total }, (_, i) => {
      const monthOffset = data.start_month - 1 + i;
      return {
        user_id: context.userId,
        created_by: context.actualUserId,
        name: data.name,
        amount: data.amount,
        category_id: data.category_id,
        due_day: data.due_day,
        is_active: true,
        is_installment: true,
        installment_total: data.total,
        installment_current: i + 1,
        installment_group_id: group_id,
        installment_month: (monthOffset % 12) + 1,
        installment_year: data.start_year + Math.floor(monthOffset / 12),
      };
    });
    const { error } = await context.supabase.from("bill_templates").insert(rows);
    if (error) throw error;
  });

export const deleteInstallmentGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ group_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const { error } = await context.supabase
      .from("bill_templates")
      .delete()
      .eq("installment_group_id", data.group_id)
      .eq("user_id", context.userId);
    if (error) throw error;
  });

// ── Household / Partilha ────────────────────────────────────────────────────

export const getHouseholdInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HouseholdInfo> => {
    const admin = adminSupabase();
    const actualUserId = context.actualUserId;

    // Load my own settings
    const { data: mySettings } = await admin
      .from("user_settings")
      .select("display_name, display_color")
      .eq("user_id", actualUserId)
      .maybeSingle();

    // Load my email for fallback name
    const { data: myUser } = await admin.auth.admin.getUserById(actualUserId);
    const myEmail = myUser?.user?.email ?? "";
    const myName = mySettings?.display_name || nameFromEmail(myEmail);
    const myColor = mySettings?.display_color ?? "#6ec6ba";
    const me = { userId: actualUserId, displayName: myName, color: myColor, initials: toInitials(myName) };

    // Am I a delegate (member)?
    if (actualUserId !== context.userId) {
      const ownerId = context.userId;
      const { data: ownerSettings } = await admin
        .from("user_settings")
        .select("display_name, display_color")
        .eq("user_id", ownerId)
        .maybeSingle();
      const { data: ownerUser } = await admin.auth.admin.getUserById(ownerId);
      const ownerEmail = ownerUser?.user?.email ?? "";
      const ownerName = ownerSettings?.display_name || nameFromEmail(ownerEmail);
      const ownerColor = ownerSettings?.display_color ?? "#6ec6ba";
      return {
        status: "member",
        me,
        partner: { userId: ownerId, displayName: ownerName, color: ownerColor, initials: toInitials(ownerName) },
      };
    }

    // Am I an owner with a member?
    const { data: acceptedInvite } = await admin
      .from("household_invites")
      .select("member_id")
      .eq("owner_id", actualUserId)
      .not("accepted_at", "is", null)
      .maybeSingle();

    if (acceptedInvite?.member_id) {
      const memberId = acceptedInvite.member_id;
      const { data: memberSettings } = await admin
        .from("user_settings")
        .select("display_name, display_color")
        .eq("user_id", memberId)
        .maybeSingle();
      const { data: memberUser } = await admin.auth.admin.getUserById(memberId);
      const memberEmail = memberUser?.user?.email ?? "";
      const memberName = memberSettings?.display_name || nameFromEmail(memberEmail);
      const memberColor = memberSettings?.display_color ?? "#818cf8";
      return {
        status: "owner",
        me,
        partner: { userId: memberId, displayName: memberName, color: memberColor, initials: toInitials(memberName) },
      };
    }

    // Check for pending invite
    const { data: pendingInvite } = await admin
      .from("household_invites")
      .select("token, expires_at")
      .eq("owner_id", actualUserId)
      .is("member_id", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    return {
      status: "solo",
      me,
      pendingInvite: pendingInvite
        ? { token: pendingInvite.token, expiresAt: pendingInvite.expires_at }
        : undefined,
    };
  });

export const createHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ token: string }> => {
    if (context.actualUserId !== context.userId) throw new Error("Apenas o dono pode criar convites");
    const admin = adminSupabase();
    // Expire any existing pending invites
    await admin
      .from("household_invites")
      .update({ expires_at: new Date().toISOString() })
      .eq("owner_id", context.userId)
      .is("member_id", null);
    // Create new invite
    const { data: invite, error } = await admin
      .from("household_invites")
      .insert({ owner_id: context.userId })
      .select("token")
      .single();
    if (error || !invite) throw new Error("Erro ao criar convite");
    return { token: invite.token };
  });

export const getInviteInfo = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ ownerName: string; ownerColor: string; ownerId: string } | null> => {
    const admin = adminSupabase();
    const { data: invite } = await admin
      .from("household_invites")
      .select("owner_id, member_id, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return null;
    if (invite.member_id) return null;
    if (new Date(invite.expires_at) < new Date()) return null;
    const { data: settings } = await admin
      .from("user_settings")
      .select("display_name, display_color")
      .eq("user_id", invite.owner_id)
      .maybeSingle();
    const { data: ownerUser } = await admin.auth.admin.getUserById(invite.owner_id);
    const email = ownerUser?.user?.email ?? "";
    const ownerName = settings?.display_name || nameFromEmail(email);
    const ownerColor = settings?.display_color ?? "#6ec6ba";
    return { ownerName, ownerColor, ownerId: invite.owner_id };
  });

export const acceptHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<void> => {
    const actualUserId = context.actualUserId;
    const admin = adminSupabase();
    const { data: invite } = await admin
      .from("household_invites")
      .select("id, owner_id, member_id, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Convite não encontrado");
    if (invite.member_id) throw new Error("Convite já utilizado");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Convite expirado");
    if (invite.owner_id === actualUserId) throw new Error("Não podes aceitar o teu próprio convite");
    // Mark invite accepted
    await admin.from("household_invites").update({ member_id: actualUserId, accepted_at: new Date().toISOString() }).eq("id", invite.id);
    // Set member's default color if not set
    await admin.from("user_settings").upsert({ user_id: actualUserId, display_color: "#818cf8" }, { onConflict: "user_id", ignoreDuplicates: true });
    // Set delegation in member's metadata
    await admin.auth.admin.updateUserById(actualUserId, { user_metadata: { delegated_to: invite.owner_id } });
  });

export const removeHouseholdAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<void> => {
    const admin = adminSupabase();
    const actualUserId = context.actualUserId;
    if (actualUserId !== context.userId) {
      // Member removing themselves
      await admin.auth.admin.updateUserById(actualUserId, { user_metadata: { delegated_to: null } });
      await admin.from("household_invites").update({ member_id: null, accepted_at: null }).eq("member_id", actualUserId);
    } else {
      // Owner removing member
      const { data: invite } = await admin.from("household_invites").select("member_id").eq("owner_id", actualUserId).not("accepted_at", "is", null).maybeSingle();
      if (invite?.member_id) {
        await admin.auth.admin.updateUserById(invite.member_id, { user_metadata: { delegated_to: null } });
        await admin.from("household_invites").update({ member_id: null, accepted_at: null }).eq("owner_id", actualUserId);
      }
    }
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
