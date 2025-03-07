declare module '@db/schema' {
  export const users: any;
  export const insertUserSchema: any;
  export const categories: any;
  export const insertCategorySchema: any;
  export const transactions: any;
  export const bills: any;
  export const insertTransactionSchema: any;
  export type SelectUser = {
    id: number;
    username: string;
    password: string;
  };
}