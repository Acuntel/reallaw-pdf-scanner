import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
  PDFSignature,
} from "pdf-lib";

export type ExtractedField = {
  name: string;
  type:
    | "text"
    | "checkbox"
    | "radio"
    | "dropdown"
    | "optionlist"
    | "signature"
    | "unknown";
  value: string | null;
  filled: boolean;
  page: number | null;
};

export type ExtractedContract = {
  pageCount: number;
  fieldCount: number;
  filledCount: number;
  missingCount: number;
  fields: ExtractedField[];
};

export async function extractContract(
  pdfBytes: ArrayBuffer | Uint8Array,
): Promise<ExtractedContract> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const pageRefs = pdfDoc.getPages().map((p) => p.ref);

  let fields: ExtractedField[] = [];

  const pageOf = (field: any): number | null => {
    try {
      const widgets = field.acroField.getWidgets();
      for (const w of widgets) {
        const pRef = w.P();
        if (!pRef) continue;
        const idx = pageRefs.findIndex((r) => r === pRef);
        if (idx >= 0) return idx + 1;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  try {
    const form = pdfDoc.getForm();
    const rawFields = form.getFields();

    for (const f of rawFields) {
      const name = f.getName();
      const page = pageOf(f);
      let entry: ExtractedField;

      if (f instanceof PDFTextField) {
        const v = f.getText();
        entry = {
          name,
          type: "text",
          value: v ?? null,
          filled: !!(v && v.trim().length > 0),
          page,
        };
      } else if (f instanceof PDFCheckBox) {
        const checked = f.isChecked();
        entry = {
          name,
          type: "checkbox",
          value: checked ? "checked" : "unchecked",
          filled: checked,
          page,
        };
      } else if (f instanceof PDFRadioGroup) {
        const v = f.getSelected();
        entry = {
          name,
          type: "radio",
          value: v ?? null,
          filled: !!v,
          page,
        };
      } else if (f instanceof PDFDropdown) {
        const v = f.getSelected();
        const joined = v && v.length > 0 ? v.join(", ") : null;
        entry = {
          name,
          type: "dropdown",
          value: joined,
          filled: !!joined,
          page,
        };
      } else if (f instanceof PDFOptionList) {
        const v = f.getSelected();
        const joined = v && v.length > 0 ? v.join(", ") : null;
        entry = {
          name,
          type: "optionlist",
          value: joined,
          filled: !!joined,
          page,
        };
      } else if (f instanceof PDFSignature) {
        entry = { name, type: "signature", value: null, filled: false, page };
      } else {
        entry = { name, type: "unknown", value: null, filled: false, page };
      }

      fields.push(entry);
    }
  } catch {
    // No AcroForm — leave fields empty
  }

  const filledCount = fields.filter((f) => f.filled).length;
  const missingCount = fields.length - filledCount;

  return {
    pageCount,
    fieldCount: fields.length,
    filledCount,
    missingCount,
    fields,
  };
}

export function formatFieldsForLLM(extracted: ExtractedContract): string {
  const lines: string[] = [];
  lines.push(`PAGES: ${extracted.pageCount}`);
  lines.push(`FIELDS_TOTAL: ${extracted.fieldCount}`);
  lines.push(`FIELDS_FILLED: ${extracted.filledCount}`);
  lines.push(`FIELDS_MISSING: ${extracted.missingCount}`);
  lines.push("");
  lines.push("=== FILLED FIELDS (in document order) ===");
  for (const f of extracted.fields.filter((x) => x.filled)) {
    const p = f.page ? `p${f.page}` : "p?";
    lines.push(`${p} [${f.type}] ${f.name} = ${truncate(f.value ?? "", 500)}`);
  }
  lines.push("");
  lines.push("=== BLANK / UNCHECKED FIELDS (in document order) ===");
  for (const f of extracted.fields.filter((x) => !x.filled)) {
    const p = f.page ? `p${f.page}` : "p?";
    lines.push(`${p} [${f.type}] ${f.name}`);
  }
  return lines.join("\n");
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}
