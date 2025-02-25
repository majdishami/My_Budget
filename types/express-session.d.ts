declare module 'express-session' {
  interface SessionOptions {
    store?: any;
    secret: string;
    resave: boolean;
    saveUninitialized: boolean;
    name?: string;
    cookie?: {
      secure?: boolean;
      maxAge?: number;
      httpOnly?: boolean;
      sameSite?: boolean | 'lax' | 'strict' | 'none';
    };
  }
  
  const session: any;
  export = session;
  export { SessionOptions };
}