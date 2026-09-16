"use client";

import { useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { createUser, updateUser, type UserActionState } from "@/actions/users";
import { CredentialsCard } from "@/components/users/credentials-card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_ROLES, APP_ROLE_LABELS, isBranchScopedRole, type AppRole } from "@/lib/roles";

type Branch = { id: string; name: string };

type UserValues = {
  id?: string;
  name: string;
  username: string;
  role: AppRole;
  active: boolean;
  branchIds: string[];
};

function generateClientPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let password = "";
  for (const byte of bytes) password += alphabet[byte % alphabet.length];
  if (!/[A-Za-z]/.test(password)) password = `A${password.slice(1)}`;
  if (!/[0-9]/.test(password)) password = `${password.slice(0, -1)}7`;
  return password;
}

export function CreateUserPanel({ branches }: { branches: Branch[] }) {
  const [version, setVersion] = useState(0);
  return <UserForm key={version} branches={branches} onDone={() => setVersion((value) => value + 1)} />;
}

export function UserForm({
  branches,
  initial,
  onDone,
}: {
  branches: Branch[];
  initial?: UserValues;
  onDone?: () => void;
}) {
  const action = initial?.id ? updateUser : createUser;
  const [state, formAction] = useActionState(action, null as UserActionState);
  const [role, setRole] = useState<AppRole>(initial?.role ?? "edge_worker");
  const [password, setPassword] = useState("");
  const scoped = isBranchScopedRole(role);
  const editing = Boolean(initial?.id);

  const helper = useMemo(() => {
    if (scoped) return "חובה לשייך לפחות סניף אחד. המשתמש יראה רק את הסניפים האלה.";
    return "לאדמין ולהנה״ח יש גישה לכל הסניפים. השיוך כאן הוא אופציונלי.";
  }, [scoped]);

  if (state?.credentials) {
    return (
      <CredentialsCard
        credentials={state.credentials}
        onDismiss={() => {
          onDone?.();
        }}
      />
    );
  }

  if (editing && state && !state.error) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">המשתמש עודכן.</p>
        <Button type="button" onClick={() => onDone?.()}>
          סגירה
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state?.error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={editing ? "edit-name" : "name"}>שם תצוגה</FieldLabel>
          <Input
            id={editing ? "edit-name" : "name"}
            name="name"
            required
            defaultValue={initial?.name}
            placeholder="למשל: נועה כהן"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={editing ? "edit-username" : "username"}>שם משתמש</FieldLabel>
          <Input
            id={editing ? "edit-username" : "username"}
            name="username"
            required
            dir="ltr"
            autoComplete="off"
            defaultValue={initial?.username}
            placeholder="noga"
            className="text-left"
          />
          <FieldDescription>באנגלית, ייחודי. זה מה שמקלידים בכניסה.</FieldDescription>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={editing ? "edit-role" : "role"}>תפקיד</FieldLabel>
          <select
            id={editing ? "edit-role" : "role"}
            name="role"
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as AppRole)}
          >
            {APP_ROLES.map((item) => (
              <option key={item} value={item}>
                {APP_ROLE_LABELS[item]}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>סטטוס</FieldLabel>
          <label className="flex h-8 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={initial?.active ?? true}
              className="size-4 accent-[var(--brand-red)]"
            />
            פעיל — יכול להיכנס למערכת
          </label>
        </Field>
      </div>
      {editing ? null : (
        <Field>
          <FieldLabel htmlFor="password">סיסמה זמנית</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="password"
              name="password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="השאירו ריק להפקה אוטומטית"
              className="text-left"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassword(generateClientPassword())}
            >
              <RefreshCw className="size-3.5" />
              הפקה
            </Button>
          </div>
          <FieldDescription>לפחות 8 תווים, אות ומספר. תוצג פעם אחת אחרי יצירה.</FieldDescription>
        </Field>
      )}
      <Field>
        <FieldLabel>סניפים</FieldLabel>
        <FieldDescription>{helper}</FieldDescription>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין סניפים במערכת עדיין.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="branchId"
                  value={branch.id}
                  defaultChecked={initial?.branchIds.includes(branch.id)}
                  className="size-4 accent-[var(--brand-red)]"
                />
                {branch.name}
              </label>
            ))}
          </div>
        )}
      </Field>
      <SubmitButton editing={editing} />
    </form>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "שומרים…" : editing ? "שמירת שינויים" : "יצירת משתמש"}
    </Button>
  );
}
