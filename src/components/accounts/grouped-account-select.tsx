import { CHART_OF_ACCOUNTS, DEFAULT_EXPENSE_LEAF_ID, type AccountKind } from "@/lib/chart-of-accounts";

export function GroupedAccountSelect({
  name = "accountId",
  id,
  defaultValue,
  kinds,
  required = true,
}: {
  name?: string;
  id?: string;
  defaultValue?: string | null;
  kinds?: AccountKind[];
  required?: boolean;
}) {
  const groups = CHART_OF_ACCOUNTS.filter((parent) => !kinds || kinds.includes(parent.kind));

  return (
    <select
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue ?? DEFAULT_EXPENSE_LEAF_ID}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
    >
      {groups.map((parent) => (
        <optgroup key={parent.id} label={parent.name}>
          {parent.children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
