import { NativeSelect } from "@/components/ui/compact-form";

export type BranchOption = { id: string; name: string };

export function BranchSelect({
  id,
  name = "branchId",
  branches,
  defaultValue,
  required = false,
  allowEmpty = !required,
  emptyLabel = "בחירת סניף",
  className,
}: {
  id?: string;
  name?: string;
  branches: BranchOption[];
  defaultValue?: string | null;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <NativeSelect
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      required={required}
      className={className}
    >
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </NativeSelect>
  );
}
