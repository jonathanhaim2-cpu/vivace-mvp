"use client";

import { useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { createUser, updateUser, type UserActionState } from "@/actions/users";
import { CredentialsCard } from "@/components/users/credentials-card";
import { Button } from "@/components/ui/button";
import {
  CompactField,
  CompactForm,
  NativeSelect,
} from "@/components/ui/compact-form";
import { CompactMultiSelect } from "@/components/ui/compact-multi-select";
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
  const prefix = editing ? "edit-" : "";

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
      <div className="flex flex-wrap items-center gap-2">
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-sm">המשתמש עודכן.</p>
        <Button type="button" size="sm" onClick={() => onDone?.()}>
          סגירה
        </Button>
      </div>
    );
  }

  return (
    <CompactForm action={formAction}>
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state?.error ? (
        <p className="basis-full rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <CompactField label="שם תצוגה" htmlFor={`${prefix}name`} grow>
        <Input
          id={`${prefix}name`}
          name="name"
          required
          defaultValue={initial?.name}
          placeholder="למשל: נועה כהן"
        />
      </CompactField>

      <CompactField
        label="שם משתמש"
        htmlFor={`${prefix}username`}
        hint="באנגלית, ייחודי. זה מה שמקלידים בכניסה."
      >
        <Input
          id={`${prefix}username`}
          name="username"
          required
          dir="ltr"
          autoComplete="off"
          defaultValue={initial?.username}
          placeholder="noga"
          aria-describedby={`${prefix}username-hint`}
          className="text-left"
        />
      </CompactField>

      <CompactField label="תפקיד" htmlFor={`${prefix}role`}>
        <NativeSelect
          id={`${prefix}role`}
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as AppRole)}
        >
          {APP_ROLES.map((item) => (
            <option key={item} value={item}>
              {APP_ROLE_LABELS[item]}
            </option>
          ))}
        </NativeSelect>
      </CompactField>

      <CompactField label="סטטוס" htmlFor={`${prefix}active`}>
        <NativeSelect id={`${prefix}active`} name="active" defaultValue={initial?.active === false ? "off" : "on"}>
          <option value="on">פעיל</option>
          <option value="off">מושבת</option>
        </NativeSelect>
      </CompactField>

      {editing ? null : (
        <CompactField
          label="סיסמה זמנית"
          htmlFor="password"
          hint="לפחות 8 תווים, אות ומספר. תוצג פעם אחת אחרי יצירה. ריק = הפקה אוטומטית."
          grow
          className="min-w-[12rem]"
        >
          <div className="flex gap-1.5">
            <Input
              id="password"
              name="password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="ריק = הפקה אוטומטית"
              aria-describedby="password-hint"
              className="text-left"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="הפקת סיסמה זמנית"
              title="הפקה"
              onClick={() => setPassword(generateClientPassword())}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </CompactField>
      )}

      <CompactField label="סניפים" htmlFor={`${prefix}branches`} hint={helper} className="min-w-[12rem]">
        {branches.length === 0 ? (
          <p className="flex h-8 items-center text-xs text-muted-foreground">אין סניפים במערכת</p>
        ) : (
          <CompactMultiSelect
            id={`${prefix}branches`}
            name="branchId"
            options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
            defaultValue={initial?.branchIds}
            placeholder="בחירת סניף"
            required={scoped}
            requiredMessage="יש לשייך לפחות סניף אחד למנהל סניף או עובד קצה"
          />
        )}
      </CompactField>

      <SubmitButton editing={editing} />
    </CompactForm>
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
