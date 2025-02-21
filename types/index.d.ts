declare module '@db' {
  export const db: any;
  export const pool: any;
}

declare module '@db/schema' {
  export const users: any;
  export const insertUserSchema: any;
}

declare module 'drizzle-orm' {
  export const eq: any;
}