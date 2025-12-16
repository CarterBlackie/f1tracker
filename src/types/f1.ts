export type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM:SSZ (optional)
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      locality: string;
      country: string;
      lat?: string;
      long?: string;
    };
  };
};

export type JolpicaRacesResponse = {
  MRData: {
    RaceTable: {
      season: string;
      Races: JolpicaRace[];
    };
  };
};
