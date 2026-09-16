"use client";

import { useActionState, useState } from "react";
import { resetUserPassword, setUserActive, type UserActionState } from "@/actions/users";
import { RoleChip } from "@/components/role-chip";
import { CredentialsCard } from "@/components/users/credentials-card";
import { UserForm } from "@/components/users/user-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseAppRole, type AppRole } from "@/lib/roles";

export type ManagedUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  branchIds: string[];
  branchNames: string[];
};

type Branch = { id: string; name: string };

export function UsersAdmin({
  users,
  branches,
}: {
  users: ManagedUser[];
  branches: Branch[];
}) {
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {banner ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {banner}
        </p>
      ) : null}
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין משתמשים. צרו את הראשון בטופס למעלה.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>משתמש</TableHead>
              <TableHead>תפקיד</TableHead>
              <TableHead>סניפים</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead className="text-end">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const role = parseAppRole(user.role) ?? "edge_worker";
              return (
                <TableRow key={user.id} className={user.active ? "" : "opacity-60"}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {user.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleChip role={role} />
                  </TableCell>
                  <TableCell className="max-w-[14rem] whitespace-normal text-muted-foreground">
                    {user.branchNames.length ? user.branchNames.join(" · ") : "כל הסניפים"}
                  </TableCell>
                  <TableCell>{user.active ? "פעיל" : "מושבת"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(user)}>
                        עריכה
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setResetting(user)}>
                        איפוס סיסמה
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.active ? "destructive" : "secondary"}
                        onClick={async () => {
                          setBanner(null);
                          const result = await setUserActive(user.id, !user.active);
                          if (result?.error) setBanner(result.error);
                        }}
                      >
                        {user.active ? "השבתה" : "הפעלה"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>עריכת משתמש</DialogTitle>
            <DialogDescription>שינוי שם, תפקיד, סניפים או סטטוס. לסיסמה יש כפתור איפוס נפרד.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <UserForm
              key={editing.id}
              branches={branches}
              initial={{
                id: editing.id,
                name: editing.name,
                username: editing.username,
                role: (parseAppRole(editing.role) ?? "edge_worker") as AppRole,
                active: editing.active,
                branchIds: editing.branchIds,
              }}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetting)} onOpenChange={(open) => !open && setResetting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>איפוס סיסמה</DialogTitle>
            <DialogDescription>
              {resetting ? `סיסמה זמנית חדשה עבור ${resetting.name}.` : null}
            </DialogDescription>
          </DialogHeader>
          {resetting ? (
            <ResetPasswordForm user={resetting} onDone={() => setResetting(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResetPasswordForm({ user, onDone }: { user: ManagedUser; onDone: () => void }) {
  const [state, formAction] = useActionState(resetUserPassword, null as UserActionState);

  if (state?.credentials) {
    return <CredentialsCard credentials={state.credentials} onDismiss={onDone} />;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={user.id} />
      {state?.error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        אפשר להשאיר ריק — המערכת תפיק סיסמה זמנית ותציג אותה פעם אחת.
      </p>
      <input
        name="password"
        dir="ltr"
        autoComplete="new-password"
        placeholder="סיסמה מותאמת (אופציונלי)"
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-left text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit">הפקת סיסמה זמנית</Button>
        <Button type="button" variant="outline" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
