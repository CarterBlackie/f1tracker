export type JolpicaSession = {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM:SSZ
};

export type JolpicaRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;

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

  FirstPractice?: JolpicaSession;
  SecondPractice?: JolpicaSession;
  ThirdPractice?: JolpicaSession;
  Sprint?: JolpicaSession;
  SprintQualifying?: JolpicaSession;
  Qualifying?: JolpicaSession;
};

export type JolpicaRacesResponse = {
  MRData: {
    RaceTable: {
      season: string;
      Races: JolpicaRace[];
    };
  };
};

export type JolpicaDriver = {
  driverId: string;
  givenName: string;
  familyName: string;
  code?: string;
  permanentNumber?: string;
  nationality?: string;
};

export type JolpicaConstructor = {
  constructorId: string;
  name: string;
  nationality?: string;
};

export type JolpicaTime = {
  time: string; // e.g. "1:34:12.345"
};

export type JolpicaFastestLap = {
  rank: string;
  lap: string;
  Time?: { time: string };
  AverageSpeed?: { units: string; speed: string };
};

export type JolpicaResult = {
  number?: string;
  position: string;
  positionText?: string;
  points: string;

  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;

  grid?: string;
  laps?: string;
  status: string;

  Time?: JolpicaTime; // only for classified finishers
  FastestLap?: JolpicaFastestLap;
};

export type JolpicaResultsRace = JolpicaRace & {
  Results: JolpicaResult[];
};

export type JolpicaRaceResultsResponse = {
  MRData: {
    RaceTable: {
      season: string;
      round?: string;
      Races: JolpicaResultsRace[];
    };
  };
};
