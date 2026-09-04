import { tournamentService } from "@/services/tournamentService";
import { matchService } from "@/services/matchService";
import { teamService } from "@/services/teamService";
import { userService } from "@/services/userService";
import { broadcastService } from "@/services/broadcastService";

export * from "@/services/types";
export { tournamentService } from "@/services/tournamentService";
export { matchService } from "@/services/matchService";
export { teamService } from "@/services/teamService";
export { userService } from "@/services/userService";
export { broadcastService } from "@/services/broadcastService";

export const api = {
  // Tournament operations
  getTournaments: tournamentService.getTournaments,
  getTournament: tournamentService.getTournament,
  getLatestActiveTournament: tournamentService.getLatestActiveTournament,
  getTournamentStandings: tournamentService.getTournamentStandings,
  getManagedTournaments: tournamentService.getManagedTournaments,
  createTournament: tournamentService.createTournament,
  updateTournament: tournamentService.updateTournament,
  updateTournamentStatus: tournamentService.updateTournamentStatus,
  deleteTournament: tournamentService.deleteTournament,
  getTournamentAdmins: tournamentService.getTournamentAdmins,
  addTournamentAdmin: tournamentService.addTournamentAdmin,
  removeTournamentAdmin: tournamentService.removeTournamentAdmin,
  getTournamentEntries: tournamentService.getTournamentEntries,
  getMyTournamentEntries: tournamentService.getMyTournamentEntries,
  getMyRegistrations: tournamentService.getMyRegistrations,
  updateTournamentEntryCheckIn: tournamentService.updateTournamentEntryCheckIn,
  bulkUpdateTournamentEntryCheckIn: tournamentService.bulkUpdateTournamentEntryCheckIn,
  updateTournamentEntrySeed: tournamentService.updateTournamentEntrySeed,
  autoAssignTournamentSeeds: tournamentService.autoAssignTournamentSeeds,
  lockTournamentEntryRoster: tournamentService.lockTournamentEntryRoster,
  bulkLockTournamentEntryRosters: tournamentService.bulkLockTournamentEntryRosters,
  registerSolo: tournamentService.registerSolo,
  adminAddUsers: tournamentService.adminAddUsers,
  subscribeToEntries: tournamentService.subscribeToEntries,

  // Match operations
  getTournamentMatches: matchService.getTournamentMatches,
  resetBracket: matchService.resetBracket,
  generateBracket: matchService.generateBracket,
  createMatchReport: matchService.createMatchReport,
  reportMatchResult: matchService.reportMatchResult,
  updateMatchParticipants: matchService.updateMatchParticipants,
  subscribeToMatches: matchService.subscribeToMatches,

  // Team operations
  registerTeam: teamService.registerTeam,
  deleteTournamentEntry: teamService.deleteTournamentEntry,
  getMyTeams: teamService.getMyTeams,
  createTeam: teamService.createTeam,
  updateTeam: teamService.updateTeam,
  addTeamMember: teamService.addTeamMember,
  removeTeamMember: teamService.removeTeamMember,
  joinTeamByCode: teamService.joinTeamByCode,
  getOrCreateInviteCode: teamService.getOrCreateInviteCode,

  // User operations
  updateUserProfile: userService.updateUserProfile,
  searchUsers: userService.searchUsers,

  // Broadcast & Chat operations
  getChatMessages: broadcastService.getChatMessages,
  sendChatMessage: broadcastService.sendChatMessage,
  getTournamentStreams: broadcastService.getTournamentStreams,
  updateTournamentStream: broadcastService.updateTournamentStream,
  subscribeToChat: broadcastService.subscribeToChat,
  sendTelegramNotification: broadcastService.sendTelegramNotification,
  broadcastTournamentNotification: broadcastService.broadcastTournamentNotification,
  notifyTournamentOrganizers: broadcastService.notifyTournamentOrganizers,
};
