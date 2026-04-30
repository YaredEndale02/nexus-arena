import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserX, UserPlus } from "lucide-react";
import { Tournament, TournamentAdminAssignment, TournamentAdminRole } from "@/lib/api";
import { UserSearchCombobox } from "./UserSearchCombobox";

export function TournamentStaffTab({
  tournament,
  admins,
  delegationForm,
  busyTournamentId,
  canManageDelegation,
  setDelegationForm,
  addDelegatedStaff,
  removeDelegatedStaff,
}: {
  tournament: Tournament;
  admins: TournamentAdminAssignment[];
  delegationForm: { userId: string; role: Exclude<TournamentAdminRole, "OWNER"> };
  busyTournamentId: string | null;
  canManageDelegation: boolean;
  setDelegationForm: React.Dispatch<React.SetStateAction<any>>;
  addDelegatedStaff: (id: string) => void;
  removeDelegatedStaff: (tournamentId: string, userId: string) => void;
}) {
  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Tournament Staff</CardTitle>
          <CardDescription>Assign admins, referees, and moderators.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-heading text-lg">Delegated Staff</h3>
            <p className="text-sm text-muted-foreground">Assign tournament-scoped admins, referees, and staff.</p>
          </div>
          <div className="space-y-2">
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No delegated staff assigned yet.</p>
            ) : (
              admins.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-background/30 p-3">
                  <div>
                    <p className="font-medium">{assignment.userName}</p>
                    <p className="text-xs text-muted-foreground">{assignment.userId} · {assignment.role}</p>
                  </div>
                  {assignment.role !== "OWNER" && canManageDelegation && (
                    <Button
                      variant="outline"
                      className="border-red-500/20 text-red-300 hover:bg-red-500/10"
                      disabled={busyTournamentId === tournament.id}
                      onClick={() => removeDelegatedStaff(tournament.id, assignment.userId)}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
          {canManageDelegation && (
            <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
              <UserSearchCombobox
                value={delegationForm.userId}
                onChange={(value) => setDelegationForm({ ...delegationForm, userId: value })}
              />
              <select
                value={delegationForm.role}
                onChange={(e) => setDelegationForm({ ...delegationForm, role: e.target.value as Exclude<TournamentAdminRole, "OWNER"> })}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <option value="REFEREE">Referee</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button disabled={busyTournamentId === tournament.id} onClick={() => addDelegatedStaff(tournament.id)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
