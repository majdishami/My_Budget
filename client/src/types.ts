
export type Bill = {
  id: string;
  name: string;
  amount: number;
  date: string;
  type?: "expense"; // Ensuring bills are marked correctly
};

export type Income = {
  id: string;
  source: string;
  amount: number;
  date: string;
  type?: "income"; // Ensuring incomes are marked correctly
};

export type Transaction = Bill | Income; // Union type to combine both
