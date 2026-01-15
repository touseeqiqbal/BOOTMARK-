/**
 * Free geocoding using Nominatim (OpenStreetMap)
 * No API key required, completely free!
 */

/**
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number, display_name: string}>}
 */
async function geocodeAddress(address) {
    try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BOOTMARK-App/1.0' // Required by Nominatim
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }

        throw new Error('Address not found');
    } catch (error) {
        console.error('[Geocoding] Error:', error);
        throw error;
    }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{address: string, display_name: string}>}
 */
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BOOTMARK-App/1.0'
            }
        });

        const data = await response.json();

        if (data && data.address) {
            return {
                address: data.address,
                display_name: data.display_name
            };
        }

        throw new Error('Location not found');
    } catch (error) {
        console.error('[Reverse Geocoding] Error:', error);
        throw error;
    }
}

/**
 * Calculate distance between two coordinates (in kilometers)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

module.exports = {
    geocodeAddress,
    reverseGeocode,
    calculateDistance
};
