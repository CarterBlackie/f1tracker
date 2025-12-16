export type JolpicaSession = {
  date: string;
  time?: string;
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
  time: string;
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

  Time?: JolpicaTime;
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

export type JolpicaDriverStanding = {
  position: string;
  points: string;
  wins: string;
  Driver: JolpicaDriver;
  Constructors: JolpicaConstructor[];
};

export type JolpicaDriverStandingsResponse = {
  MRData: {
    StandingsTable: {
      season: string;
      StandingsLists: Array<{
        season: string;
        round: string;
        DriverStandings: JolpicaDriverStanding[];
      }>;
    };
  };
};

export type JolpicaConstructorStanding = {
  position: string;
  points: string;
  wins: string;
  Constructor: JolpicaConstructor;
};

export type JolpicaConstructorStandingsResponse = {
  MRData: {
    StandingsTable: {
      season: string;
      StandingsLists: Array<{
        season: string;
        round: string;
        ConstructorStandings: JolpicaConstructorStanding[];
      }>;
    };
  };
};
