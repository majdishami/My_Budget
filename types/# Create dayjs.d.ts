# Create dayjs.d.ts
echo "declare module 'dayjs' {
  const dayjs: any;
  export = dayjs;
}" > types/dayjs.d.ts

# Create passport.d.ts
echo "declare module 'passport' {
  const passport: any;
  export = passport;
}" > types/passport.d.ts

# Create passport-local.d.ts
echo "declare module 'passport-local' {
  const Strategy: any;
  export { Strategy };
}" > types/passport-local.d.ts

# Create express-session.d.ts
echo "declare module 'express-session' {
  const session: any;
  export = session;
}" > types/express-session.d.ts

# Create connect-pg-simple.d.ts
echo "declare module 'connect-pg-simple' {
  const connectPg: any;
  export = connectPg;
}" > types/connect-pg-simple.d.ts

# Create bcrypt.d.ts
echo "declare module 'bcrypt' {
  const bcrypt: any;
  export = bcrypt;
}" > types/bcrypt.d.ts

# Create express-fileupload.d.ts
echo "declare module 'express-fileupload' {
  const expressFileupload: any;
  export = expressFileupload;
}" > types/express-fileupload.d.ts

# Create replit-vite-plugin-runtime-error-modal.d.ts
echo "declare module '@replit/vite-plugin-runtime-error-modal' {
  const runtimeErrorOverlay: any;
  export = runtimeErrorOverlay;
}" > types/replit-vite-plugin-runtime-error-modal.d.ts