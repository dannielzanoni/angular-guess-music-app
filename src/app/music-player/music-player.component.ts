import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiRequestService } from '../services/api-request.service';
import WaveSurfer from 'wavesurfer.js';
import { ToastrService } from 'ngx-toastr';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-music-player',
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.css'
})
export class MusicPlayerComponent {

  constructor(private apiRequestService: ApiRequestService, private toastr: ToastrService) { }

  wavesurfer!: WaveSurfer;
  isPlaying: boolean = false;
  volume = 0.1;
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
  buttonText = 'Play';
  maxAttempts = 5;
  attemptsMade = 0;
  playDuration = 1;
  playNext = false;
  playedSongs: string[] = [];
  isGuessInputDisabled: boolean = false;
  isListDisabled: boolean = false;
  soundIcon: string = '../assets/sound.png';

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('guessInput') guessInput!: ElementRef<HTMLInputElement>;
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

  togglePlayback(): void {
    if (this.isPlaying) {
      this.wavesurfer.pause();
    } else {
      this.wavesurfer.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  artistData: any;
  async GetArtistData() {
    try {
      this.clearAttempts();
      if (this.isGuessInputDisabled) {
        this.isGuessInputDisabled = false;
      }
      this.artistData = await this.apiRequestService.searchArtist(this.displayVal);
      // console.log('Dados do artista:', this.artistData);
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
          this.loadNewSong();

          this.isPlaying = false;
          if (this.wavesurfer) {
            this.wavesurfer.stop();
            this.wavesurfer.destroy();
          }

          this.wavesurfer = this.createWaveSurfer();
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

  loadNewSong() {
    if (this.searchedValue.length > 0) {
      this.isListDisabled = false;
      const availableSongs = this.searchedValue.filter(song => !this.playedSongs.includes(song.title));
      if (availableSongs.length === 0) {
        console.log('Todas as músicas já foram tocadas.');
        return;
      }

      const randomIndex = Math.floor(Math.random() * availableSongs.length);
      const newSong = availableSongs[randomIndex];

      this.previewUrl = newSong.preview;
      this.sortedTittle = newSong.title;
      this.playedSongs.push(newSong.title);

      this.isPlaying = false;
      if (this.wavesurfer) {
        this.wavesurfer.stop();
        this.wavesurfer.destroy();
      }

      this.wavesurfer = this.createWaveSurfer();

      this.wavesurfer.on('ready', () => {
        this.togglePlayback();
      });

      this.wavesurfer.load(this.previewUrl);
      this.playAudio();
    }
  }

  createWaveSurfer(): WaveSurfer {
    return WaveSurfer.create({
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
    if (!correct) {
      this.attemptsMade++;
      if (this.attemptsMade < this.maxAttempts) {
        this.playDuration++;
        this.buttonText = `Play (+${this.playDuration}s)`;
        this.playNext = true;
      } else {
        this.buttonText = 'Try again';
      }
    } else {
      this.isListDisabled = true;
      this.isGuessInputDisabled = true;
      this.launchConfetti();
      this.buttonText = 'New Song';
    }
  }
  skipOneSecond(): void {
    if (this.wavesurfer && this.playDuration < 5) {
      this.attemptsMade++;
      this.playDuration++;
      this.buttonText = `Play (+${this.playDuration}s)`;
      this.playNext = true;
      this.attempts.push({ text: '[Skipped]', correct: false });
    } else {
      this.isListDisabled = true;
      this.buttonText = 'Try again';
    }
  }

  getCurrentSongTitle(): string {
    return this.sortedTittle;
  }

  updateVolume(): void {
    if (this.volume === 0) {
      this.soundIcon = "../assets/mute.png";
    } else if (this.volume > 0.05 && this.volume < 0.50) {
      this.soundIcon = "../assets/sound.png";
    } else if (this.volume > 0.50) {
      this.soundIcon = "../assets/sound2.png";
    }

    if (this.wavesurfer) {
      this.wavesurfer.setVolume(this.volume);
    }
  }

  playSnippet(): void {
    if (this.wavesurfer) {
      this.isListDisabled = false;
      this.wavesurfer.stop();
      this.wavesurfer.seekTo(0);
      this.wavesurfer.play();
      this.wavesurfer.setVolume(this.volume);
      setTimeout(() => {
        this.wavesurfer.pause();
      }, this.playDuration * 1000);
      this.playNext = false;
    }
    if (this.buttonText === 'New Song' || this.buttonText === 'Try again') {
      this.buttonText = 'Play';
      this.resetGuessInput();
      this.clearAttempts();
      this.isGuessInputDisabled = false;
      this.loadNewSong();
    }

  }

  clearAttempts() {
    this.attempts = [];
    this.attemptsMade = 0;
    this.playDuration = 1;
    this.buttonText = 'Play';
  }

  resetGuessInput() {
    this.guessValue = '';
    this.filteredSuggestions = [];
  }

  launchConfetti() {
    confetti({
      particleCount: 100,
      spread: 160
    });
  }
}