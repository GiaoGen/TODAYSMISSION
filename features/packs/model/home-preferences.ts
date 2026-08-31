export type HomePreferences = {
  theme: "light" | "dark";
};

// Device-only theme preference; survives route navigation, resets on reload.
let preferences: HomePreferences = { theme: "light" };

export function getHomePreferences() {
  return preferences;
}

export function setHomePreferences(next: HomePreferences) {
  preferences = { ...next };
}
