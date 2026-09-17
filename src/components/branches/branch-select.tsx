import { NativeSelect } from "@/components/ui/compact-form";
import {
  NETWORK_BRANCH_LABEL,
  NETWORK_BRANCH_VALUE,
} from "@/lib/invoice-branch";

export type BranchOption = { id: string; name: string };

export function BranchSelect({
  id,
  name = "branchId",
  branches,
  defaultValue,
  required = false,
  allowEmpty = !required,
  emptyLabel = "בחירת סניף",
  allowNetwork = false,
  networkLabel = NETWORK_BRANCH_LABEL,
  className,
}: {
  id?: string;
  name?: string;
  branches: BranchOption[];
  defaultValue?: string | null;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  allowNetwork?: boolean;
  networkLabel?: string;
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
      {allowNetwork ? <option value={NETWORK_BRANCH_VALUE}>{networkLabel}</option> : null}
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </NativeSelect>
  );
}
