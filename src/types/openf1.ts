export type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  country_name: string;
  location: string;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
};

export type OpenF1Driver = {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour?: string; // hex without #
};

export type OpenF1LocationPoint = {
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
};

export type OpenF1PositionPoint = {
  driver_number: number;
  date: string;
  position: number;
};

// Minimal lap shape (OpenF1 returns more fields too)
export type OpenF1Lap = {
  driver_number: number;
  lap_number: number;
  date_start: string;
  // optional fields you can use later:
  // duration_sector_1?: number;
  // duration_sector_2?: number;
  // duration_sector_3?: number;
  // lap_duration?: number;
};
