import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-how-to-play',
  templateUrl: './how-to-play.component.html',
  styleUrl: './how-to-play.component.css'
})
export class HowToPlayComponent implements OnInit {

  ngOnInit(): void {
    const clips = document.querySelectorAll<HTMLVideoElement>(".hover-to-play");

    clips.forEach((clip: HTMLVideoElement) => {
      clip.play();
    });
  }
}
