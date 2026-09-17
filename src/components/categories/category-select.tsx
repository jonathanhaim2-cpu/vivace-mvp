import { NativeSelect } from "@/components/ui/compact-form";

export function CategorySelect({
  name = "categoryId",
  id,
  tree,
  defaultValue,
  allowEmpty = true,
  emptyLabel = "ללא קטגוריה",
  parentsOnly = false,
}: {
  name?: string;
  id?: string;
  tree: { id: string; name: string; children: { id: string; name: string }[] }[];
  defaultValue?: string | null;
  allowEmpty?: boolean;
  emptyLabel?: string;
  parentsOnly?: boolean;
}) {
  return (
    <NativeSelect id={id} name={name} defaultValue={defaultValue ?? ""}>
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {tree.map((parent) =>
        parentsOnly ? (
          <option key={parent.id} value={parent.id}>
            {parent.name}
          </option>
        ) : (
          <optgroup key={parent.id} label={parent.name}>
            <option value={parent.id}>{parent.name} (קטגוריית אב)</option>
            {parent.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        ),
      )}
    </NativeSelect>
  );
}
