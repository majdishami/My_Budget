
declare module 'file-saver' {
  export function saveAs(data: Blob, filename?: string, options?: Object): void;
}
declare module 'file-saver' {
  export function saveAs(
    data: Blob | File | string,
    filename?: string,
    options?: {
      type?: string;
      endings?: 'native' | 'transparent';
    }
  ): void;
}
