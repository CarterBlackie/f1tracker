export type OpenF1Session = {
  session_key: number;
  meeting_key: number;
  session_name: string; // "Race", "Qualifying", etc.
  session_type: string; // "Race", "Qualifying", etc.
  year: number;

  country_name: string;
  location: string;
  circuit_short_name: string;

  date_start: string; // ISO with +00:00
  date_end: string;   // ISO with +00:00
  gmt_offset: string; // "02:00:00"
};

export type OpenF1Driver = {
  driver_number: number;
  full_name: string;
  name_acronym: string; // e.g., "VER"
  team_name: string;
  team_colour: string;  // hex without '#'
  headshot_url?: string;
};

export type OpenF1LocationPoint = {
  date: string;
  driver_number: number;
  session_key: number;
  meeting_key: number;
  x: number;
  y: number;
  z: number;
};

export type OpenF1PositionPoint = {
  date: string;
  driver_number: number;
  session_key: number;
  meeting_key: number;
  position: number;
};
