import { Injectable } from '@angular/core';
import axios, { CancelTokenSource } from 'axios';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiRequestService {

  constructor() { }

  async searchArtist(displayVal: string): Promise<any> {
    const options = {
      method: 'GET',
      url: 'https://deezerdevs-deezer.p.rapidapi.com/search',
      params: { q: displayVal },
      headers: {
        'X-RapidAPI-Key': environment.rapidAPIKey,
        'X-RapidAPI-Host': environment.rapidHost
      }
    };

    try {
      const response = await axios.request(options);
      // console.log(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getImage(id_artist: number): Promise<any> {
    const options = {
      method: 'GET',
      url: `https://deezerdevs-deezer.p.rapidapi.com/artist/${id_artist}`,
      headers: {
        'X-RapidAPI-Key': environment.rapidAPIKey,
        'X-RapidAPI-Host': environment.rapidHost
      }
    };
    try {
      const response = await axios.request(options);
      const imageData = response.data.picture_big;
      return imageData;
    } catch (error) {
      console.error(error);
    }
  }

  currentSearchRequest: CancelTokenSource | null = null;
  autocompleteSuggestions: string[] = [];

  async searchArtistAutocomplete(inputValue: string): Promise<any> {

    if (this.currentSearchRequest) {
      this.currentSearchRequest.cancel('Nova solicitação feita');
    }

    this.currentSearchRequest = axios.CancelToken.source();

    const options = {
      method: 'GET',
      url: 'https://deezerdevs-deezer.p.rapidapi.com/search',
      params: { q: inputValue },
      headers: {
        'X-RapidAPI-Key': environment.rapidAPIKey,
        'X-RapidAPI-Host': environment.rapidHost
      },
      cancelToken: this.currentSearchRequest.token
    };

    try {
      const response = await axios.request(options);
      const uniqueArtistNames: Set<string> = new Set();

      response.data.data.forEach((item: any) => {
        uniqueArtistNames.add(item.artist.name);
      });

      const artistNames = Array.from(uniqueArtistNames).sort((a, b) => {
        const similarityA = this.calculateSimilarity(inputValue.toLowerCase(), a.toLowerCase());
        const similarityB = this.calculateSimilarity(inputValue.toLowerCase(), b.toLowerCase());
        return similarityB - similarityA;
      }).slice(0, 5);

      this.autocompleteSuggestions = artistNames;
      // console.log(this.autocompleteSuggestions);
      return this.autocompleteSuggestions;

    } catch (error) {
      if (axios.isCancel(error)) {
      } else {
        console.error(error);
      }
    }
  }

  calculateSimilarity(input: string, target: string): number {
    const lengthInput = input.length;
    const lengthTarget = target.length;

    if (lengthInput === 0) return lengthTarget;
    if (lengthTarget === 0) return lengthInput;

    const distances: number[][] = [];
    for (let i = 0; i <= lengthInput; i++) {
      distances[i] = [i];
    }
    for (let j = 0; j <= lengthTarget; j++) {
      distances[0][j] = j;
    }

    for (let i = 1; i <= lengthInput; i++) {
      for (let j = 1; j <= lengthTarget; j++) {
        const cost = (input.charAt(i - 1) === target.charAt(j - 1)) ? 0 : 1;
        distances[i][j] = Math.min(
          distances[i - 1][j] + 1,
          distances[i][j - 1] + 1,
          distances[i - 1][j - 1] + cost
        );
      }
    }
    return 1 - distances[lengthInput][lengthTarget] / Math.max(lengthInput, lengthTarget);
  }
}