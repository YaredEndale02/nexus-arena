import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Users, Swords, Settings, Shield } from "lucide-react";
import { Tournament, MatchReport, TournamentAdminAssignment, TournamentEntry, ApiTournamentStatus } from "@/lib/api";
import { TournamentOverviewTab } from "./TournamentOverviewTab";
import { TournamentPlayersTab } from "./TournamentPlayersTab";
import { TournamentMatchesTab } from "./TournamentMatchesTab";
import { TournamentSettingsTab } from "./TournamentSettingsTab";
import { TournamentStaffTab } from "./TournamentStaffTab";
import { TournamentBroadcastTab } from "./TournamentBroadcastTab";
import { Radio } from "lucide-react";

export function isCheckInRequired(status: string) {
  return ["REGISTRATION_CLOSED", "CHECK_IN", "LIVE"].includes(status);
}

export function TournamentManager({
  tournament,
  userRole,
  userId,
  entries,
  matches,
  admins,
  isEditing,
  editingForm,
  matchForm,
  delegationForm,
  autoSeedStrategy,
  busyTournamentId,
  registrationOrderByEntryId,
  setEditingForm,
  setMatchForm,
  setDelegationForm,
  setAutoSeedStrategy,
  setBusyTournamentId,
  setEditingTournamentId,
  saveTournamentEdits,
  deleteTournament,
  changeTournamentStatus,
  autoAssignSeeds,
  updateEntrySeed,
  updateEntryCheckIn,
  lockEntryRoster,
  saveEntrySeed,
  createMatch,
  reportMatch,
  updateMatchScore,
  refreshTournamentOps,
  generateBracket,
  resetAndRegenerateBracket,
  setMatchReportScore,
  addDelegatedStaff,
  removeDelegatedStaff,
  deleteEntry,
  updateMatchParticipants,
  simulateFullTournament,
  restartTournament,
}: any) {
  const canManageDelegation = userRole === "ADMIN" || tournament.organizerId === userId;

  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-white/5 border border-white/10 p-1 h-auto gap-1">
        <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 gap-2 h-10"><LayoutDashboard className="w-4 h-4" /> Overview</TabsTrigger>
        <TabsTrigger value="players" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Users className="w-4 h-4" /> Players</TabsTrigger>
        <TabsTrigger value="matches" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Swords className="w-4 h-4" /> Matches</TabsTrigger>
        <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Settings className="w-4 h-4" /> Settings</TabsTrigger>
        <TabsTrigger value="staff" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Shield className="w-4 h-4" /> Staff</TabsTrigger>
        <TabsTrigger value="broadcast" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Radio className="w-4 h-4" /> Broadcast</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <TournamentOverviewTab
          tournament={tournament}
          entries={entries}
          matches={matches}
          busyTournamentId={busyTournamentId}
          changeTournamentStatus={changeTournamentStatus}
          deleteTournament={deleteTournament}
        />
      </TabsContent>

      <TabsContent value="players">
        <TournamentPlayersTab
          tournament={tournament}
          entries={entries}
          autoSeedStrategy={autoSeedStrategy}
          busyTournamentId={busyTournamentId}
          registrationOrderByEntryId={registrationOrderByEntryId}
          setAutoSeedStrategy={setAutoSeedStrategy}
          autoAssignSeeds={autoAssignSeeds}
          updateEntrySeed={updateEntrySeed}
          updateEntryCheckIn={updateEntryCheckIn}
          lockEntryRoster={lockEntryRoster}
          saveEntrySeed={saveEntrySeed}
          refreshTournamentOps={refreshTournamentOps}
          setBusyTournamentId={setBusyTournamentId}
          deleteEntry={deleteEntry}
        />
      </TabsContent>

      <TabsContent value="matches">
        <TournamentMatchesTab
          tournament={tournament}
          entries={entries}
          matches={matches}
          matchForm={matchForm}
          busyTournamentId={busyTournamentId}
          setMatchForm={setMatchForm}
          setBusyTournamentId={setBusyTournamentId}
          createMatch={createMatch}
          reportMatch={reportMatch}
          updateMatchScore={updateMatchScore}
          refreshTournamentOps={refreshTournamentOps}
          setMatchReportScore={setMatchReportScore}
          generateBracket={generateBracket}
          resetAndRegenerateBracket={resetAndRegenerateBracket}
          updateMatchParticipants={updateMatchParticipants}
          simulateFullTournament={simulateFullTournament}
        />
      </TabsContent>

      <TabsContent value="settings">
        <TournamentSettingsTab
          tournament={tournament}
          isEditing={isEditing}
          editingForm={editingForm}
          busyTournamentId={busyTournamentId}
          setEditingForm={setEditingForm}
          saveTournamentEdits={saveTournamentEdits}
          setEditingTournamentId={setEditingTournamentId}
          deleteTournament={deleteTournament}
          restartTournament={restartTournament}
        />
      </TabsContent>

      <TabsContent value="staff">
        <TournamentStaffTab
          tournament={tournament}
          admins={admins}
          delegationForm={delegationForm}
          busyTournamentId={busyTournamentId}
          canManageDelegation={canManageDelegation}
          setDelegationForm={setDelegationForm}
          addDelegatedStaff={addDelegatedStaff}
          removeDelegatedStaff={removeDelegatedStaff}
        />
      </TabsContent>
      <TabsContent value="broadcast">
        <TournamentBroadcastTab tournament={tournament} />
      </TabsContent>
    </Tabs>
  );
}
