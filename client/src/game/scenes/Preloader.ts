import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        // load office map
        this.load.tilemapTiledJSON('office-map', 'maps/office_map_v1.tmj')
        this.load.spritesheet(
            'modern-office-shadow',
            'archive/tileset/Modern_Office_Black_Shadow.png',
            {
                frameWidth: 32,
                frameHeight: 64,
            }
        );
        this.load.spritesheet(
            'room-builder-office',
            'archive/Room_Builder_Office.png',
            {
                frameWidth: 32,
                frameHeight: 32,
            }
        );

        this.load.image(
            'room-builder-floors',
            'archive/Room_Builder_Floors.png'
        );

        this.load.spritesheet(
            'room-builder-walls',
            'archive/Room_Builder_Walls.png',
            {
                frameWidth: 32,
                frameHeight: 32
            }
        );

        this.load.spritesheet(
            "room-builder-office-sheet",
            "archive/Room_Builder_Office.png",
            {
                frameWidth: 32,
                frameHeight: 32,
            }
        );

        this.load.spritesheet(
            'alex',
            './Alex_16x16.png',
            {
                frameWidth: 16,
                frameHeight: 32,
            }
        )
    }

    create() {
        this.scene.start('Office');
    }
}
