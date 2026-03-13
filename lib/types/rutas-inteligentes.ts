export interface Location {
  id: string;
  lat: number;
  lng: number;
  type: "partida" | "intermedio" | "llegada";
  address?: string;
  isTimeRestricted?: boolean;
  timeWindow?: {
    start: string;
    end: string;
  };
}

export interface RutaInteligenteRequest {
  locations: Location[];
  travelMode?: "DRIVING";
  avoid?: ("tolls" | "highways" | "ferries")[];
  language?: string;
  driverSalary?: number;
  vehicleType?: string;
  fuelType?: string;
  routeStartTime?: string;
  serviceTimeMinutes?: number;
}

export interface RouteSegment {
  id: number;
  name: string;
  googleMapsUrl: string;
  waypointRange: { from: number; to: number };
  waypointsCount: number;
}

export interface VRPTWArrivalTime {
  locationId: string;
  estimatedArrival: string;
  estimatedDeparture: string;
  withinWindow: boolean;
  timeWindow: { start: string; end: string } | null;
  waitTime?: number;
  lateBy?: number;
}

export interface RutaInteligenteResponse {
  success: boolean;
  data: {
    routes: unknown[];
    optimizedOrder: Location[];
    googleMapsUrl: string | null;
    costCalculation?: {
      fuelCost: number;
      driverCost: number;
      totalCost: number;
      fuelLiters: number;
      fuelPricePerLiter: number;
      driverHours: number;
      driverHourlyRate: number;
    };
    vrptw?: {
      feasible: boolean;
      routeStartTime: string;
      totalDistance: number;
      totalDuration: number;
      totalDrivingTime: number;
      totalWaitTime: number;
      totalServiceTime: number;
      arrivalTimes: VRPTWArrivalTime[];
      warnings: string[];
    };
    isSegmented?: boolean;
    totalWaypoints?: number;
    segments?: RouteSegment[];
  };
}

export const VEHICLE_TYPES = [
  { value: "commercial", label: "Utilitario" },
  { value: "pickup", label: "Pickup" },
  { value: "truck_small", label: "Camión Chico" },
  { value: "truck_medium", label: "Camión Mediano" },
] as const;

export const FUEL_TYPES = [
  { value: "gasoil", label: "Gasoil" },
  { value: "nafta_super", label: "Nafta Súper" },
  { value: "nafta_premium", label: "Nafta Premium" },
] as const;

// Default depot: Córdoba center
export const DEFAULT_DEPOT = {
  lat: -31.4201,
  lng: -64.1888,
  address: "Depósito Buenas Maltas, Córdoba",
};
