declare module "qrcode-terminal" {
  interface Options {
    small?: boolean;
  }
  const qrterm: {
    generate(text: string, opts: Options, cb: (qr: string) => void): void;
  };
  export default qrterm;
}
