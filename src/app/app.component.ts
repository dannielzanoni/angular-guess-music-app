import { Component, ElementRef, ViewChild } from '@angular/core';
import axios, { CancelTokenSource } from 'axios';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'my-app';
  displayVal: string = '';
  searchedValue: any[] = [];
  guessValue: string = '';
  previewUrl: string = '';
  suggestions: string[] = [];
  filteredSuggestions: string[] = [];
  id_artist: number | null = null;
  sortedTittle: string = '';

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('autocompleteList') autocompleteList!: ElementRef<HTMLUListElement>;

  async onInput() {
    const inputValue = this.searchInput.nativeElement.value;
    await this.autocompleteSearch(inputValue);
  }
  closeAutocompleteList() {
    const inputValue = this.searchInput!.nativeElement.value.trim();
    if (!inputValue) {
      this.autocompleteList!.nativeElement.style.display = 'none';
    }
  }

  openAutocompleteList() {
    if (this.autocompleteList) {
      this.autocompleteList.nativeElement.style.display = 'block';
    }
  }

  currentSearchRequest: CancelTokenSource | null = null;

  autocompleteSuggestions: string[] = [];
  showAutocompleteList: boolean = false;

  async autocompleteSearch(inputValue: string) {
    if (inputValue.length < 2) {
      this.autocompleteSuggestions = [];
      this.showAutocompleteList = false;
      return;
    }

    if (this.currentSearchRequest) {
      this.currentSearchRequest.cancel('Nova solicitação feita');
    }

    this.currentSearchRequest = axios.CancelToken.source();

    const options = {
      method: 'GET',
      url: 'https://deezerdevs-deezer.p.rapidapi.com/search',
      params: { q: inputValue },
      headers: {
        'X-RapidAPI-Key': '45a4ea20c7msh0dcc6f9f93fdc5ep1dfa4fjsn6f64d2cbdd27',
        'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
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
      }).slice(0, 11);

      this.autocompleteSuggestions = artistNames;
      this.showAutocompleteList = true;

    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Solicitação cancelada');
      } else {
        console.error(error);
      }
    }
  }

  selectSuggestion(suggestion: string) {
    this.displayVal = suggestion;
    this.showAutocompleteList = false;
    this.search();
  }

  calculateSimilarity(input: string, target: string): number {
    const m = input.length;
    const n = target.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const distances: number[][] = [];
    for (let i = 0; i <= m; i++) {
      distances[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
      distances[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = (input.charAt(i - 1) === target.charAt(j - 1)) ? 0 : 1;
        distances[i][j] = Math.min(
          distances[i - 1][j] + 1,
          distances[i][j - 1] + 1,
          distances[i - 1][j - 1] + cost
        );
      }
    }
    return 1 - distances[m][n] / Math.max(m, n);
  }

  async search() {
    const options = {
      method: 'GET',
      url: 'https://deezerdevs-deezer.p.rapidapi.com/search',
      params: { q: this.displayVal },
      headers: {
        'X-RapidAPI-Key': '45a4ea20c7msh0dcc6f9f93fdc5ep1dfa4fjsn6f64d2cbdd27',
        'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
      }
    };

    try {
      const response = await axios.request(options);
      console.log('Resposta da API:', response.data);
      console.log('Parâmetros da solicitação:', options.params);


      if (response.data.data.length > 0) {
        const songsByArtist = response.data.data.filter((item: any) => item.artist.name.toLowerCase() === this.displayVal.toLowerCase());

        if (songsByArtist.length > 0) {
          //draw music
          const randomIndex = Math.floor(Math.random() * songsByArtist.length);
          this.previewUrl = songsByArtist[randomIndex].preview;
          this.sortedTittle = songsByArtist[randomIndex].title;
          this.searchedValue = songsByArtist;

          //title for suggestions
          this.suggestions = songsByArtist.map((item: any) => item.title);
          this.id_artist = songsByArtist.find((item: any) => !!item.artist.id)?.artist.id || null;

          this.filterSuggestions();

          const audioElement = document.querySelector('audio') as HTMLAudioElement;
          audioElement.src = this.previewUrl;
        } else {
          console.log('Não foram encontradas músicas do artista pesquisado.');
        }
      } else {
        console.log('Nenhum resultado encontrado.');
        this.previewUrl = '';
        this.searchedValue = [];
        this.suggestions = [];
        this.filteredSuggestions = [];
      }
    } catch (error) {
      console.error(error);
    }

    const options2 = {
      method: 'GET',
      url: `https://deezerdevs-deezer.p.rapidapi.com/artist/${this.id_artist}`,
      headers: {
        'X-RapidAPI-Key': '45a4ea20c7msh0dcc6f9f93fdc5ep1dfa4fjsn6f64d2cbdd27',
        'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
      }
    };
    try {
      const response = await axios.request(options2);
      console.log(response.data);
      console.log(options2.url);
      const imageData = response.data.picture_big;

      const imageElement = document.querySelector('.imagem-controller') as HTMLImageElement;
      imageElement.src = imageData;

    } catch (error) {
      console.error(error);
    }
  }

  fetchSuggestions() {
    this.filterSuggestions();
  }

  filterSuggestions() {
    this.filteredSuggestions = this.suggestions
      .filter((suggestion, index, self) =>
        index === self.findIndex((s) => s.toLowerCase() === suggestion.toLowerCase())
      )
      .filter(suggestion =>
        suggestion.toLowerCase().includes(this.guessValue.toLowerCase())
      );
  }

  showSuggestions(): boolean {
    return this.filteredSuggestions.length > 0 && this.guessValue.length > 0;
  }

  checkGuess() {
    if (this.guessValue.toLowerCase() === this.getCurrentSongTitle().toLowerCase()) {
      alert('Parabéns! Você acertou o título da música!');
    } else {
      alert('Oops! Sua adivinhação está incorreta. Tente novamente!');
    }
  }
  checkSelection(selectedTitle: string) {
    if (selectedTitle.toLowerCase() === this.getCurrentSongTitle().toLowerCase()) {
      alert('Parabéns! Você selecionou a música correta!');
    } else {
      alert('Oops! Sua seleção está incorreta. Tente novamente!');
    }
  }
  getCurrentSongTitle(): string {
    return this.sortedTittle;
  }

}
