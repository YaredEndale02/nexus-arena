import { getRecommendedBroadcastPreset, getFilteredScenesForGame, ALL_BROADCAST_SCENES } from "@/lib/broadcastPresets";

describe("broadcastPresets", () => {
  it("recommends Battle Royale package for PUBG Mobile", () => {
    const preset = getRecommendedBroadcastPreset("PUBG Mobile");
    expect(preset.badgeLabel).toBe("Battle Royale Package");
    expect(preset.primaryScene.id).toBe("pubg-live");
    expect(preset.presetThemeHex).toBe("e62429");
  });

  it("recommends Battle Royale package for Apex Legends", () => {
    const preset = getRecommendedBroadcastPreset("Apex Legends");
    expect(preset.badgeLabel).toBe("Battle Royale Package");
    expect(preset.primaryScene.id).toBe("pubg-live");
  });

  it("recommends Sports package for EA Sports FC 25", () => {
    const preset = getRecommendedBroadcastPreset("EA Sports FC 25");
    expect(preset.badgeLabel).toBe("Sports & 1v1 Package");
    expect(preset.primaryScene.id).toBe("live");
    expect(preset.presetThemeHex).toBe("d2ff0d");
  });

  it("recommends Group Standings package for Round Robin tournaments", () => {
    const preset = getRecommendedBroadcastPreset("Generic Game", "ROUND_ROBIN");
    expect(preset.badgeLabel).toBe("Group Standings Package");
    expect(preset.primaryScene.id).toBe("table");
  });

  it("recommends Pro Esports package for Valorant", () => {
    const preset = getRecommendedBroadcastPreset("Valorant");
    expect(preset.badgeLabel).toBe("Pro Esports Package");
    expect(preset.primaryScene.id).toBe("live");
    expect(preset.presetThemeHex).toBe("00e5ff");
  });

  it("lists all 6 broadcast scenes", () => {
    expect(ALL_BROADCAST_SCENES).toHaveLength(6);
  });

  describe("getFilteredScenesForGame", () => {
    it("filters out PUBG HUDs for Valorant / FC 25 Single Elimination", () => {
      const filtered = getFilteredScenesForGame("Valorant", "SINGLE_ELIMINATION");
      expect(filtered.some((s) => s.id === "pubg")).toBe(false);
      expect(filtered.some((s) => s.id === "pubg-live")).toBe(false);
      expect(filtered.some((s) => s.id === "live")).toBe(true);
      expect(filtered.some((s) => s.id === "starting")).toBe(true);
      expect(filtered.some((s) => s.id === "intermission")).toBe(true);
    });

    it("filters out 1v1 scorebar and table for PUBG Mobile", () => {
      const filtered = getFilteredScenesForGame("PUBG Mobile");
      expect(filtered.some((s) => s.id === "pubg")).toBe(true);
      expect(filtered.some((s) => s.id === "pubg-live")).toBe(true);
      expect(filtered.some((s) => s.id === "live")).toBe(false);
    });

    it("includes group standings table for Round Robin tournaments", () => {
      const filtered = getFilteredScenesForGame("Valorant", "ROUND_ROBIN");
      expect(filtered.some((s) => s.id === "table")).toBe(true);
      expect(filtered.some((s) => s.id === "pubg")).toBe(false);
    });
  });
});
