export const ACTA_PROMPT = `
You are generating a Technical Agreement Act ("Acta de Acuerdo Técnico") from a War Room session.

Analyze the entire conversation and produce a structured document in Markdown with these sections:

# ACTA DE ACUERDO TÉCNICO

## 1. VISIÓN ACORDADA
What was the agreed-upon goal or product vision? Synthesize from both agents.

## 2. DECISIONES TÉCNICAS VALIDADAS
List each technical decision that BOTH agents agreed on (cross-validated).
Format: "- [Decision]: [Proposed by] → [Validated by] — [Brief reasoning]"

## 3. CONTRADICCIONES RESUELTAS
List any contradictions that were found and how they were resolved.
Format: "- [Topic]: [Agent A said X] vs [Agent B said Y] → Resolution: [Z]"

## 4. CONTRADICCIONES PENDIENTES
Any unresolved disagreements that Richard needs to decide on.

## 5. HOJA DE RUTA TÉCNICA
Ordered list of implementation steps. Each step must include:
- What to build
- Estimated complexity (low/medium/high)
- Dependencies on other steps
- Which technologies/services to use

## 6. STACK FINAL CONFIRMADO
The definitive tech stack agreed upon.

## 7. RIESGOS IDENTIFICADOS
Technical and strategic risks mentioned during the session.

RULES:
- Do NOT invent information not discussed in the session.
- If something was discussed but not concluded, put it in PENDING.
- Use Spanish for section headers and general text, English for technical terms.
- Be concise — this is an executive document, not a transcript.
- Format the output as clean Markdown.
`;
