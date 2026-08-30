export type HomePreferences = {
  theme: "light" | "dark";
  loggedOut: boolean;
};

// Prototype-only session memory; survives route navigation, resets on reload.
let preferences: HomePreferences = { theme: "light", loggedOut: false };

export function getHomePreferences() {
  return preferences;
}

export function setHomePreferences(next: HomePreferences) {
  preferences = { ...next };
}
