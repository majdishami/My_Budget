1  import type { Express } from "express";
2  import { createServer, type Server } from "http";
3  import { db } from "@db";
4  import {
5    users,
6    insertUserSchema,
7    categories,
8    insertCategorySchema,
9    transactions,
10   bills,
11   insertTransactionSchema,
12 } from "@db/schema";
13 import { eq, desc, ilike, or, and } from "drizzle-orm";
14 import { sql } from "drizzle-orm";
15 import dayjs from "dayjs";
16 import passport from "passport";
17 import { Strategy as LocalStrategy } from "passport-local";
18 import session from "express-session";
19 import ConnectPgSimple from "connect-pg-simple";
20 import crypto from "crypto";
21 
22 export function registerRoutes(app: Express): Server {
23   // Test route
24   app.get("/api/health", (req, res) => {
25     console.log("[Server] Health check endpoint called");
26     res.json({ status: "ok" });
27   });
28 
29   // Categories Routes
30   app.get("/api/categories", async (req, res) => {
31     try {
32       console.log("[Categories API] Fetching categories...");
33       const allCategories = await db.query.categories.findMany({
34         orderBy: [categories.name],
35       });
36       console.log("[Categories API] Found categories:", allCategories.length);
37       return res.json(allCategories);
38     } catch (error) {
39       console.error("[Categories API] Error:", error);
40       return res.status(500).json({
41         message: "Failed to load categories",
42         error:
43           process.env.NODE_ENV === "development"
44             ? error
45             : "Internal server error",
46       });
47     }
48   });
49 
50   // Add category creation endpoint
51   app.post("/api/categories", async (req, res) => {
52     try {
53       console.log("[Categories API] Creating new category:", req.body);
54 
55       // Validate request body against schema
56       const categoryData = await insertCategorySchema.parseAsync(req.body);
57 
58       // Insert new category
59       const [newCategory] = await db
60         .insert(categories)
61         .values(categoryData)
62         .returning();
63 
64       console.log("[Categories API] Created category:", newCategory);
65       res.status(201).json(newCategory);
66     } catch (error) {
67       console.error("[Categories API] Error creating category:", error);
68       res.status(400).json({
69         message: error instanceof Error ? error.message : "Invalid request data",
70       });
71     }
72   });
73 
74   // Update category endpoint
75   app.patch("/api/categories/:id", async (req, res) => {
76     try {
77       const categoryId = parseInt(req.params.id);
78       console.log("[Categories API] Updating category:", {
79         id: categoryId,
80         data: req.body,
81       });
82 
83       const existingCategory = await db.query.categories.findFirst({
84         where: eq(categories.id, categoryId),
85       });
86 
87       if (!existingCategory) {
88         return res.status(404).json({ message: "Category not found" });
89       }
90 
91       const [updatedCategory] = await db
92         .update(categories)
93         .set(req.body)
94         .where(eq(categories.id, categoryId))
95         .returning();
96 
97       console.log("[Categories API] Updated category:", updatedCategory);
98       res.json(updatedCategory);
99     } catch (error) {
100      console.error("[Categories API] Error updating category:", error);
101      res.status(400).json({
102        message: error instanceof Error ? error.message : "Invalid request data",
103      });
104    }
105  });
106 
107  // Add category deletion endpoint
108  app.delete("/api/categories/:id", async (req, res) => {
109    const categoryId = parseInt(req.params.id);
110 
111    if (isNaN(categoryId)) {
112      console.error("[Categories API] Invalid category ID:", req.params.id);
113      return res.status(400).json({
114        message: "Invalid category ID",
115        error: "Category ID must be a number",
116      });
117    }
118 
119    try {
120      console.log("[Categories API] Attempting to delete category:", {
121        id: categoryId,
122      });
123 
124      const category = await db.query.categories.findFirst({
125        where: eq(categories.id, categoryId),
126      });
127 
128      if (!category) {
129        console.log("[Categories API] Category not found:", { id: categoryId });
130        return res.status(404).json({
131          message: "Category not found",
132          error: `No category found with ID ${categoryId}`,
133        });
134      }
135 
136      // Delete the category and all related records in a transaction
137      try {
138        await db.transaction(async (tx) => {
139          // Delete associated transactions
140          await tx
141            .delete(transactions)
142            .where(eq(transactions.category_id, categoryId));
143 
144          // Delete associated bills
145          await tx.delete(bills).where(eq(bills.category_id, categoryId));
146 
147          // Delete the category itself
148          const result = await tx
149            .delete(categories)
150            .where(eq(categories.id, categoryId))
151            .returning();
152 
153          if (!result.length) {
154            throw new Error("Failed to delete category");
155          }
156        });
157 
158        console.log("[Categories API] Successfully deleted category:", {
159          id: categoryId,
160          relatedRecordsDeleted: true,
161        });
162 
163        return res.status(200).json({
164          message: "Category deleted successfully",
165          deletedId: categoryId,
166        });
167      } catch (txError) {
168        console.error("[Categories API] Transaction failed:", {
169          id: categoryId,
170          error:
171            txError instanceof Error
172              ? txError.message
173              : "Unknown transaction error",
174        });
175        throw txError; // Re-throw to be caught by outer try-catch
176      }
177    } catch (error) {
178      console.error("[Categories API] Error in delete category handler:", {
179        id: categoryId,
180        error: error instanceof Error ? error.message : "Unknown error",
181      });
182 
183      return res.status(500).json({
184        message: "Failed to delete category",
185        error:
186          process.env.NODE_ENV === "development"
187            ? error instanceof Error
188              ? error.message
189              : "Unknown error"
190            : "Internal server error",
191      });
192    }
193  });
194 
195  // Bills Routes with proper icon handling and cache prevention
196  app.get("/api/bills", async (req, res) => {
197    try {
198      console.log("[Bills API] Fetching bills with categories...");
199 
200      const allBills = await db
201        .select({
  202          id: bills.id,
  203          name: bills.name,
  204          amount: bills.amount,
  205          day: bills.day,
  206          category_id: bills.category_id,
  207          category_name: sql<string>`COALESCE(${categories.name}, 'General Expenses')`,
  208          category_color: sql<string>`COALESCE(${categories.color}, '#6366F1')`,
  209          category_icon: sql<string>`COALESCE(${categories.icon}, 'shopping-cart')`,
  210        })
  211        .from(bills)
  212        .leftJoin(categories, eq(bills.category_id, categories.id))
  213        .orderBy(desc(bills.amount));
  214 
  215      const formattedBills = allBills.map((bill) => {
  216        const formatted = {
  217          id: bill.id,
  218          name: bill.name,
  219          amount: Number(bill.amount),
  220          day: bill.day,
  221          category_id: bill.category_id,
  222          category_name: bill.category_name,
  223          category_color: bill.category_color,
  224          category_icon: bill.category_icon,
  225        };
  226        console.log("[Bills API] Formatted bill:", formatted);
  227        return formatted;
  228      });
  229 
  230      console.log("[Bills API] Found bills:", formattedBills.length);
  231 
  232      // Add cache control headers to prevent stale data
  233      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  234      res.set("Pragma", "no-cache");
  235      res.set("Expires", "0");
  236 
  237      return res.json(formattedBills);
  238    } catch (error) {
  239      console.error("[Bills API] Error:", error);
  240      return res.status(500).json({
  241        message: "Failed to load bills",
  242        error:
  243          process.env.NODE_ENV === "development"
  244            ? error
  245            : "Internal server error",
  246      });
  247    }
  248  });
  249 
  250  // Transactions Routes with improved category matching and date range filtering
  251  app.get("/api/transactions", async (req, res) => {
  252    try {
  253      const type = req.query.type as "income" | "expense" | undefined;
  254      const startDate = req.query.startDate
  255        ? dayjs(req.query.startDate as string).startOf("day")
  256        : undefined;
  257      const endDate = req.query.endDate
  258        ? dayjs(req.query.endDate as string).endOf("day")
  259        : undefined;
  260 
  261      console.log("[Transactions API] Fetching transactions with filters:", {
  262        type,
  263        startDate: startDate?.format("YYYY-MM-DD HH:mm:ss"),
  264        endDate: endDate?.format("YYYY-MM-DD HH:mm:ss"),
  265        rawStartDate: req.query.startDate,
  266        rawEndDate: req.query.endDate,
  267      });
  268 
  269      // Build base query for actual transactions
  270      let query = db
  271        .select({
  272          id: transactions.id,
  273          description: transactions.description,
  274          amount: transactions.amount,
  275          date: transactions.date,
  276          type: transactions.type,
  277          category_id: transactions.category_id,
  278          recurring_type: transactions.recurring_type,
  279          is_recurring: transactions.is_recurring,
  280          first_date: transactions.first_date,
  281          second_date: transactions.second_date,
  282          category_name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
  283          category_color: sql<string>`COALESCE(${categories.color}, '#6366F1')`,
  284          category_icon: sql<string>`COALESCE(${categories.icon}, 'receipt')`,
  285        })
  286        .from(transactions)
  287        .leftJoin(categories, eq(transactions.category_id, categories.id));
  288 
  289      // Build where conditions array for dynamic filtering
  290      const whereConditions = [];
  291 
  292      if (type) {
  293        whereConditions.push(eq(transactions.type, type));
  294      }
  295 
  296      if (startDate) {
  297        whereConditions.push(sql`DATE(${transactions.date}) >= DATE(${startDate.toDate()})`);
  298      }
  299      if (endDate) {
  300        whereConditions.push(sql`DATE(${transactions.date}) <= DATE(${endDate.toDate()})`);
  301      }
  302 
  303      if (whereConditions.length > 0) {
  304        query = query.where(and(...whereConditions));
  305      }
  306 
  307      const actualTransactions = await query;
  308 
  309      // Generate virtual transactions for recurring incomes and expenses
  310      let virtualTransactions: any[] = [];
  311      if (startDate && endDate) {
  312        // Process bills first
  313        const allBills = await db
  314          .select({
  315            id: bills.id,
  316            bills: bills,
  317            categories: categories,
  318          })
  319          .from(bills)
  320          .leftJoin(categories, eq(bills.category_id, categories.id));
  321 
  322        // Process each bill
  323        for (const bill of allBills) {
  324          const billData = bill.bills;
  325 
  326          // For one-time bills
  327          if (billData.is_one_time && billData.date) {
  328            const billDate = dayjs(billData.date);
  329            if (billDate.isBetween(startDate, endDate, "day", "[]")) {
  330              virtualTransactions.push({
  331                id: `bill_${billData.id}_${billDate.format("YYYY-MM-DD")}`,
  332                description: billData.name,
  333                amount: Number(billData.amount),
  334                date: billDate.format("YYYY-MM-DD"),
  335                type: "expense",
  336                category_id: billData.category_id,
  337                category_name: bill.categories?.name || "Uncategorized",
  338                category_color: bill.categories?.color || "#6366F1",
  339                category_icon: bill.categories?.icon || "receipt",
  340                is_virtual: true,
  341              });
  342            }
  343            continue;
  344          }
  345 
  346          // For yearly bills
  347          if (billData.is_yearly && billData.yearly_date) {
  348            const yearlyDate = dayjs(billData.yearly_date);
  349            // Check for each year in the range
  350            let yearCheck = startDate.startOf("year");
  351            while (yearCheck.isBefore(endDate)) {
  352              const billDate = yearlyDate.year(yearCheck.year());
  353              if (billDate.isBetween(startDate, endDate, "day", "[]")) {
  354                virtualTransactions.push({
  355                  id: `bill_${billData.id}_${billDate.format("YYYY-MM-DD")}`,
  356                  description: billData.name,
  357                  amount: Number(billData.amount),
  358                  date: billDate.format("YYYY-MM-DD"),
  359                  type: "expense",
  360                  category_id: billData.category_id,
  361                  category_name: bill.categories?.name || "Uncategorized",
  362                  category_color: bill.categories?.color || "#6366F1",
  363                  category_icon: bill.categories?.icon || "receipt",
  364                  is_virtual: true,
  365                });
  366              }
  367              yearCheck = yearCheck.add(1, "year");
  368            }
  369            continue;
  370          }
  371 
  372          // For monthly bills
  373          let currentMonth = startDate.startOf("month");
  374          while (currentMonth.isSameOrBefore(endDate)) {
  375            const billDate =
  376              billData.day === 1
  377                ? currentMonth.date(1)
  378                : currentMonth.date(billData.day);
  379 
  380            if (billDate.isBetween(startDate, endDate, "day", "[]")) {
  381              virtualTransactions.push({
  382                id: `bill_${billData.id}_${billDate.format("YYYY-MM-DD")}`,
  383                description: billData.name,
  384                amount: Number(billData.amount),
  385                date: billDate.format("YYYY-MM-DD"),
  386                type: "expense",
  387                category_id: billData.category_id,
  388                category_name: bill.categories?.name || "Uncategorized",
  389                category_color: bill.categories?.color || "#6366F1",
  390                category_icon: bill.categories?.icon || "receipt",
  391                is_virtual: true,
  392              });
  393            }
  394            currentMonth = currentMonth.add(1, "month");
  395          }
  396        }
  397 
  398        // Process recurring transactions (incomes)
  399        for (const transaction of actualTransactions) {
  400          if (!transaction.is_recurring) continue;
  401          const baseTransaction = {
    402            ...transaction,
    403            amount: Number(transaction.amount),
    404            is_virtual: true,
    405          };
    406 
    407          // Special handling for Ruba's salary (biweekly on Fridays)
    408          if (transaction.description === "Ruba's Salary") {
    409            let currentDate = startDate.clone();
    410            // Ensure we start on a Friday
    411            while (currentDate.day() !== 5) {
    412              // 5 is Friday
    413              currentDate = currentDate.add(1, "day");
    414            }
    415 
    416            while (currentDate.isSameOrBefore(endDate)) {
    417              if (currentDate.isBetween(startDate, endDate, "day", "[]")) {
    418                virtualTransactions.push({
    419                  ...baseTransaction,
    420                  date: currentDate.format("YYYY-MM-DD"),
    421                  id: `${transaction.id}_${currentDate.format("YYYY-MM-DD")}`,
    422                });
    423              }
    424              // Add two weeks to get to next payday
    425              currentDate = currentDate.add(14, "days");
    426            }
    427            continue;
    428          }
    429 
    430          // Handle other recurring transactions as before
    431          const originalDate = dayjs(transaction.date);
    432          const dayOfMonth =
    433            transaction.recurring_type === "twice-monthly"
    434              ? null // Handle twice-monthly separately
    435              : originalDate.date();
    436 
    437          let currentMonth = startDate.startOf("month");
    438 
    439          while (currentMonth.isSameOrBefore(endDate)) {
    440            if (
    441              transaction.recurring_type === "twice-monthly" &&
    442              transaction.first_date &&
    443              transaction.second_date
    444            ) {
    445              // Handle twice-monthly transactions
    446              const firstDate = currentMonth.date(transaction.first_date);
    447              const secondDate = currentMonth.date(transaction.second_date);
    448 
    449              if (firstDate.isBetween(startDate, endDate, "day", "[]")) {
    450                virtualTransactions.push({
    451                  ...baseTransaction,
    452                  date: firstDate.format("YYYY-MM-DD"),
    453                  id: `${transaction.id}_${firstDate.format("YYYY-MM-DD")}`,
    454                });
    455              }
    456 
    457              if (secondDate.isBetween(startDate, endDate, "day", "[]")) {
    458                virtualTransactions.push({
    459                  ...baseTransaction,
    460                  date: secondDate.format("YYYY-MM-DD"),
    461                  id: `${transaction.id}_${secondDate.format("YYYY-MM-DD")}`,
    462                });
    463              }
    464            } else if (dayOfMonth) {
    465              // Handle monthly transactions
    466              const transactionDate = currentMonth.date(dayOfMonth);
    467 
    468              if (transactionDate.isBetween(startDate, endDate, "day", "[]")) {
    469                virtualTransactions.push({
    470                  ...baseTransaction,
    471                  date: transactionDate.format("YYYY-MM
      471                  date: transactionDate.format("YYYY-MM-DD"),
472                  id: `${transaction.id}_${transactionDate.format("YYYY-MM-DD")}`,
473                });
474              }
475            }
476 
477            currentMonth = currentMonth.add(1, "month");
478          }
479        }
480      }
481 
482      console.log("[Transactions API] Generated virtual transactions:", {
483        count: virtualTransactions.length,
484        sampleDates: virtualTransactions.slice(0, 3).map((t) => t.date),
485      });
486 
487      // Combine and format all transactions
488      const combinedTransactions = [
489        ...actualTransactions.map((t) => ({
490          ...t,
491          amount: Number(t.amount),
492          date: dayjs(t.date).format("YYYY-MM-DD"),
493        })),
494        ...virtualTransactions,
495      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
496 
497      // Add cache control headers
498      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
499      res.set("Pragma", "no-cache");
500      res.set("Expires", "0");
501 
502      return res.json(combinedTransactions);
503    } catch (error) {
504      console.error("[Transactions API] Error:", error);
505      return res.status(500).json({
506        message: "Failed to load transactions",
507        error:
508          process.env.NODE_ENV === "development"
509            ? error
510            : "Internal server error",
511      });
512    }
513  });
514 
515  app.post("/api/transactions", async (req, res) => {
516    try {
517      console.log("[Transactions API] Creating new transaction:", req.body);
518      const transactionData = await insertTransactionSchema.parseAsync(req.body);
519 
520      // Explicitly determine if transaction is recurring
521      const isRecurring =
522        transactionData.recurring_type && transactionData.recurring_type !== "once";
523 
524      console.log("[Transactions API] Processing transaction with recurring info:", {
525        recurring_type: transactionData.recurring_type,
526        is_recurring: isRecurring,
527      });
528 
529      // Create the transaction with recurring fields
530      const [newTransaction] = await db
531        .insert(transactions)
532        .values({
533          description: transactionData.description,
534          amount: transactionData.amount,
535          date: new Date(transactionData.date),
536          type: transactionData.type,
537          category_id: transactionData.category_id,
538          recurring_type: transactionData.recurring_type || null,
539          is_recurring: isRecurring,
540          first_date: transactionData.first_date || null,
541          second_date: transactionData.second_date || null,
542        })
543        .returning();
544 
545      console.log("[Transactions API] Created transaction:", newTransaction);
546      res.status(201).json(newTransaction);
547    } catch (error) {
548      console.error("[Transactions API] Error creating transaction:", error);
549      res.status(400).json({
550        message: error instanceof Error ? error.message : "Invalid request data",
551      });
552    }
553  });
554 
555  app.patch("/api/transactions/:id", async (req, res) => {
556    try {
557      console.log("[Transactions API] Updating transaction:", {
558        id: req.params.id,
559        data: req.body,
560      });
561 
562      const transactionId = parseInt(req.params.id);
563      const existingTransaction = await db.query.transactions.findFirst({
564        where: eq(transactions.id, transactionId),
565      });
566 
567      if (!existingTransaction) {
568        return res.status(404).json({ message: "Transaction not found" });
569      }
570 
571      // Update all transactions with the same description and category to maintain consistency
572      const oldDescription = existingTransaction.description.toLowerCase();
573      const newDescription = req.body.description.toLowerCase();
574 
575      // Start a transaction to ensure all updates happen together
576      let updatedTransaction;
577      try {
578        await db.transaction(async (tx) => {
579          // First update the specific transaction
580          [updatedTransaction] = await tx
581            .update(transactions)
582            .set({
583              description: req.body.description,
584              amount: req.body.amount,
585              date: new Date(req.body.date),
586              type: req.body.type,
587              category_id: req.body.category_id,
588            })
589            .where(eq(transactions.id, transactionId))
590            .returning();
591 
592          // Then update all related transactions to maintain consistency
593          if (
594            oldDescription !== newDescription ||
595            existingTransaction.category_id !== req.body.category_id
596          ) {
597            await tx
598              .update(transactions)
599              .set({
600                description: req.body.description,
601                category_id: req.body.category_id,
602              })
603              .where(
604                and(
605                  eq(transactions.type, existingTransaction.type),
606                  ilike(transactions.description, oldDescription),
607                  eq(transactions.category_id, existingTransaction.category_id),
608                ),
609              );
610          }
611        });
612      } catch (error) {
613        console.error("[Transactions API] Transaction update failed:", error);
614        throw error;
615      }
616 
617      console.log("[Transactions API] Successfully updated transaction:", updatedTransaction);
618 
619      // Add aggressive cache control headers
620      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
621      res.set("Pragma", "no-cache");
622      res.set("Expires", "0");
623 
624      res.json(updatedTransaction);
625    } catch (error) {
626      console.error("[Transactions API] Error updating transaction:", error);
627      res.status(400).json({
628        message: error instanceof Error ? error.message : "Invalid request data",
629      });
630    }
631  });
632 
633  app.delete("/api/transactions/:id", async (req, res) => {
634    try {
635      const transactionId = parseInt(req.params.id, 10);
636      if (isNaN(transactionId)) {
637        return res.status(400).json({
638          message: "Invalid transaction ID",
639          error: "Transaction ID must be a number",
640        });
641      }
642 
643      console.log("[Transactions API] Attempting to delete transaction:", {
644        id: transactionId,
645      });
646 
647      const transaction = await db.query.transactions.findFirst({
648        where: eq(transactions.id, transactionId),
649      });
650 
651      if (!transaction) {
652        console.log("[Transactions API] Transaction not found:", {
653          id: transactionId,
654        });
655        return res.status(404).json({
656          message: "Transaction not found",
657          error: `No transaction found with ID ${transactionId}`,
658        });
659      }
660 
661      const deleted = await db
662        .delete(transactions)
663        .where(eq(transactions.id, transactionId))
664        .returning();
665 
666      if (!deleted.length) {
667        throw new Error(`Failed to delete transaction ${transactionId}`);
668      }
669 
670      console.log("[Transactions API] Successfully deleted transaction:", {
671        id: transactionId,
672        deletedCount: deleted.length,
673      });
674 
675      return res.status(200).json({
676        message: "Transaction deleted successfully",
677        deletedId: transactionId,
678      });
679    } catch (error) {
680      console.error("[Transactions API] Error in delete transaction handler:", {
681        id: req.params.id,
682        error: error instanceof Error ? error.message : "Unknown error",
683      });
684 
685      return res.status(500).json({
686        message: "Failed to delete transaction",
687        error:
688          process.env.NODE_ENV === "development"
689            ? error instanceof Error
690              ? error.message
691              : "Unknown error"
692            : "Internal server error",
693      });
694    }
695  });
696 
697  app.patch("/api/bills/:id", async (req, res) => {
698    try {
699      console.log("[Bills API] Updating bill:", {
700        id: req.params.id,
701        data: req.body,
702      });
703 
704      const billId = parseInt(req.params.id);
705      const existingBill = await db.query.bills.findFirst({
706        where: eq(bills.id, billId),
707      });
708 
709      if (!existingBill) {
710        return res.status(404).json({ message: "Bill not found" });
711      }
712 
713      // Update the bill
714      const [updatedBill] = await db
715        .update(bills)
716        .set({
717          name: req.body.name,
718          amount: req.body.amount,
719          day: req.body.day,
720          category_id: req.body.category_id,
721        })
722        .where(eq(bills.id, billId))
723        .returning();
724 
725      // Also update any existing transactions that were generated from this bill
726      // to maintain consistency in descriptions and amounts
727      if (existingBill.name !== req.body.name) {
728        await db
729          .update(transactions)
730          .set({
731            description: req.body.name,
732            category_id: req.body.category_id,
733          })
734          .where(
735            and(
736              eq(transactions.category_id, existingBill.category_id),
737              ilike(transactions.description, `%${existingBill.name}%`),
738            ),
739          );
740      }
741 
742      console.log("[Bills API] Successfully updated bill:", updatedBill);
743 
744      // Add cache control headers
745      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
746      res.set("Pragma", "no-cache");
747      res.set("Expires", "0");
748 
749      res.json(updatedBill);
750    } catch (error) {
751      console.error("[Bills API] Error updating bill:", error);
752      res.status(400).json({
753        message: error instanceof Error ? error.message : "Invalid request data",
754      });
755    }
756  });
757 
758  const httpServer = createServer(app);
759  return httpServer;
760}