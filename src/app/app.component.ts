import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiRequestService } from './services/api-request.service';
import WaveSurfer from 'wavesurfer.js';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  wavesurfer!: WaveSurfer;
  isPlaying: boolean = false;
  volume = 0.2;

  togglePlayback(): void {
    if (this.isPlaying) {
      this.wavesurfer.pause();
    } else {
      this.wavesurfer.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  constructor(private apiRequestService: ApiRequestService, private toastr: ToastrService) { }

  title = 'my-app';
  displayVal: string = '';
  searchedValue: any[] = [];
  guessValue: string = '';
  previewUrl: string = '';
  suggestions: string[] = [];
  filteredSuggestions: string[] = [];
  id_artist: number | null = null;
  sortedTittle: string = '';
  attempts: { text: string, correct: boolean }[] = [];

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
      this.volume = 0.1;
      this.updateVolume();
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

          this.isPlaying = false;
          if (this.wavesurfer) {
            this.wavesurfer.stop();
            this.wavesurfer.destroy();
          }

          this.wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: 'rgb(169, 29, 58)',
            progressColor: 'rgb(70, 17, 17)',
            barWidth: 2,
            barGap: 3,
            barRadius: 2,
            height: 40,
            width: 300,
            interact: false
          });
          this.wavesurfer.on('ready', () => {
            this.togglePlayback();
          });
          this.wavesurfer.load(this.previewUrl);
          this.playAudio();
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

  playAudio() {
    if (this.wavesurfer) {
      this.wavesurfer.on('ready', () => {
        this.togglePlayback();
      });
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

  checkSelection(selectedTitle: string) {
    const correct = selectedTitle.toLowerCase() === this.getCurrentSongTitle().toLowerCase();
    this.attempts.push({ text: selectedTitle, correct });
  }

  getCurrentSongTitle(): string {
    return this.sortedTittle;
  }

  updateVolume(): void {
    if (this.wavesurfer) {
      this.wavesurfer.setVolume(this.volume);
    }
  }

}
