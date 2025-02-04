import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiRequestService } from '../services/api-request.service';
import WaveSurfer from 'wavesurfer.js';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-music-player',
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.css'
})
export class MusicPlayerComponent {

  //#region Variables

  wavesurfer!: WaveSurfer;
  isPlaying: boolean = false;
  volume = 0.1;
  title = 'guess-the-music';
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
  artists_list: any;
  autocompleteSuggestions: string[] = [];
  showAutocompleteList: boolean = false;
  artistData: any;
  image: any;
  attemptMade: boolean = false;

  //#endregion

  constructor(private apiRequestService: ApiRequestService) { }

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('guessInput') guessInput!: ElementRef<HTMLInputElement>;
  @ViewChild('autocompleteList') autocompleteList!: ElementRef<HTMLUListElement>;

  async onInput() {
    const inputValue = this.searchInput.nativeElement.value;
    this.autocompleteSearch(inputValue);
  }

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

  //#region Get Data

  async GetArtistData() {
    try {
      this.clearAttempts();
      if (this.isGuessInputDisabled) {
        this.isGuessInputDisabled = false;
      }
      this.artistData = await this.apiRequestService.searchArtist(this.displayVal);

      if (this.artistData.data.length > 0) {
        const songsByArtist = this.artistData.data.filter((item: any) => item.artist.name.toLowerCase() === this.displayVal.toLowerCase());

        if (songsByArtist.length > 0) {
          const randomIndex = Math.floor(Math.random() * songsByArtist.length);
          this.previewUrl = songsByArtist[randomIndex].preview;
          this.sortedTittle = songsByArtist[randomIndex].title;
          this.searchedValue = songsByArtist;

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

          this.wavesurfer = this.createWaveSurfer();
          this.wavesurfer.on('ready', () => {
            this.togglePlayback();
          });
          this.wavesurfer.load(this.previewUrl);
          this.playAudio();
        } else {
          console.log('no songs found of the artist.');
        }
      } else {
        console.log('no songs found.');
        this.previewUrl = '';
        this.searchedValue = [];
        this.suggestions = [];
        this.filteredSuggestions = [];
      }
    } catch (error) {
      console.error('error getting artist data:', error);
    }
  }

  async GetImageArtist(id_artist: number) {
    try {
      this.image = await this.apiRequestService.getImage(id_artist);
      const response = this.image;
      const imageElement = document.querySelector('.image-controller') as HTMLImageElement;
      const reflectionElement = document.querySelector('.reflection') as HTMLImageElement;
      imageElement.src = response;
      reflectionElement.src = response;
    } catch (error) {
      console.error(error);
    }
  }

  loadNewSong() {
    this.attemptMade = false;
    if (this.searchedValue.length > 0) {
      this.isListDisabled = false;

      const availableSongs = this.searchedValue.filter(song => !this.playedSongs.includes(song.title));

      if (availableSongs.length === 0) {
        console.log('All songs were played.');
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

  //#endregion

  //#region Game Logic

  checkSelection(selectedTitle: string) {
    this.attemptMade = true;
    const correct = selectedTitle.toLowerCase() === this.getCurrentSongTitle().toLowerCase();
    this.attempts.push({ text: selectedTitle, correct });
    if (!correct) {
      this.attemptsMade++;
      if (this.attemptsMade < this.maxAttempts) {
        this.playDuration++;
        this.buttonText = `Play (+${this.playDuration}s)`;
        this.playNext = true;
      } else {
        this.isListDisabled = true;
        this.isGuessInputDisabled = true;
        this.attempts.push({ text: this.getCurrentSongTitle(), correct });
        this.buttonText = 'Try again';
      }
    } else {
      this.launchConfetti();
      this.isListDisabled = true;
      this.isGuessInputDisabled = true;
      this.buttonText = 'New Song';
    }
  }

  skipOneSecond(): void {
    this.attemptMade = true;
    if (this.wavesurfer && this.playDuration < 5) {
      this.attemptsMade++;
      this.playDuration++;
      this.buttonText = `Play (+${this.playDuration}s)`;
      this.playNext = true;
      this.attempts.push({ text: "Skipped +1s", correct: false });
    } else {
      this.isGuessInputDisabled = true;
      this.isListDisabled = true;
      this.buttonText = 'Try again';
    }
  }

  //#endregion 

  //#region Music Setup

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

  togglePlayback(): void {
    if (this.isPlaying) {
      this.wavesurfer.pause();
    } else {
      this.wavesurfer.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  playAudio() {
    if (this.wavesurfer) {
      this.wavesurfer.on('ready', () => {
        this.togglePlayback();
      });
    }
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

  //#endregion

  //#region Suggestions

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

  //#endregion

  getCurrentSongTitle(): string {
    return this.sortedTittle;
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
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 1000
    });

    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.remove();
      }
    }, 5000);
  }
}
