import { Component } from '@angular/core';
import axios from 'axios';

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
      console.log(response.data);

      if (response.data.data.length > 0) {
        const songsByArtist = response.data.data.filter((item: any) => item.artist.name.toLowerCase() === this.displayVal.toLowerCase());

        if (songsByArtist.length > 0) {
          // Escolher uma música aleatória do artista pesquisado
          const randomIndex = Math.floor(Math.random() * songsByArtist.length);
          this.previewUrl = songsByArtist[randomIndex].preview;
          this.sortedTittle = songsByArtist[randomIndex].title;
          console.log(this.previewUrl);
          this.searchedValue = songsByArtist;

          // Extrair títulos da resposta para sugestões
          this.suggestions = songsByArtist.map((item: any) => item.title);
          this.id_artist = songsByArtist.find((item: any) => !!item.artist.id)?.artist.id || null;

          this.filterSuggestions();

          const audioElement = document.querySelector('audio') as HTMLAudioElement;
          audioElement.volume = 0.3;
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
