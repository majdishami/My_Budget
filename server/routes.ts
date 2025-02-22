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
    471                  date: transactionDate.format("YYYY-MM-DD"),
    472                  date: transactionDate.format("YYYY-MM-DD"),
473                  id: `${transaction.id}_${transactionDate.format("YYYY-MM-DD")}`,
474                });
475              }
476            }
477 
478            currentMonth = currentMonth.add(1, "month");
479          }
480        }
481      }
482 
483      console.log("[Transactions API] Generated virtual transactions:", {
484        count: virtualTransactions.length,
485        sampleDates: virtualTransactions.slice(0, 3).map((t) => t.date),
486      });
487 
488      // Combine and format all transactions
489      const combinedTransactions = [
490        ...actualTransactions.map((t) => ({
491          ...t,
492          amount: Number(t.amount),
493          date: dayjs(t.date).format("YYYY-MM-DD"),
494        })),
495        ...virtualTransactions,
496      ].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
497 
498      // Add cache control headers
499      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
500      res.set("Pragma", "no-cache");
501      res.set("Expires", "0");
502 
503      return res.json(combinedTransactions);
504    } catch (error) {
505      console.error("[Transactions API] Error:", error);
506      return res.status(500).json({
507        message: "Failed to load transactions",
508        error:
509          process.env.NODE_ENV === "development"
510            ? error
511            : "Internal server error",
512      });
513    }
514  });
515 
516  app.post("/api/transactions", async (req, res) => {
517    try {
518      console.log("[Transactions API] Creating new transaction:", req.body);
519      const transactionData = await insertTransactionSchema.parseAsync(req.body);
520 
521      // Explicitly determine if transaction is recurring
522      const isRecurring =
523        transactionData.recurring_type && transactionData.recurring_type !== "once";
524 
525      console.log("[Transactions API] Processing transaction with recurring info:", {
526        recurring_type: transactionData.recurring_type,
527        is_recurring: isRecurring,
528      });
529 
530      // Create the transaction with recurring fields
531      const [newTransaction] = await db
532        .insert(transactions)
533        .values({
534          description: transactionData.description,
535          amount: transactionData.amount,
536          date: new Date(transactionData.date),
537          type: transactionData.type,
538          category_id: transactionData.category_id,
539          recurring_type: transactionData.recurring_type || null,
540          is_recurring: isRecurring,
541          first_date: transactionData.first_date || null,
542          second_date: transactionData.second_date || null,
543        })
544        .returning();
545 
546      console.log("[Transactions API] Created transaction:", newTransaction);
547      res.status(201).json(newTransaction);
548    } catch (error) {
549      console.error("[Transactions API] Error creating transaction:", error);
550      res.status(400).json({
551        message: error instanceof Error ? error.message : "Invalid request data",
552      });
553    }
554  });
555 
556  app.patch("/api/transactions/:id", async (req, res) => {
557    try {
558      console.log("[Transactions API] Updating transaction:", {
559        id: req.params.id,
560        data: req.body,
561      });
562 
563      const transactionId = parseInt(req.params.id);
564      const existingTransaction = await db.query.transactions.findFirst({
565        where: eq(transactions.id, transactionId),
566      });
567 
568      if (!existingTransaction) {
569        return res.status(404).json({ message: "Transaction not found" });
570      }
571 
572      // Update all transactions with the same description and category to maintain consistency
573      const oldDescription = existingTransaction.description.toLowerCase();
574      const newDescription = req.body.description.toLowerCase();
575 
576      // Start a transaction to ensure all updates happen together
577      let updatedTransaction;
578      try {
579        await db.transaction(async (tx) => {
580          // First update the specific transaction
581          [updatedTransaction] = await tx
582            .update(transactions)
583            .set({
584              description: req.body.description,
585              amount: req.body.amount,
586              date: new Date(req.body.date),
587              type: req.body.type,
588              category_id: req.body.category_id,
589            })
590            .where(eq(transactions.id, transactionId))
591            .returning();
592 
593          // Then update all related transactions to maintain consistency
594          if (
595            oldDescription !== newDescription ||
596            existingTransaction.category_id !== req.body.category_id
597          ) {
598            await tx
599              .update(transactions)
600              .set({
601                description: req.body.description,
602                category_id: req.body.category_id,
603              })
604              .where(
605                and(
606                  eq(transactions.type, existingTransaction.type),
607                  ilike(transactions.description, oldDescription),
608                  eq(transactions.category_id, existingTransaction.category_id),
609                ),
610              );
611          }
612        });
613      } catch (error) {
614        console.error("[Transactions API] Transaction update failed:", error);
615        throw error;
616      }
617 
618      console.log("[Transactions API] Successfully updated transaction:", updatedTransaction);
619 
620      // Add aggressive cache control headers
621      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
622      res.set("Pragma", "no-cache");
623      res.set("Expires", "0");
624 
625      res.json(updatedTransaction);
626    } catch (error) {
627      console.error("[Transactions API] Error updating transaction:", error);
628      res.status(400).json({
629        message: error instanceof Error ? error.message : "Invalid request data",
630      });
631    }
632  });
633 
634  app.delete("/api/transactions/:id", async (req, res) => {
635    try {
636      const transactionId = parseInt(req.params.id, 10);
637      if (isNaN(transactionId)) {
638        return res.status(400).json({
639          message: "Invalid transaction ID",
640          error: "Transaction ID must be a number",
641        });
642      }
643 
644      console.log("[Transactions API] Attempting to delete transaction:", {
645        id: transactionId,
646      });
647 
648      const transaction = await db.query.transactions.findFirst({
649        where: eq(transactions.id, transactionId),
650      });
651 
652      if (!transaction) {
653        console.log("[Transactions API] Transaction not found:", {
654          id: transactionId,
655        });
656        return res.status(404).json({
657          message: "Transaction not found",
658          error: `No transaction found with ID ${transactionId}`,
659        });
660      }
661 
662      const deleted = await db
663        .delete(transactions)
664        .where(eq(transactions.id, transactionId))
665        .returning();
666 
667      if (!deleted.length) {
668        throw new Error(`Failed to delete transaction ${transactionId}`);
669      }
670 
671      console.log("[Transactions API] Successfully deleted transaction:", {
672        id: transactionId,
673        deletedCount: deleted.length,
674      });
675 
676      return res.status(200).json({
677        message: "Transaction deleted successfully",
678        deletedId: transactionId,
679      });
680    } catch (error) {
681      console.error("[Transactions API] Error in delete transaction handler:", {
682        id: req.params.id,
683        error: error instanceof Error ? error.message : "Unknown error",
684      });
685 
686      return res.status(500).json({
687        message: "Failed to delete transaction",
688        error:
689          process.env.NODE_ENV === "development"
690            ? error instanceof Error
691              ? error.message
692              : "Unknown error"
693            : "Internal server error",
694      });
695    }
696  });
697 
698  app.patch("/api/bills/:id", async (req, res) => {
699    try {
700      console.log("[Bills API] Updating bill:", {
701        id: req.params.id,
702        data: req.body,
703      });
704 
705      const billId = parseInt(req.params.id);
706      const existingBill = await db.query.bills.findFirst({
707        where: eq(bills.id, billId),
708      });
709 
710      if (!existingBill) {
711        return res.status(404).json({ message: "Bill not found" });
712      }
713 
714      // Update the bill
715      const [updatedBill] = await db
716        .update(bills)
717        .set({
718          name: req.body.name,
719          amount: req.body.amount,
720          day: req.body.day,
721          category_id: req.body.category_id,
722        })
723        .where(eq(bills.id, billId))
724        .returning();
725 
726      // Also update any existing transactions that were generated from this bill
727      // to maintain consistency in descriptions and amounts
728      if (existingBill.name !== req.body.name) {
729        await db
730          .update(transactions)
731          .set({
732            description: req.body.name,
733            category_id: req.body.category_id,
734          })
735          .where(
736            and(
737              eq(transactions.category_id, existingBill.category_id),
738              ilike(transactions.description, `%${existingBill.name}%`),
739            ),
740          );
741      }
742 
743      console.log("[Bills API] Successfully updated bill:", updatedBill);
744 
745      // Add cache control headers
746      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
747      res.set("Pragma", "no-cache");
748      res.set("Expires", "0");
749 
750      res.json(updatedBill);
751    } catch (error) {
752      console.error("[Bills API] Error updating bill:", error);
753      res.status(400).json({
754        message: error instanceof Error ? error.message : "Invalid request data",
755      });
756    }
757  });
758 
759  const httpServer = createServer(app);
760  return httpServer;
761 }