interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export const geocodingService = {
  async geocode(address: {
    street: string;
    streetNumber: string;
    locality: string;
    province?: string;
    country?: string;
  }): Promise<GeocodingResult | null> {
    const fullAddress = `${address.street} ${address.streetNumber}, ${address.locality}, ${address.province ?? "Córdoba"}, ${address.country ?? "Argentina"}`;

    // Try Google Maps first
    const googleResult = await this.geocodeWithGoogle(fullAddress);
    if (googleResult) return googleResult;

    // Fallback to Nominatim
    return this.geocodeWithNominatim(fullAddress);
  },

  async geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  async geocodeWithNominatim(address: string): Promise<GeocodingResult | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "BuenasMaltas/1.0" },
      });
      const data = await res.json();

      if (data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          formattedAddress: data[0].display_name,
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
