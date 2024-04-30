import { Component, ElementRef, ViewChild, input } from '@angular/core';
import axios, { CancelTokenSource } from 'axios';
import { ApiRequestService } from './services/api-request.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(private apiRequestService: ApiRequestService) { }

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
    this.autocompleteSearch(inputValue);
  }

  artists_list: any;
  autocompleteSuggestions: string[] = [];
  showAutocompleteList: boolean = false;

  async autocompleteSearch(inputValue: string) {
    if (inputValue.length < 2) {
      this.autocompleteSuggestions = [];
      this.showAutocompleteList = false;
      return;
    }
    try {
      this.artists_list = await this.apiRequestService.searchArtistAutocomplete(inputValue);
      this.autocompleteSuggestions = this.artists_list;
      this.showAutocompleteList = true;
      console.log(this.autocompleteSuggestions);
    } catch (error) {
      console.log(error);
    }
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

  selectSuggestion(suggestion: string) {
    this.displayVal = suggestion;
    this.showAutocompleteList = false;
    this.GetArtistData();
  }

  artistData: any;
  async GetArtistData() {
    try {
      this.artistData = await this.apiRequestService.searchArtist(this.displayVal);
      console.log('Dados do artista:', this.artistData);
      if (this.artistData.data.length > 0) {
        const songsByArtist = this.artistData.data.filter((item: any) => item.artist.name.toLowerCase() === this.displayVal.toLowerCase());

        if (songsByArtist.length > 0) {
          //draw music
          const randomIndex = Math.floor(Math.random() * songsByArtist.length);
          this.previewUrl = songsByArtist[randomIndex].preview;
          this.sortedTittle = songsByArtist[randomIndex].title;
          this.searchedValue = songsByArtist;

          //title for suggestions
          this.suggestions = songsByArtist.map((item: any) => item.title);
          this.id_artist = songsByArtist.find((item: any) => !!item.artist.id)?.artist.id || null;
          if (this.id_artist !== null) {
            this.GetImageArtist(this.id_artist);
          }
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
      console.error('Erro ao obter os dados do artista:', error);
    }
  }

  image: any;
  async GetImageArtist(id_artist: number) {
    try {
      this.image = await this.apiRequestService.getImage(id_artist);
      const response = this.image;
      const imageElement = document.querySelector('.imagem-controller') as HTMLImageElement;
      imageElement.src = response;
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
