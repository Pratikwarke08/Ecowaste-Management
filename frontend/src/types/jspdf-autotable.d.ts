declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  export interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    styles?: { fontSize?: number; cellPadding?: number };
    headStyles?: { fillColor?: number[]; textColor?: number; fontStyle?: string };
    alternateRowStyles?: { fillColor?: number[] };
    theme?: 'striped' | 'grid' | 'plain';
  }
  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
