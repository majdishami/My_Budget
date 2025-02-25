declare module 'express-fileupload' {
  interface File {
    name: string;
    data: Buffer;
    size: number;
    encoding: string;
    tempFilePath: string;
    truncated: boolean;
    mimetype: string;
    md5: string;
    mv(path: string, callback: (err?: any) => void): void;
    mv(path: string): Promise<void>;
  }

  const fileUpload: any;
  export = fileUpload;
  export { File };
}