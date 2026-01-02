declare module 'jspdf' {
  export interface jsPDFOptions {
    orientation?: 'portrait' | 'landscape';
    unit?: 'pt' | 'mm' | 'cm' | 'in';
    format?: string | number[];
  }

  export interface AutoTable {
    finalY: number;
  }

  export class jsPDF {
    constructor(options?: jsPDFOptions);
    setFontSize(size: number): void;
    text(text: string, x: number, y: number): void;
    save(filename?: string): void;
    // lastAutoTable is added by the autoTable plugin dynamically
    lastAutoTable?: AutoTable;
    [key: string]: unknown;
  }
}
