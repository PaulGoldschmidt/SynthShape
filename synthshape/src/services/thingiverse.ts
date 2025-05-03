import axios from 'axios';

const BASE_URL = 'https://api.thingiverse.com';

/**
 * Thingiverse API service
 * Basic implementation to fetch 3D models from Thingiverse
 */
export default class ThingiverseService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Search for things on Thingiverse
   * @param query Search query
   * @param page Page number
   * @param perPage Items per page
   * @returns Search results
   */
  async searchThings(query: string, page = 1, perPage = 20) {
    try {
      const response = await axios.get(`${BASE_URL}/search/${encodeURIComponent(query)}`, {
        headers: this.getHeaders(),
        params: {
          page,
          per_page: perPage
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching Thingiverse:', error);
      throw error;
    }
  }

  /**
   * Get a thing by ID
   * @param thingId Thing ID
   * @returns Thing details
   */
  async getThing(thingId: string | number) {
    try {
      const response = await axios.get(`${BASE_URL}/things/${thingId}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching thing ${thingId}:`, error);
      throw error;
    }
  }

  /**
   * Get files for a thing
   * @param thingId Thing ID
   * @returns List of files
   */
  async getThingFiles(thingId: string | number) {
    try {
      const response = await axios.get(`${BASE_URL}/things/${thingId}/files`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching files for thing ${thingId}:`, error);
      throw error;
    }
  }

  /**
   * Download an STL file
   * @param fileId File ID
   * @returns File data as ArrayBuffer
   */
  async downloadFile(fileId: string | number) {
    try {
      const response = await axios.get(`${BASE_URL}/files/${fileId}/download`, {
        headers: this.getHeaders(),
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }
}