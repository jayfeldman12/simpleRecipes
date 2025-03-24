declare module "dompurify" {
  export interface DOMPurifyI {
    sanitize(dirty: string, options?: any): string;
    addHook(hook: string, callback: Function): DOMPurifyI;
    setConfig(cfg: any): DOMPurifyI;
    clearConfig(): void;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
  }

  const DOMPurify: DOMPurifyI;
  export default DOMPurify;
}
