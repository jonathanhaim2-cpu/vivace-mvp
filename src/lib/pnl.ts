export type PnlInputRow = {
  id: string;
  name: string;
  kind: string;
  documents: number;
  amount: number;
  children: { id: string; name: string; documents: number; amount: number }[];
};

export type PnlFigure = {
  id: string;
  name: string;
  kind: string;
  documents: number;
  amount: number;
  depth: 0 | 1;
};

/** Visual model of the P&L. Amounts and document counts are copied, not recomputed. */
export function presentPnl(rows: PnlInputRow[]) {
  const figures: PnlFigure[] = [];
  for (const parent of rows) {
    figures.push({
      id: parent.id,
      name: parent.name,
      kind: parent.kind,
      documents: parent.documents,
      amount: parent.amount,
      depth: 0,
    });
    for (const child of parent.children) {
      figures.push({
        id: child.id,
        name: child.name,
        kind: parent.kind,
        documents: child.documents,
        amount: child.amount,
        depth: 1,
      });
    }
  }
  return { figures };
}

export function pnlFigureKey(figure: PnlFigure) {
  return `${figure.id}|${figure.documents}|${figure.amount}`;
}
